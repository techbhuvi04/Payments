"""Deterministic scam/phishing message classifier. No LLM call.
Keyword and pattern-based risk scoring for suspicious messages."""

import re

HIGH_RISK_KEYWORDS = [
    "kyc update", "kyc verify", "kyc expired", "kyc block",
    "otp share", "share otp", "otp batao", "otp bataiye", "otp bhejo",
    "pin share", "share pin", "pin batao", "pin bataiye",
    "account blocked", "account suspend", "account band",
    "pay to receive", "paise receive karne ke liye pay",
    "cashback milega agar pay", "reward claim karo",
    "upi pin dalo", "upi pin enter",
]

MEDIUM_RISK_KEYWORDS = [
    "urgent", "turant", "jaldi", "abhi karo",
    "click this link", "is link pe click", "link open karo",
    "qr scan karo", "qr code scan", "scan karke pay",
    "lottery", "prize", "winner", "jackpot",
    "free recharge", "free cashback",
    "offer expire", "limited time", "last chance",
]

SCAM_URL_PATTERNS = [
    r"bit\.ly/", r"tinyurl\.com/", r"short\.url/",
    r"paytm-verify\.", r"paytm-kyc\.", r"paytm-update\.",
    r"upi-verify\.", r"payment-verify\.",
    r"http://[^\s]+paytm", r"http://[^\s]+upi",
]

DEMO_MESSAGES = [
    {
        "id": "SCAM_DEMO_1",
        "label": "🚨 Obvious scam",
        "text": "Dear Paytm user, aapka KYC expired ho gaya hai. Turant is link pe click karke update karo: http://paytm-kyc.verify-now.com warna aapka account 24 ghante mein block ho jayega. OTP share karna zaroori hai.",
    },
    {
        "id": "SCAM_DEMO_2",
        "label": "⚠️ Uncertain message",
        "text": "Congratulations! Aapne Rs.5000 ka cashback jeeta hai. Claim karne ke liye abhi is link pe click karo: bit.ly/paytm-reward. Offer sirf aaj ke liye hai.",
    },
    {
        "id": "SCAM_DEMO_3",
        "label": "✅ Normal reminder",
        "text": "Aapka Airtel recharge Rs.299 ka due date kal hai. Paytm app se recharge karna na bhoolein.",
    },
]


def classify_message(text):
    """Classify a message as LOW / MEDIUM / HIGH risk with detected signals."""
    if not text or not text.strip():
        return {
            "risk_level": "LOW",
            "risk_score": 0,
            "signals": [],
            "advice": "Koi message nahi mila check karne ke liye.",
            "safe_actions": [],
        }

    text_lower = text.lower()
    signals = []
    score = 0

    for kw in HIGH_RISK_KEYWORDS:
        if kw in text_lower:
            signals.append(f"Scam signal: '{kw}' detected")
            score += 30

    for kw in MEDIUM_RISK_KEYWORDS:
        if kw in text_lower:
            signals.append(f"Suspicious: '{kw}' detected")
            score += 15

    for pat in SCAM_URL_PATTERNS:
        if re.search(pat, text_lower):
            signals.append("Suspicious/fake link detected")
            score += 25
            break

    if re.search(r"(pay|bhejo|send).{0,30}(receive|milega|cashback)", text_lower):
        signals.append("'Pay karo to receive money' pattern — classic scam")
        score += 35

    urgency = any(w in text_lower for w in ["urgent", "turant", "jaldi", "abhi", "24 ghante"])
    action = any(w in text_lower for w in ["click", "link", "scan", "pay", "share", "batao"])
    if urgency and action:
        signals.append("Urgency + action pressure — scam tactic")
        score += 20

    if score >= 40:
        risk_level = "HIGH"
        advice = (
            "⛔ Yeh bahut zyada suspicious hai! OTP, PIN ya koi personal detail bilkul share mat karo. "
            "Paytm kabhi link ya call se KYC update nahi maangta. Is message ko ignore karo aur report karo."
        )
        safe_actions = ["block_payee", "report_scam"]
    elif score >= 15:
        risk_level = "MEDIUM"
        advice = (
            "⚠️ Yeh message thoda suspicious lag raha hai. Kisi bhi link pe click mat karo. "
            "Agar doubt ho, seedha Paytm app kholke check karo."
        )
        safe_actions = ["report_scam"]
    else:
        risk_level = "LOW"
        advice = "✅ Yeh message safe lagta hai. Phir bhi, apna OTP ya PIN kabhi kisi se share mat karo."
        safe_actions = []

    return {
        "risk_level": risk_level,
        "risk_score": min(score, 100),
        "signals": signals,
        "advice": advice,
        "safe_actions": safe_actions,
    }


def get_demo_messages():
    return DEMO_MESSAGES
