"""Mock SMS notifier. Appends to an outbox log for UI rendering."""
from datetime import datetime

# customer_id -> phone number, for demo purposes
CUSTOMER_PHONES = {
    "CUST_A": "+91-98765-00001",
    "CUST_B": "+91-98765-00002",
    "CUST_C": "+91-98765-00003",
    "CUST_D": "+91-98765-00004",
    "CUST_E": "+91-98765-00005",
    "CUST_F": "+91-98765-00006",
    "CUST_G": "+91-98765-00007",
    "CUST_S1": "+91-98765-00101",
    "CUST_S2": "+91-98765-00102",
    "CUST_S3": "+91-98765-00103",
    "CUST_R1": "+91-98765-00201",
    "CUST_R2": "+91-98765-00202",
    "CUST_R3": "+91-98765-00203",
    "CUST_R4": "+91-98765-00204",
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
