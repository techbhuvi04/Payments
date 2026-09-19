"""In-memory sales leads: customers with abandoned/failed checkouts, for the win-back agent."""
from datetime import datetime, timedelta

NOW = datetime(2026, 9, 14, 12, 0, 0)

LEADS = {
    # --- Sales Scenario 1: Clean win-back, first-time customer, no prior coupon. ---
    "LEAD_S1": {
        "lead_id": "LEAD_S1",
        "customer_id": "CUST_S1",
        "merchant_name": "Paytm Mall - Electronics",
        "cart_value": 4200.0,
        "abandoned_at": NOW - timedelta(hours=20),
        "checkout_status": "ABANDONED",
        "customer_tier": "NEW",
        "prior_coupons_used": 0,
    },
    # --- Sales Scenario 2: Repeat high-value customer, payment failed (not abandoned) -> retry nudge, no discount needed. ---
    "LEAD_S2": {
        "lead_id": "LEAD_S2",
        "customer_id": "CUST_S2",
        "merchant_name": "Paytm Travel",
        "cart_value": 8900.0,
        "abandoned_at": NOW - timedelta(hours=3),
        "checkout_status": "PAYMENT_FAILED",
        "customer_tier": "GOLD",
        "prior_coupons_used": 0,
    },
    # --- Sales Scenario 3: Already used max coupons -> guardrail blocks further discount, send plain nudge only. ---
    "LEAD_S3": {
        "lead_id": "LEAD_S3",
        "customer_id": "CUST_S3",
        "merchant_name": "Paytm Mall - Fashion",
        "cart_value": 1500.0,
        "abandoned_at": NOW - timedelta(hours=30),
        "checkout_status": "ABANDONED",
        "customer_tier": "NEW",
        "prior_coupons_used": 2,
    },
}


def get_lead(lead_id: str) -> dict | None:
    return LEADS.get(lead_id)


def get_leads_for_customer(customer_id: str) -> list[dict]:
    return [l for l in LEADS.values() if l["customer_id"] == customer_id]


def mark_coupon_used(lead_id: str) -> None:
    if lead_id in LEADS:
        LEADS[lead_id]["prior_coupons_used"] += 1
