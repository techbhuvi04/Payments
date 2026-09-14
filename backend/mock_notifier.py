"""Mock SMS notifier. Appends to an outbox log for UI rendering."""
from datetime import datetime

# customer_id -> phone number, for demo purposes
CUSTOMER_PHONES = {
    "CUST_A": "+91-98765-00001",
    "CUST_B": "+91-98765-00002",
    "CUST_C": "+91-98765-00003",
    "CUST_D": "+91-98765-00004",
}

OUTBOX: list[dict] = []


def send_sms(phone: str, message: str) -> dict:
    entry = {
        "phone": phone,
        "message": message,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }
    OUTBOX.append(entry)
    return entry


def send_customer_message(customer_id: str, message: str) -> dict:
    phone = CUSTOMER_PHONES.get(customer_id, "+91-00000-00000")
    return send_sms(phone, message)
