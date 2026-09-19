"""Proactive Payment Guardian. Deterministic scan of existing seeded transactions.
No LLM call — uses the same mock data and guardrail thresholds as the agent tools."""

from datetime import timedelta
import mock_txn_db as txn_db
import mock_bank_api as bank_api
import mock_refund_api as refund_api
from audit_log import log_event

REFUND_HARD_LIMIT = 25000.0
FORCE_SETTLEMENT_MIN_PENDING_HOURS = 48

# Seeded demo alerts shown before any scan
SEEDED_ALERTS = [
    {
        "alert_id": "ALERT_PROACTIVE_1",
        "type": "info",
        "message": "We detected a payment issue before the customer raised a complaint.",
        "timestamp": txn_db.NOW.isoformat(timespec="seconds"),
    },
    {
        "alert_id": "ALERT_PROACTIVE_2",
        "type": "warning",
        "message": "Ek pending payment 48 ghante se zyada stuck hai — auto-check ready.",
        "timestamp": (txn_db.NOW - timedelta(hours=1)).isoformat(timespec="seconds"),
    },
    {
        "alert_id": "ALERT_PROACTIVE_3",
        "type": "success",
        "message": "Proactive scan se 2 issues detect hue, 1 safe auto-refund eligible.",
        "timestamp": (txn_db.NOW - timedelta(hours=2)).isoformat(timespec="seconds"),
    },
]


def run_proactive_scan(customer_id=None):
    """Scan all (or one customer's) transactions for issues. Returns structured results
    with a timeline for each issue found. Fully deterministic — no LLM call."""
    if customer_id:
        txns = txn_db.get_customer_transactions(customer_id, days_back=30)
    else:
        txns = txn_db.get_all_transactions()

    issues = []
    summary = {"total_scanned": 0, "safe_refund": 0, "pending_stuck": 0, "escalation": 0, "clean": 0}

    for txn in txns:
        summary["total_scanned"] += 1
        issue = _classify_transaction(txn)
        if issue:
            issues.append(issue)
            summary[issue["category"]] = summary.get(issue["category"], 0) + 1
        else:
            summary["clean"] += 1

    log_event("proactive_guardian", "scan_completed", {
        "customer_id": customer_id, "total_scanned": summary["total_scanned"],
        "issues_found": len(issues),
    })

    return {
        "scan_complete": True,
        "summary": summary,
        "issues": issues,
        "alerts": SEEDED_ALERTS,
    }


def _classify_transaction(txn):
    """Classify a single transaction. Returns None if clean."""
    txn_id = txn["txn_id"]
    amount = txn["amount"]
    status = txn["status"]
    settlement = txn["settlement_status"]
    age_hours = (txn_db.NOW - txn["timestamp"]).total_seconds() / 3600
    existing_refund = refund_api.get_refund(txn_id)

    # Skip already-refunded or clean settled
    if existing_refund:
        return None
    if status == "SUCCESS" and settlement == "SETTLED":
        return None

    # Check bank status
    bank = bank_api.check_settlement(txn["bank_ref"])
    bank_state = bank["settlement_state"]

    # Case 1: Failed/debited, bank declined — eligible for safe refund
    if status == "FAILED" and bank_state == "DECLINED" and amount <= REFUND_HARD_LIMIT:
        return {
            "txn_id": txn_id,
            "customer_id": txn["customer_id"],
            "merchant_name": txn["merchant_name"],
            "amount": amount,
            "category": "safe_refund",
            "severity": "medium",
            "title": f"Failed payment eligible for safe refund",
            "description": (
                f"Rs.{amount:,.0f} to {txn['merchant_name']} — bank declined, "
                f"money debited. Safe auto-refund eligible."
            ),
            "timeline": [
                {"step": "Detected", "detail": f"Payment failed, Rs.{amount:,.0f} debited", "status": "done"},
                {"step": "Investigated", "detail": f"Bank status: {bank_state} ({bank['reason_code']})", "status": "done"},
                {"step": "Safe action", "detail": "Eligible for auto-refund (within ₹25K limit)", "status": "ready"},
                {"step": "Customer notified", "detail": "Hinglish SMS on resolution", "status": "pending"},
            ],
            "bank_evidence": bank,
        }

    # Case 2: Stuck pending > 48h
    if status == "PENDING" and settlement == "PENDING" and age_hours > FORCE_SETTLEMENT_MIN_PENDING_HOURS:
        return {
            "txn_id": txn_id,
            "customer_id": txn["customer_id"],
            "merchant_name": txn["merchant_name"],
            "amount": amount,
            "category": "pending_stuck",
            "severity": "medium",
            "title": f"Payment stuck pending for {age_hours:.0f}h",
            "description": (
                f"Rs.{amount:,.0f} to {txn['merchant_name']} — pending for "
                f"{age_hours:.0f} hours (>{FORCE_SETTLEMENT_MIN_PENDING_HOURS}h threshold). "
                f"Eligible for force-settlement."
            ),
            "timeline": [
                {"step": "Detected", "detail": f"Pending for {age_hours:.0f}h (>{FORCE_SETTLEMENT_MIN_PENDING_HOURS}h)", "status": "done"},
                {"step": "Investigated", "detail": f"Bank status: {bank_state}", "status": "done"},
                {"step": "Safe action", "detail": "Eligible for force-settlement", "status": "ready"},
                {"step": "Customer notified", "detail": "Hinglish SMS on resolution", "status": "pending"},
            ],
            "bank_evidence": bank,
        }

    # Case 3: High-value failed — requires escalation
    if status == "FAILED" and amount > REFUND_HARD_LIMIT:
        return {
            "txn_id": txn_id,
            "customer_id": txn["customer_id"],
            "merchant_name": txn["merchant_name"],
            "amount": amount,
            "category": "escalation",
            "severity": "high",
            "title": f"High-value failed payment requires escalation",
            "description": (
                f"Rs.{amount:,.0f} to {txn['merchant_name']} — exceeds ₹25,000 auto-refund limit. "
                f"Requires human review."
            ),
            "timeline": [
                {"step": "Detected", "detail": f"Failed payment Rs.{amount:,.0f}", "status": "done"},
                {"step": "Investigated", "detail": f"Bank status: {bank_state} ({bank['reason_code']})", "status": "done"},
                {"step": "Escalated", "detail": "Above ₹25K limit — human review required", "status": "done"},
                {"step": "Customer notified", "detail": "Will be updated after human review", "status": "pending"},
            ],
            "bank_evidence": bank,
        }

    # Case 4: Pending but < 48h — noted but not actionable yet
    if status == "PENDING" and age_hours < FORCE_SETTLEMENT_MIN_PENDING_HOURS:
        return {
            "txn_id": txn_id,
            "customer_id": txn["customer_id"],
            "merchant_name": txn["merchant_name"],
            "amount": amount,
            "category": "pending_stuck",
            "severity": "low",
            "title": f"Payment pending for {age_hours:.0f}h (monitoring)",
            "description": (
                f"Rs.{amount:,.0f} to {txn['merchant_name']} — pending for {age_hours:.0f}h. "
                f"Not yet eligible for force-settlement (<{FORCE_SETTLEMENT_MIN_PENDING_HOURS}h)."
            ),
            "timeline": [
                {"step": "Detected", "detail": f"Pending for {age_hours:.0f}h", "status": "done"},
                {"step": "Investigated", "detail": f"Bank status: {bank_state}", "status": "done"},
                {"step": "Monitoring", "detail": f"Will become actionable after {FORCE_SETTLEMENT_MIN_PENDING_HOURS}h", "status": "waiting"},
            ],
            "bank_evidence": bank,
        }

    # Case 5: Internal SUCCESS but bank DECLINED — mismatch
    if status == "SUCCESS" and bank_state == "DECLINED":
        cat = "safe_refund" if amount <= REFUND_HARD_LIMIT else "escalation"
        return {
            "txn_id": txn_id,
            "customer_id": txn["customer_id"],
            "merchant_name": txn["merchant_name"],
            "amount": amount,
            "category": cat,
            "severity": "high" if cat == "escalation" else "medium",
            "title": f"Internal/bank mismatch — {'safe refund' if cat == 'safe_refund' else 'escalation'}",
            "description": (
                f"Rs.{amount:,.0f} to {txn['merchant_name']} — internal shows SUCCESS but bank "
                f"shows DECLINED. {'Auto-refund eligible.' if cat == 'safe_refund' else 'Requires escalation.'}"
            ),
            "timeline": [
                {"step": "Detected", "detail": "Internal/bank status mismatch", "status": "done"},
                {"step": "Investigated", "detail": f"Internal: SUCCESS, Bank: {bank_state}", "status": "done"},
                {"step": "Safe action" if cat == "safe_refund" else "Escalated",
                 "detail": "Auto-refund eligible" if cat == "safe_refund" else "Human review required",
                 "status": "ready" if cat == "safe_refund" else "done"},
            ],
            "bank_evidence": bank,
        }

    return None
