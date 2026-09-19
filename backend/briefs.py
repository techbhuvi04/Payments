"""Deterministic, rule-based brief generators for the User and Business Owner workspaces.

No LLM call here by design: a "brief" is a summary of facts already in the mock databases,
computed with plain arithmetic and status checks. This keeps it fast, free, and auditable -
the same input always produces the same brief.
"""
from datetime import timedelta

import mock_txn_db as txn_db
import mock_refund_api as refund_api
import mock_crm as crm
import mock_leads_db as leads_db
import mock_sales_crm as sales_crm
import mock_coupon_api as coupon_api


def get_user_brief(customer_id: str) -> dict:
    """Personal AI Brief for a Paytm user: spend summary, anything needing attention,
    refund status, and a short proactive reminder-style message."""
    now = txn_db.NOW
    txns = txn_db.get_customer_transactions(customer_id, days_back=30)

    if not txns:
        return {
            "customer_id": customer_id,
            "generated_at": now.isoformat(timespec="seconds"),
            "has_data": False,
            "spend_summary": None,
            "needs_attention": [],
            "refund_status": [],
            "proactive_message": "Abhi tak koi transaction history nahi mili is account ke liye.",
        }

    recent_7d = [t for t in txns if t["timestamp"] >= now - timedelta(days=7)]
    total_spend_30d = sum(t["amount"] for t in txns if t["status"] == "SUCCESS")
    total_spend_7d = sum(t["amount"] for t in recent_7d if t["status"] == "SUCCESS")

    needs_attention = []
    for t in txns:
        if t["status"] == "FAILED" and not t["refund_id"]:
            needs_attention.append({
                "txn_id": t["txn_id"], "merchant_name": t["merchant_name"], "amount": t["amount"],
                "issue": "Payment failed, refund not yet initiated.",
            })
        elif t["status"] == "PENDING":
            age_hours = (now - t["timestamp"]).total_seconds() / 3600
            needs_attention.append({
                "txn_id": t["txn_id"], "merchant_name": t["merchant_name"], "amount": t["amount"],
                "issue": f"Payment stuck in PENDING for {age_hours:.0f}h.",
            })

    refund_status = []
    for t in txns:
        if t["refund_id"]:
            refund = refund_api.get_refund(t["txn_id"])
            if refund:
                refund_status.append({
                    "txn_id": t["txn_id"], "merchant_name": t["merchant_name"],
                    "refund_id": refund["refund_id"], "amount": refund["amount"],
                    "status": refund["status"], "eta_hours": refund["eta_hours"],
                })

    ticket = crm.get_ticket_for_customer(customer_id)
    open_ticket = ticket if ticket and ticket["status"] in ("OPEN", "IN_PROGRESS", "ESCALATED") else None

    if needs_attention:
        t0 = needs_attention[0]
        proactive_message = (
            f"Aapka Rs.{t0['amount']:,.0f} ka payment {t0['merchant_name']} ko abhi tak resolve nahi "
            "hua hai - chat mein bataiye, turant dekhte hain."
        )
    elif refund_status:
        r0 = refund_status[0]
        proactive_message = (
            f"Aapka Rs.{r0['amount']:,.0f} ka refund {r0['status']} hai, {r0['eta_hours']}h mein "
            "account mein aa jayega."
        )
    else:
        proactive_message = "Sab payments theek hain, koi action abhi zaroori nahi hai."

    return {
        "customer_id": customer_id,
        "generated_at": now.isoformat(timespec="seconds"),
        "has_data": True,
        "spend_summary": {
            "total_spend_30d": round(total_spend_30d, 2),
            "total_spend_7d": round(total_spend_7d, 2),
            "transaction_count_30d": len(txns),
            "transaction_count_7d": len(recent_7d),
        },
        "needs_attention": needs_attention,
        "refund_status": refund_status,
        "open_ticket": open_ticket,
        "proactive_message": proactive_message,
    }


def get_business_brief(business_id: str) -> dict:
    """Business AI Brief for the Business Owner workspace: recoverable-lead summary,
    estimated recoverable revenue, retry-only leads, and coupon/discount protection stats.

    business_id is currently a fixed demo id ("default") since the sales leads dataset
    isn't multi-tenant yet - kept as a path param for API shape consistency with the
    user/merchant briefs, and so it's a drop-in extension point later.
    """
    now = txn_db.NOW
    all_leads = list(leads_db.LEADS.values())

    if not all_leads:
        return {
            "business_id": business_id,
            "generated_at": now.isoformat(timespec="seconds"),
            "has_data": False,
        }

    recoverable_leads = []
    retry_only_leads = []
    total_recoverable_value = 0.0
    coupons_already_used = 0
    discount_protected_value = 0.0

    for lead in all_leads:
        record = sales_crm.get_lead_record(lead["lead_id"])
        coupon = coupon_api.get_coupon(lead["lead_id"])
        already_contacted = record and record["status"] in ("CONTACTED", "COUPON_OFFERED")

        if not already_contacted:
            total_recoverable_value += lead["cart_value"]
            recoverable_leads.append({
                "lead_id": lead["lead_id"], "customer_id": lead["customer_id"],
                "merchant_name": lead["merchant_name"], "cart_value": lead["cart_value"],
                "customer_tier": lead["customer_tier"],
            })
            if lead["customer_tier"] == "GOLD" or lead["prior_coupons_used"] >= 1:
                retry_only_leads.append(lead["lead_id"])

        if lead["prior_coupons_used"] >= 1:
            coupons_already_used += 1
            # discount "protected" = cart value we did NOT discount because the guardrail
            # already capped this customer at one coupon.
            discount_protected_value += lead["cart_value"] * 0.15

        if coupon:
            discount_protected_value = max(0.0, discount_protected_value)

    return {
        "business_id": business_id,
        "generated_at": now.isoformat(timespec="seconds"),
        "has_data": True,
        "recoverable_leads": {
            "count": len(recoverable_leads),
            "estimated_value": round(total_recoverable_value, 2),
            "leads": recoverable_leads,
        },
        "retry_only_lead_ids": retry_only_leads,
        "coupon_discipline": {
            "customers_at_coupon_limit": coupons_already_used,
            "estimated_discount_protected": round(discount_protected_value, 2),
            "max_discount_pct": 20.0,
            "max_coupons_per_customer": 1,
        },
    }
