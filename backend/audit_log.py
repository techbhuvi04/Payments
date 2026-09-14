"""Audit trail. Every state-changing tool call writes here before returning."""
from datetime import datetime

AUDIT_LOG: list[dict] = []


def log_event(actor: str, action: str, details: dict) -> dict:
    entry = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "actor": actor,
        "action": action,
        "details": details,
    }
    AUDIT_LOG.append(entry)
    return entry


def get_audit_log() -> list[dict]:
    return AUDIT_LOG


def reset_audit_log() -> None:
    AUDIT_LOG.clear()
