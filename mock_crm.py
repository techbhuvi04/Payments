"""Mock CRM ticketing system."""

TICKETS: dict[str, dict] = {
    "TICKET_A": {
        "ticket_id": "TICKET_A",
        "customer_id": "CUST_A",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
    },
    "TICKET_B": {
        "ticket_id": "TICKET_B",
        "customer_id": "CUST_B",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
    },
    "TICKET_C": {
        "ticket_id": "TICKET_C",
        "customer_id": "CUST_C",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        "notes": [],
    },
    "TICKET_D": {
        "ticket_id": "TICKET_D",
        "customer_id": "CUST_D",
        "status": "OPEN",
        "assigned_to": "AGENT_BOT",
        "priority": "NORMAL",
        # Pre-seeded second complaint in 24h, used as a fraud/escalation signal.
        "notes": ["2026-09-13 16:00 - Customer complained about same merchant, different txn."],
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
