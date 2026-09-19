"""Mock CRM ticketing system."""

TICKETS: dict[str, dict] = {
    "TICKET_A": {
        "ticket_id": "TICKET_A",
        "customer_id": "CUST_A",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_B": {
        "ticket_id": "TICKET_B",
        "customer_id": "CUST_B",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_C": {
        "ticket_id": "TICKET_C",
        "customer_id": "CUST_C",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_D": {
        "ticket_id": "TICKET_D",
        "customer_id": "CUST_D",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        # Pre-seeded second complaint in 24h, used as a fraud/escalation signal.
        "notes": ["2026-09-13 16:00 - Customer complained about same merchant, different txn."],
        "escalation": None,
    },
    "TICKET_E": {
        "ticket_id": "TICKET_E",
        "customer_id": "CUST_E",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_F": {
        "ticket_id": "TICKET_F",
        "customer_id": "CUST_F",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_G": {
        "ticket_id": "TICKET_G",
        "customer_id": "CUST_G",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_R1": {
        "ticket_id": "TICKET_R1",
        "customer_id": "CUST_R1",
        "status": "OPEN",
        "assigned_to": "RECON_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_R2": {
        "ticket_id": "TICKET_R2",
        "customer_id": "CUST_R2",
        "status": "OPEN",
        "assigned_to": "RECON_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_R3": {
        "ticket_id": "TICKET_R3",
        "customer_id": "CUST_R3",
        "status": "OPEN",
        "assigned_to": "RECON_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_R4": {
        "ticket_id": "TICKET_R4",
        "customer_id": "CUST_R4",
        "status": "OPEN",
        "assigned_to": "RECON_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_M1": {
        "ticket_id": "TICKET_M1",
        "customer_id": "MERCH_1",
        "status": "OPEN",
        "assigned_to": "MERCHANT_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_M2": {
        "ticket_id": "TICKET_M2",
        "customer_id": "MERCH_2",
        "status": "OPEN",
        "assigned_to": "MERCHANT_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
    "TICKET_M3": {
        "ticket_id": "TICKET_M3",
        "customer_id": "MERCH_3",
        "status": "OPEN",
        "assigned_to": "MERCHANT_AGENT",
        "priority": "NORMAL",
        "notes": [],
        "escalation": None,
    },
}

CUSTOMER_TO_TICKET = {t["customer_id"]: tid for tid, t in TICKETS.items()}


def get_ticket_for_customer(customer_id: str) -> dict | None:
    tid = CUSTOMER_TO_TICKET.get(customer_id)
    return TICKETS.get(tid) if tid else None


def update_ticket(ticket_id: str, status: str, notes: str) -> dict:
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise ValueError(f"Unknown ticket_id: {ticket_id}")
    ticket["status"] = status
    ticket["notes"].append(notes)
    return ticket


def set_escalation(ticket_id: str, reason: str, context_summary: str, suggested_action: str) -> dict:
    """Attach structured escalation context to a ticket, for the human escalation queue."""
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise ValueError(f"Unknown ticket_id: {ticket_id}")
    ticket["escalation"] = {
        "reason": reason,
        "context_summary": context_summary,
        "suggested_action": suggested_action,
        "resolved": False,
        "resolution_note": None,
    }
    return ticket


def get_escalation_queue() -> list[dict]:
    """All tickets currently escalated and awaiting human action."""
    return [
        t for t in TICKETS.values()
        if t["status"] == "ESCALATED" and t["escalation"] and not t["escalation"]["resolved"]
    ]


def resolve_escalation(ticket_id: str, resolution_note: str) -> dict:
    """A human closes out an escalated ticket from the queue."""
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise ValueError(f"Unknown ticket_id: {ticket_id}")
    if not ticket["escalation"]:
        raise ValueError(f"Ticket {ticket_id} has no escalation to resolve")
    ticket["escalation"]["resolved"] = True
    ticket["escalation"]["resolution_note"] = resolution_note
    ticket["status"] = "RESOLVED"
    ticket["notes"].append(f"[Human] Resolved: {resolution_note}")
    return ticket
