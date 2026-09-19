"""Tool schemas + executor for the reconciliation sweep agent. Guardrails enforced here, not in the prompt."""
import mock_txn_db as txn_db
import mock_bank_api as bank_api
import mock_refund_api as refund_api
import mock_crm as crm
from audit_log import log_event
from tools import GuardrailBlocked

AUTO_FIX_LIMIT = 10000.0

RECON_TOOL_SCHEMAS = [
    {
        "name": "check_bank_settlement",
        "description": "Check settlement status of a transaction with the bank, given its bank_ref.",
        "input_schema": {
            "type": "object",
            "properties": {"bank_ref": {"type": "string"}},
            "required": ["bank_ref"],
        },
    },
    {
        "name": "auto_refund_mismatch",
        "description": (
            "Refund a transaction that internal records show as SUCCESS but the bank declined. "
            f"Blocked for amounts above Rs.{AUTO_FIX_LIMIT:,.0f} - those must be escalated instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "txn_id": {"type": "string"},
                "amount": {"type": "number"},
                "reason": {"type": "string"},
            },
            "required": ["txn_id", "amount", "reason"],
        },
    },
    {
        "name": "correct_internal_status",
        "description": (
            "Correct a stale internal settlement status to match the bank's actual record "
            "(e.g. internal still shows PENDING but bank already SETTLED it). No money moves."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "txn_id": {"type": "string"},
                "correct_status": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["txn_id", "correct_status", "reason"],
        },
    },
    {
        "name": "escalate_mismatch",
        "description": (
            "Escalate a transaction mismatch to a human for manual review. Use for amounts above "
            f"Rs.{AUTO_FIX_LIMIT:,.0f} or any mismatch that isn't a clean auto-fix or status correction."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "string"},
                "reason": {"type": "string"},
                "context_summary": {"type": "string"},
                "suggested_action": {"type": "string"},
            },
            "required": ["ticket_id", "reason", "context_summary", "suggested_action"],
        },
    },
    {
        "name": "mark_reconciled",
        "description": "Record that a transaction was checked and matches - no action needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "txn_id": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["txn_id", "notes"],
        },
    },
]

REQUIRED_ARGS = {s["name"]: s["input_schema"]["required"] for s in RECON_TOOL_SCHEMAS}


def to_openai_tools(schemas: list[dict]) -> list[dict]:
    return [
        {"type": "function", "function": {"name": s["name"], "description": s["description"], "parameters": s["input_schema"]}}
        for s in schemas
    ]


def _require_args(name: str, tool_input: dict) -> None:
    missing = [a for a in REQUIRED_ARGS.get(name, []) if a not in tool_input]
    if missing:
        raise GuardrailBlocked(f"Tool call blocked: {name} is missing required argument(s) {missing}.")


def _require_transaction(txn_id: str) -> dict:
    txn = txn_db.get_transaction(txn_id)
    if txn is None:
        raise GuardrailBlocked(f"Tool call blocked: txn_id '{txn_id}' does not exist.")
    return txn


def execute_recon_tool(name: str, tool_input: dict) -> dict:
    _require_args(name, tool_input)

    if name == "check_bank_settlement":
        return bank_api.check_settlement(tool_input["bank_ref"])

    if name == "auto_refund_mismatch":
        return _auto_refund_guarded(**tool_input)

    if name == "correct_internal_status":
        _require_transaction(tool_input["txn_id"])
        txn_db.set_settlement_status(tool_input["txn_id"], tool_input["correct_status"])
        log_event("agent", "correct_internal_status", {"input": tool_input})
        return {"txn_id": tool_input["txn_id"], "settlement_status": tool_input["correct_status"], "status": "CORRECTED"}

    if name == "escalate_mismatch":
        if tool_input["ticket_id"] not in crm.TICKETS:
            raise GuardrailBlocked(f"Tool call blocked: ticket_id '{tool_input['ticket_id']}' does not exist.")
        crm.update_ticket(
            tool_input["ticket_id"], "ESCALATED",
            f"RECONCILIATION ESCALATION: {tool_input['reason']} | Suggested action: {tool_input['suggested_action']}",
        )
        crm.set_escalation(
            tool_input["ticket_id"], tool_input["reason"],
            tool_input["context_summary"], tool_input["suggested_action"],
        )
        log_event("agent", "escalate_mismatch", {"input": tool_input})
        return {"status": "ESCALATED", "ticket_id": tool_input["ticket_id"]}

    if name == "mark_reconciled":
        _require_transaction(tool_input["txn_id"])
        log_event("agent", "mark_reconciled", {"input": tool_input})
        return {"txn_id": tool_input["txn_id"], "status": "MATCHED"}

    raise ValueError(f"Unknown tool: {name}")


def _auto_refund_guarded(txn_id: str, amount: float, reason: str) -> dict:
    _require_transaction(txn_id)

    if amount > AUTO_FIX_LIMIT:
        log_event("guardrail", "recon_refund_blocked_amount_limit", {"txn_id": txn_id, "amount": amount})
        raise GuardrailBlocked(
            f"Auto-refund blocked: Rs.{amount:,.0f} exceeds the Rs.{AUTO_FIX_LIMIT:,.0f} auto-fix limit. "
            "This must be escalated to a human instead."
        )

    existing = refund_api.get_refund(txn_id)
    if existing:
        log_event("guardrail", "recon_refund_blocked_duplicate", {"txn_id": txn_id, "existing_refund": existing})
        raise GuardrailBlocked(
            f"Auto-refund blocked: txn {txn_id} already has refund {existing['refund_id']}."
        )

    result = refund_api.initiate_refund(txn_id, amount, reason)
    txn_db.set_refund_id(txn_id, result["refund_id"])
    log_event("agent", "auto_refund_mismatch", {"txn_id": txn_id, "amount": amount, "reason": reason, "result": result})
    return result
