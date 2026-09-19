"""Tool schemas + executor for the merchant collections/settlement agent.
Guardrails and merchant-scope isolation are enforced here, not in the prompt."""
import time
import uuid
from datetime import timedelta

import mock_merchants_db as merch_db
import mock_crm as crm
from audit_log import log_event
from tools import GuardrailBlocked

AUTO_FIX_LIMIT = 10000.0

# merchant-side refund store, mirrors mock_refund_api.py's shape. Idempotent per mtxn_id.
MERCHANT_REFUNDS: dict[str, dict] = {}

MERCHANT_TOOL_SCHEMAS = [
    {
        "name": "get_merchant_transactions",
        "description": "Look up this merchant's recent collection/settlement records. Scoped to the calling merchant only.",
        "input_schema": {
            "type": "object",
            "properties": {
                "merchant_id": {"type": "string"},
                "days_back": {"type": "integer", "description": "How many days back to search. Default 7."},
            },
            "required": ["merchant_id"],
        },
    },
    {
        "name": "check_merchant_settlement",
        "description": "Check the bank's actual settlement status for a merchant transaction, given its bank_ref.",
        "input_schema": {
            "type": "object",
            "properties": {"bank_ref": {"type": "string"}},
            "required": ["bank_ref"],
        },
    },
    {
        "name": "correct_merchant_status",
        "description": (
            "Correct a stale internal settlement status on a merchant transaction to match the bank's "
            "actual record. No money moves."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mtxn_id": {"type": "string"},
                "correct_status": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["mtxn_id", "correct_status", "reason"],
        },
    },
    {
        "name": "reverse_merchant_collection",
        "description": (
            "Reverse a merchant collection that the bank declined (money should not have been "
            f"recorded as collected). Blocked above Rs.{AUTO_FIX_LIMIT:,.0f} - escalate those instead. "
            "The amount must exactly match the transaction's recorded amount."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mtxn_id": {"type": "string"},
                "amount": {"type": "number"},
                "reason": {"type": "string"},
            },
            "required": ["mtxn_id", "amount", "reason"],
        },
    },
    {
        "name": "escalate_merchant_case",
        "description": (
            "Escalate a merchant settlement issue to a human for manual review. Use for amounts above "
            f"Rs.{AUTO_FIX_LIMIT:,.0f}, suspected fraud, or anything that isn't a clean auto-fix."
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
        "name": "mark_settlement_confirmed",
        "description": "Record that a merchant transaction was checked and matches - no action needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "mtxn_id": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["mtxn_id", "notes"],
        },
    },
]

REQUIRED_ARGS = {s["name"]: s["input_schema"]["required"] for s in MERCHANT_TOOL_SCHEMAS}
VALID_SETTLEMENT_STATUSES = {"PENDING", "SETTLED", "DECLINED", "UNKNOWN"}


def to_openai_tools(schemas: list[dict]) -> list[dict]:
    return [
        {"type": "function", "function": {"name": s["name"], "description": s["description"], "parameters": s["input_schema"]}}
        for s in schemas
    ]


def _require_args(name: str, tool_input: dict) -> None:
    missing = [a for a in REQUIRED_ARGS.get(name, []) if a not in tool_input]
    if missing:
        raise GuardrailBlocked(f"Tool call blocked: {name} is missing required argument(s) {missing}.")


def _require_merchant_transaction(mtxn_id: str, scoped_merchant_id: str) -> dict:
    """Look up a merchant transaction AND enforce that it belongs to the merchant running this session.

    This is the data-isolation boundary: even if the LLM is fed or guesses another
    merchant's mtxn_id, this check blocks the call in code before any data leaks or
    any action is taken on someone else's records.
    """
    txn = merch_db.get_merchant_transaction(mtxn_id)
    if txn is None:
        raise GuardrailBlocked(f"Tool call blocked: mtxn_id '{mtxn_id}' does not exist.")
    if txn["merchant_id"] != scoped_merchant_id:
        log_event("guardrail", "merchant_scope_violation_blocked", {
            "mtxn_id": mtxn_id, "txn_owner": txn["merchant_id"], "requesting_merchant": scoped_merchant_id,
        })
        raise GuardrailBlocked(
            f"Tool call blocked: mtxn_id '{mtxn_id}' does not belong to merchant '{scoped_merchant_id}'. "
            "You may only access and act on this merchant's own transactions."
        )
    return txn


def execute_merchant_tool(name: str, tool_input: dict, scoped_merchant_id: str) -> dict:
    """Dispatch a merchant tool call. scoped_merchant_id is the merchant this agent session is
    running for - every data lookup and action is checked against it, regardless of what the
    LLM passes in tool_input, so a merchant can never read or modify another merchant's data."""
    _require_args(name, tool_input)

    if name == "get_merchant_transactions":
        requested = tool_input["merchant_id"]
        if requested != scoped_merchant_id:
            log_event("guardrail", "merchant_scope_violation_blocked", {
                "requested_merchant_id": requested, "requesting_merchant": scoped_merchant_id,
            })
            raise GuardrailBlocked(
                f"Tool call blocked: you are only authorized to look up merchant_id "
                f"'{scoped_merchant_id}'. Do not query other merchants' records."
            )
        result = merch_db.get_merchant_transactions(scoped_merchant_id, tool_input.get("days_back", 7))
        return {"transactions": result}

    if name == "check_merchant_settlement":
        return merch_db.check_merchant_settlement(tool_input["bank_ref"])

    if name == "correct_merchant_status":
        return _correct_status_guarded(scoped_merchant_id, **{k: tool_input[k] for k in ("mtxn_id", "correct_status", "reason")})

    if name == "reverse_merchant_collection":
        return _reverse_collection_guarded(scoped_merchant_id, **{k: tool_input[k] for k in ("mtxn_id", "amount", "reason")})

    if name == "escalate_merchant_case":
        if tool_input["ticket_id"] not in crm.TICKETS:
            raise GuardrailBlocked(f"Tool call blocked: ticket_id '{tool_input['ticket_id']}' does not exist.")
        crm.update_ticket(
            tool_input["ticket_id"], "ESCALATED",
            f"MERCHANT ESCALATION: {tool_input['reason']} | Suggested action: {tool_input['suggested_action']}",
        )
        crm.set_escalation(
            tool_input["ticket_id"], tool_input["reason"],
            tool_input["context_summary"], tool_input["suggested_action"],
        )
        log_event("agent", "escalate_merchant_case", {"input": tool_input, "merchant_id": scoped_merchant_id})
        return {"status": "ESCALATED", "ticket_id": tool_input["ticket_id"]}

    if name == "mark_settlement_confirmed":
        _require_merchant_transaction(tool_input["mtxn_id"], scoped_merchant_id)
        log_event("agent", "mark_settlement_confirmed", {"input": tool_input, "merchant_id": scoped_merchant_id})
        return {"mtxn_id": tool_input["mtxn_id"], "status": "CONFIRMED"}

    raise ValueError(f"Unknown tool: {name}")


def _correct_status_guarded(scoped_merchant_id: str, mtxn_id: str, correct_status: str, reason: str) -> dict:
    txn = _require_merchant_transaction(mtxn_id, scoped_merchant_id)

    if correct_status not in VALID_SETTLEMENT_STATUSES:
        raise GuardrailBlocked(
            f"Status correction blocked: '{correct_status}' is not a valid settlement status "
            f"({sorted(VALID_SETTLEMENT_STATUSES)})."
        )

    if txn["settlement_status"] == correct_status:
        log_event("guardrail", "merchant_correct_status_noop", {"mtxn_id": mtxn_id, "status": correct_status})
        return {"mtxn_id": mtxn_id, "settlement_status": correct_status, "status": "ALREADY_CORRECT", "note": "No action taken (idempotent)."}

    merch_db.set_merchant_settlement_status(mtxn_id, correct_status)
    log_event("agent", "correct_merchant_status", {"mtxn_id": mtxn_id, "correct_status": correct_status, "reason": reason, "merchant_id": scoped_merchant_id})
    return {"mtxn_id": mtxn_id, "settlement_status": correct_status, "status": "CORRECTED"}


def _reverse_collection_guarded(scoped_merchant_id: str, mtxn_id: str, amount: float, reason: str) -> dict:
    txn = _require_merchant_transaction(mtxn_id, scoped_merchant_id)

    if round(float(amount), 2) != round(float(txn["amount"]), 2):
        log_event("guardrail", "merchant_reversal_blocked_amount_mismatch", {"mtxn_id": mtxn_id, "requested": amount, "actual": txn["amount"]})
        raise GuardrailBlocked(
            f"Reversal blocked: requested amount Rs.{amount:,.2f} does not match the transaction's "
            f"actual amount Rs.{txn['amount']:,.2f}."
        )

    if amount > AUTO_FIX_LIMIT:
        log_event("guardrail", "merchant_reversal_blocked_amount_limit", {"mtxn_id": mtxn_id, "amount": amount})
        raise GuardrailBlocked(
            f"Reversal blocked: Rs.{amount:,.0f} exceeds the Rs.{AUTO_FIX_LIMIT:,.0f} auto-fix limit. "
            "This must be escalated to a human instead."
        )

    existing = MERCHANT_REFUNDS.get(mtxn_id)
    if existing:
        log_event("guardrail", "merchant_reversal_blocked_duplicate", {"mtxn_id": mtxn_id, "existing": existing})
        return existing

    time.sleep(0.3)
    result = {
        "reversal_id": f"MREV_{uuid.uuid4().hex[:8].upper()}",
        "mtxn_id": mtxn_id,
        "amount": amount,
        "reason": reason,
        "status": "REVERSED",
    }
    MERCHANT_REFUNDS[mtxn_id] = result
    merch_db.set_merchant_refund_id(mtxn_id, result["reversal_id"])
    log_event("agent", "reverse_merchant_collection", {"mtxn_id": mtxn_id, "amount": amount, "reason": reason, "result": result, "merchant_id": scoped_merchant_id})
    return result


def get_merchant_refund(mtxn_id: str) -> dict | None:
    return MERCHANT_REFUNDS.get(mtxn_id)
