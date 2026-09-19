"""Mock sales CRM. Tracks win-back outreach status per lead, separate from support tickets."""

LEAD_RECORDS: dict[str, dict] = {
    "LEAD_S1": {"lead_id": "LEAD_S1", "customer_id": "CUST_S1", "status": "NEW", "notes": []},
    "LEAD_S2": {"lead_id": "LEAD_S2", "customer_id": "CUST_S2", "status": "NEW", "notes": []},
    "LEAD_S3": {"lead_id": "LEAD_S3", "customer_id": "CUST_S3", "status": "NEW", "notes": []},
}


def get_lead_record(lead_id: str) -> dict | None:
    return LEAD_RECORDS.get(lead_id)


def update_lead_record(lead_id: str, status: str, notes: str) -> dict:
    record = LEAD_RECORDS.get(lead_id)
    if not record:
        raise ValueError(f"Unknown lead_id: {lead_id}")
    record["status"] = status
    record["notes"].append(notes)
    return record
