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

    # --- Scenario E: Small clean auto-refund, different merchant/amount than A. ---
    "TXN1006": {
        "txn_id": "TXN1006",
        "customer_id": "CUST_E",
        "merchant_name": "Reddy Medical Store",
        "amount": 640.0,
        "timestamp": NOW - timedelta(hours=4),
        "status": "FAILED",
        "bank_ref": "BANKREF_E1",
        "settlement_status": None,
        "refund_id": None,
    },

    # --- Scenario F: Stuck pending, but under 48h -> should NOT force-settle yet, ambiguous/escalate. ---
    "TXN1007": {
        "txn_id": "TXN1007",
        "customer_id": "CUST_F",
        "merchant_name": "Iyer Textiles",
        "amount": 3200.0,
        "timestamp": NOW - timedelta(hours=10),
        "status": "PENDING",
        "bank_ref": "BANKREF_F1",
        "settlement_status": "PENDING",
        "refund_id": None,
    },

    # --- Scenario G: High-value but single complaint (no fraud signal) -> still escalate on amount alone. ---
    "TXN1008": {
        "txn_id": "TXN1008",
        "customer_id": "CUST_G",
        "merchant_name": "Malhotra Furnishings",
        "amount": 31000.0,
        "timestamp": NOW - timedelta(hours=2),
        "status": "FAILED",
        "bank_ref": "BANKREF_G1",
        "settlement_status": None,
        "refund_id": None,
    },

    # --- Reconciliation targets: silent mismatches, no customer complaint yet. ---

    # R1: Internal shows SUCCESS, but bank actually DECLINED it. Money should be refunded,
    # but customer hasn't noticed/complained yet -> small amount, agent can auto-fix.
    "TXN1009": {
        "txn_id": "TXN1009",
        "customer_id": "CUST_R1",
        "merchant_name": "Nair Stationery",
        "amount": 350.0,
        "timestamp": NOW - timedelta(hours=14),
        "status": "SUCCESS",
        "bank_ref": "BANKREF_R1",
        "settlement_status": None,
        "refund_id": None,
    },

    # R2: Internal still shows PENDING, but bank has already SETTLED it days ago.
    # Internal status is just stale -> agent should auto-correct the internal record, no refund needed.
    "TXN1010": {
        "txn_id": "TXN1010",
        "customer_id": "CUST_R2",
        "merchant_name": "Bose Home Decor",
        "amount": 2100.0,
        "timestamp": NOW - timedelta(days=4),
        "status": "PENDING",
        "bank_ref": "BANKREF_R2",
        "settlement_status": "PENDING",
        "refund_id": None,
    },

    # R3: Internal shows SUCCESS, bank DECLINED it, but amount is large -> too risky to
    # auto-refund, must escalate to a human even though the fix looks obvious.
    "TXN1011": {
        "txn_id": "TXN1011",
        "customer_id": "CUST_R3",
        "merchant_name": "Kapoor Appliances",
        "amount": 18500.0,
        "timestamp": NOW - timedelta(hours=6),
        "status": "SUCCESS",
        "bank_ref": "BANKREF_R3",
        "settlement_status": None,
        "refund_id": None,
    },

    # R4: Clean, already consistent (SUCCESS + SETTLED) -> control case, sweep should
    # report a match with no action taken.
    "TXN1012": {
        "txn_id": "TXN1012",
        "customer_id": "CUST_R4",
        "merchant_name": "Joshi Bookstore",
        "amount": 600.0,
        "timestamp": NOW - timedelta(hours=8),
        "status": "SUCCESS",
        "bank_ref": "BANKREF_R4",
        "settlement_status": "SETTLED",
        "refund_id": None,
    },

    # --- Cosmetic history filler: plain successful/settled transactions so each demo
    # customer's dashboard shows a realistic transaction history, not just their one
    # scenario txn. These never appear in any scenario's expected agent behavior. ---
}


def _make_filler(customer_id: str, txn_id_prefix: str, entries: list[tuple]) -> None:
    """entries: list of (merchant_name, amount, days_ago, hours_ago) tuples, all SUCCESS/SETTLED."""
    for i, (merchant, amount, days_ago, hours_ago) in enumerate(entries, start=1):
        txn_id = f"{txn_id_prefix}{i:02d}"
        TRANSACTIONS[txn_id] = {
            "txn_id": txn_id,
            "customer_id": customer_id,
            "merchant_name": merchant,
            "amount": amount,
            "timestamp": NOW - timedelta(days=days_ago, hours=hours_ago),
            "status": "SUCCESS",
            "bank_ref": f"BANKREF_{txn_id}",
            "settlement_status": "SETTLED",
            "refund_id": None,
        }


_make_filler("CUST_A", "TXNFILL_A", [
    ("Zomato", 480.0, 2, 3), ("Uber", 220.0, 3, 8), ("Amazon", 1899.0, 6, 0),
    ("BSES Electricity Bill", 2150.0, 9, 0), ("Big Bazaar", 940.0, 12, 0),
])
_make_filler("CUST_B", "TXNFILL_B", [
    ("Swiggy", 360.0, 1, 5), ("Airtel Recharge", 299.0, 4, 0), ("Myntra", 1450.0, 8, 0),
    ("IRCTC", 890.0, 11, 0),
])
_make_filler("CUST_C", "TXNFILL_C", [
    ("Reliance Digital", 3200.0, 2, 0), ("BookMyShow", 600.0, 5, 0), ("Domino's Pizza", 540.0, 8, 4),
])
_make_filler("CUST_D", "TXNFILL_D", [
    ("Croma", 5400.0, 3, 0), ("Netflix", 649.0, 6, 0), ("Jio Recharge", 399.0, 10, 0),
])
_make_filler("CUST_E", "TXNFILL_E", [
    ("1mg Pharmacy", 780.0, 1, 2), ("Ola Cabs", 310.0, 5, 0), ("D-Mart", 2100.0, 9, 0),
])
_make_filler("CUST_F", "TXNFILL_F", [
    ("Flipkart", 2499.0, 2, 0), ("Zepto", 420.0, 4, 6), ("LIC Premium", 5000.0, 12, 0),
])
_make_filler("CUST_G", "TXNFILL_G", [
    ("Tata Sky Recharge", 599.0, 2, 0), ("Nykaa", 1250.0, 6, 0), ("PVR Cinemas", 800.0, 9, 3),
])


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


def get_all_transactions() -> list[dict]:
    """All transactions, newest first. Used by the reconciliation sweep to scan everything."""
    return sorted(TRANSACTIONS.values(), key=lambda t: t["timestamp"], reverse=True)


def set_refund_id(txn_id: str, refund_id: str) -> None:
    if txn_id in TRANSACTIONS:
        TRANSACTIONS[txn_id]["refund_id"] = refund_id


def set_settlement_status(txn_id: str, status: str) -> None:
    if txn_id in TRANSACTIONS:
        TRANSACTIONS[txn_id]["settlement_status"] = status
