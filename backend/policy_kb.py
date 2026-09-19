"""Local policy knowledge base. No vector DB, no external service.
Simple keyword/status/action-based retrieval for the Evidence & Policy card."""

POLICIES = [
    {
        "id": "POL_REFUND_LIMIT",
        "title": "Auto-Refund Limit — ₹25,000",
        "description": (
            "Automatic refunds can only be issued for transactions at or below ₹25,000. "
            "Any refund request exceeding this amount must be escalated to a human agent "
            "for manual review and approval."
        ),
        "keywords": ["refund", "amount", "limit", "25000", "high_value", "blocked"],
        "statuses": ["FAILED"],
        "actions": ["initiate_refund", "escalate_to_human"],
    },
    {
        "id": "POL_EXACT_MATCH",
        "title": "Refund Amount Must Exactly Match Original Transaction",
        "description": (
            "The refund amount must exactly match the original transaction amount "
            "(rounded to 2 decimal places). Partial refunds, rounded amounts, or "
            "guessed amounts are not permitted. The system will block any mismatch."
        ),
        "keywords": ["refund", "amount", "mismatch", "exact", "match"],
        "statuses": ["FAILED"],
        "actions": ["initiate_refund", "auto_refund_mismatch"],
    },
    {
        "id": "POL_FORCE_SETTLE_48H",
        "title": "Force-Settlement Only After 48 Hours Pending",
        "description": (
            "A pending transaction can only be force-settled if it has been in PENDING "
            "status for more than 48 hours. Transactions pending for less than 48 hours "
            "must either wait or be escalated if the customer needs immediate resolution."
        ),
        "keywords": ["pending", "force", "settlement", "48", "hours", "stuck"],
        "statuses": ["PENDING"],
        "actions": ["force_settlement"],
    },
    {
        "id": "POL_ESCALATION_REQUIRED",
        "title": "Human Escalation for High-Value / Repeat / Fraud Cases",
        "description": (
            "Cases involving high-value transactions (above auto-fix limits), repeat "
            "complaints about the same merchant within 24 hours, suspected fraud signals "
            "(e.g. SUSPECTED_FRAUD_HOLD from bank), or any ambiguous situation must be "
            "escalated to a human agent immediately. The AI agent must not attempt "
            "autonomous resolution in these cases."
        ),
        "keywords": ["escalate", "fraud", "repeat", "high_value", "ambiguous", "human"],
        "statuses": ["FAILED", "PENDING"],
        "actions": ["escalate_to_human", "escalate_mismatch", "escalate_merchant_case"],
    },
    {
        "id": "POL_DUPLICATE_BLOCKED",
        "title": "Duplicate Refunds Are Blocked",
        "description": (
            "The system blocks any attempt to issue a second refund for a transaction "
            "that already has an existing refund record. This prevents double-crediting "
            "the customer and protects against LLM retry loops."
        ),
        "keywords": ["duplicate", "refund", "existing", "blocked", "already"],
        "statuses": ["FAILED"],
        "actions": ["initiate_refund", "auto_refund_mismatch"],
    },
    {
        "id": "POL_IDEMPOTENT_OPS",
        "title": "All Corrective Actions Are Idempotent",
        "description": (
            "Force-settlements, status corrections, and reversals are idempotent. "
            "Re-calling them on an already-processed transaction returns the existing "
            "result as a safe no-op, without creating a duplicate action. This is "
            "critical for a system where the LLM may retry tool calls."
        ),
        "keywords": ["idempotent", "settled", "already", "no_action", "safe"],
        "statuses": ["SETTLED"],
        "actions": ["force_settlement", "correct_internal_status", "correct_merchant_status"],
    },
]


def retrieve_policies(keywords=None, status=None, actions=None):
    """Retrieve relevant policies by keyword overlap, transaction status, or action taken."""
    if not keywords and not status and not actions:
        return []

    kw_set = set(w.lower() for w in (keywords or []))
    results = []

    for pol in POLICIES:
        score = 0
        pol_kw = set(w.lower() for w in pol["keywords"])

        if kw_set:
            overlap = kw_set & pol_kw
            score += len(overlap) * 2

        if status and status.upper() in pol["statuses"]:
            score += 1

        if actions:
            for a in actions:
                if a in pol["actions"]:
                    score += 3

        if score > 0:
            results.append({"policy": pol, "relevance_score": score})

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return [r["policy"] for r in results]


def get_evidence_for_resolution(events, txn_status=None):
    """Given a list of agent run events, extract actions and retrieve matching policies."""
    actions_taken = []
    bank_evidence = []
    guardrail_events = []
    tool_keywords = []

    for ev in events:
        if ev.get("type") == "tool_call" and ev.get("tool"):
            actions_taken.append(ev["tool"])
            for part in ev["tool"].split("_"):
                tool_keywords.append(part)
        if ev.get("type") == "guardrail_block":
            guardrail_events.append(ev.get("tool", ""))
            tool_keywords.extend(["blocked", ev.get("tool", "")])
            for part in (ev.get("tool") or "").split("_"):
                tool_keywords.append(part)
        if ev.get("type") == "escalation":
            actions_taken.append(ev.get("tool", "escalate_to_human"))
            tool_keywords.extend(["escalate", "human"])
        if ev.get("tool") == "check_bank_settlement":
            bank_evidence.append(ev.get("result", ""))

    if txn_status:
        tool_keywords.append(txn_status.lower())

    policies = retrieve_policies(keywords=tool_keywords, status=txn_status, actions=actions_taken)

    return {
        "actions_taken": list(set(actions_taken)),
        "bank_evidence": bank_evidence,
        "guardrail_events": guardrail_events,
        "policies_matched": [
            {"id": p["id"], "title": p["title"], "description": p["description"]}
            for p in policies[:3]
        ],
        "policy_checked": len(policies) > 0,
    }
