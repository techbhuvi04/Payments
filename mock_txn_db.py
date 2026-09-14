"""In-memory customer transaction database."""
from datetime import datetime, timedelta

NOW = datetime(2026, 9, 14, 12, 0, 0)

TRANSACTIONS = {
    # --- Scenario A: Clean auto-refund. Bank declined, money debited. ---
    "TXN1001": {
        "txn_id": "TXN1001",
        "customer_id": "CUST_A",
        "merchant_name": "Sharma Electronics",
        "amount": 2400.0,
        "timestamp": NOW - timedelta(days=1),
        "status": "FAILED",
        "bank_ref": "BANKREF_A1",
        "settlement_status": None,
        "refund_id": None,
    },

    # --- Scenario B: Stuck pending > 48h, needs force-settle. ---
    "TXN1002": {
        "txn_id": "TXN1002",
        "customer_id": "CUST_B",
        "merchant_name": "Verma Mobile Store",
        "amount": 5600.0,
        "timestamp": NOW - timedelta(days=3),
        "status": "PENDING",
        "bank_ref": "BANKREF_B1",
        "settlement_status": "PENDING",
        "refund_id": None,
    },

    # --- Scenario C: Already settled at merchant end, send proof. ---
    "TXN1003": {
        "txn_id": "TXN1003",
        "customer_id": "CUST_C",
        "merchant_name": "Gupta Kirana Store",
        "amount": 850.0,
        "timestamp": NOW - timedelta(hours=6),
        "status": "SUCCESS",
        "bank_ref": "BANKREF_C1",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },

    # --- Scenario D: Escalation. Large amount + repeat complaint. ---
    "TXN1004": {
        "txn_id": "TXN1004",
        "customer_id": "CUST_D",
        "merchant_name": "Singh Jewellers",
        "amount": 47000.0,
        "timestamp": NOW - timedelta(hours=10),
        "status": "FAILED",
        "bank_ref": "BANKREF_D1",
        "settlement_status": None,
        "refund_id": None,
    },
    "TXN1005": {
        "txn_id": "TXN1005",
        "customer_id": "CUST_D",
        "merchant_name": "Singh Jewellers",
        "amount": 47000.0,
        "timestamp": NOW - timedelta(hours=20),
        "status": "FAILED",
        "bank_ref": "BANKREF_D2",
        "settlement_status": None,
        "refund_id": None,
    },

    # Some filler/unrelated transactions so lookups aren't trivially single-item.
    "TXN2001": {
        "txn_id": "TXN2001",
        "customer_id": "CUST_A",
        "merchant_name": "Big Bazaar",
        "amount": 1200.0,
        "timestamp": NOW - timedelta(days=5),
        "status": "SUCCESS",
        "bank_ref": "BANKREF_A2",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },
}


def get_customer_transactions(customer_id: str, days_back: int = 7) -> list[dict]:
    """Return this customer's transactions within the last `days_back` days, newest first."""
    cutoff = NOW - timedelta(days=days_back)
    txns = [
        t for t in TRANSACTIONS.values()
        if t["customer_id"] == customer_id and t["timestamp"] >= cutoff
    ]
    return sorted(txns, key=lambda t: t["timestamp"], reverse=True)


def get_transaction(txn_id: str) -> dict | None:
    return TRANSACTIONS.get(txn_id)


def set_refund_id(txn_id: str, refund_id: str) -> None:
    if txn_id in TRANSACTIONS:
        TRANSACTIONS[txn_id]["refund_id"] = refund_id


def set_settlement_status(txn_id: str, status: str) -> None:
    if txn_id in TRANSACTIONS:
        TRANSACTIONS[txn_id]["settlement_status"] = status
