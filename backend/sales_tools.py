"""Tool schemas + executor for the sales win-back agent loop. Guardrails enforced here, not in the prompt."""
import mock_leads_db as leads_db
import mock_coupon_api as coupon_api
import mock_sales_crm as sales_crm
import mock_notifier as notifier
from audit_log import log_event
from tools import GuardrailBlocked

MAX_DISCOUNT_PCT = 20.0
MAX_COUPONS_PER_CUSTOMER = 1

SALES_TOOL_SCHEMAS = [
    {
        "name": "get_lead",
        "description": "Look up a sales lead's abandoned/failed checkout details.",
        "input_schema": {
            "type": "object",
            "properties": {"lead_id": {"type": "string"}},
            "required": ["lead_id"],
        },
    },
    {
        "name": "issue_discount_coupon",
        "description": (
            "Issue a win-back discount coupon for a lead. Blocked above "
            f"{MAX_DISCOUNT_PCT:.0f}% discount, and for customers who already have "
            f"{MAX_COUPONS_PER_CUSTOMER} or more prior coupons - those must get a plain retry nudge instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"},
                "discount_pct": {"type": "number"},
                "reason": {"type": "string"},
            },
            "required": ["lead_id", "discount_pct", "reason"],
        },
    },
    {
        "name": "send_winback_message",
        "description": "Send a win-back SMS to the customer. Write the message in simple Hinglish.",
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
        "name": "update_lead_status",
        "description": "Update a sales lead's outreach status and add a note.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"},
                "status": {"type": "string", "enum": ["NEW", "CONTACTED", "COUPON_OFFERED", "SKIPPED"]},
                "notes": {"type": "string"},
            },
            "required": ["lead_id", "status", "notes"],
        },
    },
]

REQUIRED_ARGS = {s["name"]: s["input_schema"]["required"] for s in SALES_TOOL_SCHEMAS}


def to_openai_tools(schemas: list[dict]) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {"name": s["name"], "description": s["description"], "parameters": s["input_schema"]},
        }
        for s in schemas
    ]


def _require_args(name: str, tool_input: dict) -> None:
    missing = [a for a in REQUIRED_ARGS.get(name, []) if a not in tool_input]
    if missing:
        raise GuardrailBlocked(
            f"Tool call blocked: {name} is missing required argument(s) {missing}."
        )


def _require_lead(lead_id: str) -> dict:
    lead = leads_db.get_lead(lead_id)
    if lead is None:
        raise GuardrailBlocked(
            f"Tool call blocked: lead_id '{lead_id}' does not exist. Do not guess lead IDs."
        )
    return lead


def execute_sales_tool(name: str, tool_input: dict) -> dict:
    _require_args(name, tool_input)

    if name == "get_lead":
        lead = _require_lead(tool_input["lead_id"])
        return {"lead": lead}

    if name == "issue_discount_coupon":
        return _issue_coupon_guarded(**tool_input)

    if name == "send_winback_message":
        result = notifier.send_customer_message(**tool_input)
        log_event("agent", "send_winback_message", {"input": tool_input, "result": result})
        return result

    if name == "update_lead_status":
        if tool_input["lead_id"] not in sales_crm.LEAD_RECORDS:
            raise GuardrailBlocked(f"Tool call blocked: lead_id '{tool_input['lead_id']}' does not exist.")
        result = sales_crm.update_lead_record(**tool_input)
        log_event("agent", "update_lead_status", {"input": tool_input, "result": result})
        return result

    raise ValueError(f"Unknown tool: {name}")


def _issue_coupon_guarded(lead_id: str, discount_pct: float, reason: str) -> dict:
    lead = _require_lead(lead_id)

    if discount_pct > MAX_DISCOUNT_PCT:
        log_event("guardrail", "coupon_blocked_discount_limit", {"lead_id": lead_id, "discount_pct": discount_pct})
        raise GuardrailBlocked(
            f"Coupon blocked: {discount_pct:.0f}% exceeds the {MAX_DISCOUNT_PCT:.0f}% max win-back discount. "
            "Offer the maximum allowed instead, or skip the discount and send a plain retry nudge."
        )

    if lead["prior_coupons_used"] >= MAX_COUPONS_PER_CUSTOMER:
        log_event("guardrail", "coupon_blocked_limit_reached", {"lead_id": lead_id, "prior_coupons_used": lead["prior_coupons_used"]})
        raise GuardrailBlocked(
            f"Coupon blocked: customer already used {lead['prior_coupons_used']} win-back coupon(s), "
            f"at the limit of {MAX_COUPONS_PER_CUSTOMER}. Send a plain retry nudge without a discount instead."
        )

    result = coupon_api.issue_coupon(lead_id, discount_pct, reason)
    leads_db.mark_coupon_used(lead_id)
    log_event("agent", "issue_discount_coupon", {"lead_id": lead_id, "discount_pct": discount_pct, "reason": reason, "result": result})
    return result
