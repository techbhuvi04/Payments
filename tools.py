"""Tool schemas + executor for the agent loop. Guardrails enforced here, not in the prompt."""
import mock_txn_db as txn_db
import mock_bank_api as bank_api
import mock_refund_api as refund_api
import mock_crm as crm
import mock_notifier as notifier
from audit_log import log_event

REFUND_HARD_LIMIT = 25000.0

TOOL_SCHEMAS = [
    {
        "name": "get_customer_transactions",
        "description": "Look up a customer's recent transactions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"},
                "days_back": {"type": "integer", "description": "How many days back to search. Default 7."},
            },
            "required": ["customer_id"],
        },
    },
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
        "name": "initiate_refund",
        "description": (
            "Initiate a refund for a transaction. Blocked for amounts above "
            f"Rs.{REFUND_HARD_LIMIT:,.0f} and for transactions that already have a refund - "
            "such cases must be escalated instead."
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
        "name": "force_settlement",
        "description": "Force-settle a transaction that has been stuck in PENDING for too long.",
        "input_schema": {
            "type": "object",
            "properties": {"txn_id": {"type": "string"}},
            "required": ["txn_id"],
        },
    },
    {
        "name": "update_ticket",
        "description": "Update a CRM ticket's status and add a note.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "string"},
                "status": {"type": "string", "enum": ["OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED"]},
                "notes": {"type": "string"},
            },
            "required": ["ticket_id", "status", "notes"],
        },
    },
    {
        "name": "send_customer_message",
        "description": "Send an SMS to the customer. Write the message in simple Hinglish.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["customer_id", "message"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": (
            "Hand off this ticket to a human agent. Use for amounts above "
            f"Rs.{REFUND_HARD_LIMIT:,.0f}, suspected fraud, repeat complaints, or any ambiguous case."
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
]


def to_openai_tools(schemas: list[dict]) -> list[dict]:
    """Convert Anthropic-style tool schemas to OpenAI/Groq function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": s["name"],
                "description": s["description"],
                "parameters": s["input_schema"],
            },
        }
        for s in schemas
    ]


class GuardrailBlocked(Exception):
    pass


def execute_tool(name: str, tool_input: dict) -> dict:
    """Dispatch a tool call, enforce guardrails, and write state-changing calls to audit log."""
    if name == "get_customer_transactions":
        result = txn_db.get_customer_transactions(
            tool_input["customer_id"], tool_input.get("days_back", 7)
        )
        return {"transactions": result}

    if name == "check_bank_settlement":
        return bank_api.check_settlement(tool_input["bank_ref"])

    if name == "initiate_refund":
        return _initiate_refund_guarded(**tool_input)

    if name == "force_settlement":
        result = refund_api.force_settlement(tool_input["txn_id"])
        txn_db.set_settlement_status(tool_input["txn_id"], "SETTLED")
        log_event("agent", "force_settlement", {"txn_id": tool_input["txn_id"], "result": result})
        return result

    if name == "update_ticket":
        result = crm.update_ticket(**tool_input)
        log_event("agent", "update_ticket", {"input": tool_input, "result": result})
        return result

    if name == "send_customer_message":
        result = notifier.send_customer_message(**tool_input)
        log_event("agent", "send_customer_message", {"input": tool_input, "result": result})
        return result

    if name == "escalate_to_human":
        crm.update_ticket(
            tool_input["ticket_id"], "ESCALATED",
            f"ESCALATED: {tool_input['reason']} | Suggested action: {tool_input['suggested_action']}",
        )
        log_event("agent", "escalate_to_human", {"input": tool_input})
        return {"status": "ESCALATED", "ticket_id": tool_input["ticket_id"]}

    raise ValueError(f"Unknown tool: {name}")


def _initiate_refund_guarded(txn_id: str, amount: float, reason: str) -> dict:
    if amount > REFUND_HARD_LIMIT:
        log_event("guardrail", "refund_blocked_amount_limit", {"txn_id": txn_id, "amount": amount})
        raise GuardrailBlocked(
            f"Refund blocked: Rs.{amount:,.0f} exceeds the Rs.{REFUND_HARD_LIMIT:,.0f} auto-refund "
            "limit. This must be escalated to a human instead."
        )

    existing = refund_api.get_refund(txn_id)
    if existing:
        log_event("guardrail", "refund_blocked_duplicate", {"txn_id": txn_id, "existing_refund": existing})
        raise GuardrailBlocked(
            f"Refund blocked: txn {txn_id} already has refund {existing['refund_id']}. "
            "Do not initiate a duplicate refund."
        )

    result = refund_api.initiate_refund(txn_id, amount, reason)
    txn_db.set_refund_id(txn_id, result["refund_id"])
    log_event("agent", "initiate_refund", {"txn_id": txn_id, "amount": amount, "reason": reason, "result": result})
    return result
