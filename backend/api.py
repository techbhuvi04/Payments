"""FastAPI backend. One process, one port: serves the API and the ./web static frontend."""
import asyncio
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import run_agent_events
from sales_agent import run_sales_agent_events
from recon_agent import run_reconciliation_sweep
from merchant_agent import run_merchant_sweep, run_merchant_query_events
import mock_txn_db as txn_db
import mock_crm as crm
import mock_notifier as notifier
import mock_refund_api as refund_api
import mock_leads_db as leads_db
import mock_sales_crm as sales_crm
import mock_coupon_api as coupon_api
import mock_merchants_db as merch_db
import merchant_tools
from reset_state import reset_all_state
from audit_log import log_event
from briefs import get_user_brief, get_business_brief
from proactive_guardian import run_proactive_scan
from policy_kb import retrieve_policies, get_evidence_for_resolution
from scam_shield import classify_message, get_demo_messages
from impact_metrics import get_impact_metrics

app = FastAPI()

RUNS: dict[str, dict] = {}
SALES_RUNS: dict[str, dict] = {}
RECON_RUNS: dict[str, dict] = {}
MERCHANT_RUNS: dict[str, dict] = {}
MERCHANT_QUERY_RUNS: dict[str, dict] = {}

RECON_TXN_IDS = ["TXN1009", "TXN1010", "TXN1011", "TXN1012"]

# One demo sweep scenario per merchant: clean confirmation / safe auto-fixes / high-value escalation.
MERCHANT_SWEEP_TXN_IDS = {
    "MERCH_1": ["MTXN_101", "MTXN_102"],
    "MERCH_2": ["MTXN_201", "MTXN_202"],
    "MERCH_3": ["MTXN_301", "MTXN_302"],
}


class AttachmentContext(BaseModel):
    filename: str
    type: str
    size: int
    text_preview: str | None = None


class RunRequest(BaseModel):
    complaint: str
    customer_id: str
    attachments: list[AttachmentContext] | None = None


class SalesRunRequest(BaseModel):
    lead_id: str
    customer_id: str
    attachments: list[AttachmentContext] | None = None


class ResolveEscalationRequest(BaseModel):
    resolution_note: str


class MerchantQueryRequest(BaseModel):
    merchant_id: str
    question: str
    attachments: list[AttachmentContext] | None = None


def _append_attachment_context(text: str, attachments: list[AttachmentContext] | None) -> str:
    """Fold attachment metadata (and, for text-like files, the client-read preview)
    into the existing complaint/question string before it reaches the agent loop.
    This is the only integration point - agent.py/sales_agent.py/merchant_agent.py
    are untouched, they just see a slightly longer string."""
    if not attachments:
        return text
    notes = []
    for a in attachments:
        if a.text_preview:
            notes.append(f"[Attached: {a.filename} ({a.type}, {a.size} bytes) - preview: {a.text_preview}]")
        else:
            notes.append(f"[Attached: {a.filename} ({a.type}, {a.size} bytes) - file metadata only, no content extracted]")
    return text + "\n\n" + "\n".join(notes)


def _current_state(customer_id: str, ticket_id: str | None) -> dict:
    ticket = crm.TICKETS.get(ticket_id) if ticket_id else crm.get_ticket_for_customer(customer_id)
    transactions = txn_db.get_customer_transactions(customer_id, days_back=7)
    refunds = {t["txn_id"]: refund_api.get_refund(t["txn_id"]) for t in transactions}
    refunds = {k: v for k, v in refunds.items() if v}
    phone = notifier.CUSTOMER_PHONES.get(customer_id)
    sms_outbox = [m for m in notifier.OUTBOX if m["phone"] == phone]
    return {
        "ticket": ticket,
        "transactions": transactions,
        "refunds": refunds,
        "sms_outbox": sms_outbox,
    }


async def execute_agent(run_id: str, customer_id: str, ticket_id: str, complaint: str) -> None:
    run = RUNS[run_id]
    loop = asyncio.get_event_loop()
    gen = run_agent_events(customer_id, ticket_id, complaint)

    try:
        while True:
            event = await loop.run_in_executor(None, _next_or_none, gen)
            if event is None:
                break
            run["events"].append(event)
            run["state"] = _current_state(customer_id, ticket_id)
            if event["type"] == "done":
                run["done"] = True
            await asyncio.sleep(0.4)
    except Exception as e:
        run["events"].append({
            "seq": len(run["events"]) + 1,
            "type": "done",
            "tool": None,
            "args": None,
            "result": {"status": "error", "final_text": f"Agent run failed: {e}"},
            "latency_ms": None,
            "blocked": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

    run["done"] = True


def _next_or_none(gen):
    try:
        return next(gen)
    except StopIteration:
        return None


def _current_sales_state(lead_id: str, customer_id: str) -> dict:
    lead = leads_db.get_lead(lead_id)
    lead_record = sales_crm.get_lead_record(lead_id)
    coupon = coupon_api.get_coupon(lead_id)
    phone = notifier.CUSTOMER_PHONES.get(customer_id)
    sms_outbox = [m for m in notifier.OUTBOX if m["phone"] == phone]
    return {
        "lead": lead,
        "lead_record": lead_record,
        "coupon": coupon,
        "sms_outbox": sms_outbox,
    }


async def execute_sales_agent(run_id: str, lead_id: str, customer_id: str) -> None:
    run = SALES_RUNS[run_id]
    loop = asyncio.get_event_loop()
    gen = run_sales_agent_events(lead_id, customer_id)

    try:
        while True:
            event = await loop.run_in_executor(None, _next_or_none, gen)
            if event is None:
                break
            run["events"].append(event)
            run["state"] = _current_sales_state(lead_id, customer_id)
            if event["type"] == "done":
                run["done"] = True
            await asyncio.sleep(0.4)
    except Exception as e:
        run["events"].append({
            "seq": len(run["events"]) + 1,
            "type": "done",
            "tool": None,
            "args": None,
            "result": {"status": "error", "final_text": f"Sales agent run failed: {e}"},
            "latency_ms": None,
            "blocked": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

    run["done"] = True


@app.post("/api/sales/run")
async def start_sales_run(req: SalesRunRequest):
    run_id = uuid.uuid4().hex[:12]
    SALES_RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_sales_state(req.lead_id, req.customer_id),
    }
    asyncio.create_task(execute_sales_agent(run_id, req.lead_id, req.customer_id))
    return {"run_id": run_id}


@app.get("/api/sales/runs/{run_id}/events")
async def get_sales_events(run_id: str, since: int = 0):
    run = SALES_RUNS.get(run_id)
    if run is None:
        return {"events": [], "done": True, "state": {}}
    return {
        "events": run["events"][since:],
        "done": run["done"],
        "state": run["state"],
    }


@app.get("/api/sales/leads")
async def list_leads():
    """All seeded sales leads, for the UI's preset picker."""
    return {"leads": list(leads_db.LEADS.values())}


def _current_recon_state() -> dict:
    txns = [txn_db.get_transaction(tid) for tid in RECON_TXN_IDS]
    tickets = [crm.get_ticket_for_customer(t["customer_id"]) for t in txns if t]
    refunds = {t["txn_id"]: refund_api.get_refund(t["txn_id"]) for t in txns if t}
    refunds = {k: v for k, v in refunds.items() if v}
    return {"transactions": txns, "tickets": tickets, "refunds": refunds}


async def execute_recon_sweep(run_id: str) -> None:
    run = RECON_RUNS[run_id]
    loop = asyncio.get_event_loop()
    gen = run_reconciliation_sweep(RECON_TXN_IDS)

    try:
        while True:
            event = await loop.run_in_executor(None, _next_or_none, gen)
            if event is None:
                break
            run["events"].append(event)
            run["state"] = _current_recon_state()
            if event["type"] == "done":
                run["done"] = True
            await asyncio.sleep(0.3)
    except Exception as e:
        run["events"].append({
            "seq": len(run["events"]) + 1,
            "type": "done",
            "tool": None,
            "args": None,
            "result": {"status": "error", "final_text": f"Reconciliation sweep failed: {e}"},
            "latency_ms": None,
            "blocked": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

    run["done"] = True


@app.post("/api/recon/run")
async def start_recon_sweep():
    run_id = uuid.uuid4().hex[:12]
    RECON_RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_recon_state(),
    }
    asyncio.create_task(execute_recon_sweep(run_id))
    return {"run_id": run_id}


@app.get("/api/recon/runs/{run_id}/events")
async def get_recon_events(run_id: str, since: int = 0):
    run = RECON_RUNS.get(run_id)
    if run is None:
        return {"events": [], "done": True, "state": {}}
    return {
        "events": run["events"][since:],
        "done": run["done"],
        "state": run["state"],
    }


def _current_merchant_state(merchant_id: str) -> dict:
    txns = merch_db.get_merchant_transactions(merchant_id, days_back=30)
    ticket = crm.get_ticket_for_customer(merchant_id)
    refunds = {t["mtxn_id"]: merchant_tools.get_merchant_refund(t["mtxn_id"]) for t in txns}
    refunds = {k: v for k, v in refunds.items() if v}
    return {"transactions": txns, "ticket": ticket, "refunds": refunds}


async def execute_merchant_sweep(run_id: str, merchant_id: str, mtxn_ids: list[str]) -> None:
    run = MERCHANT_RUNS[run_id]
    loop = asyncio.get_event_loop()
    gen = run_merchant_sweep(merchant_id, mtxn_ids)

    try:
        while True:
            event = await loop.run_in_executor(None, _next_or_none, gen)
            if event is None:
                break
            run["events"].append(event)
            run["state"] = _current_merchant_state(merchant_id)
            if event["type"] == "done":
                run["done"] = True
            await asyncio.sleep(0.3)
    except Exception as e:
        run["events"].append({
            "seq": len(run["events"]) + 1,
            "type": "done",
            "tool": None,
            "args": None,
            "result": {"status": "error", "final_text": f"Merchant sweep failed: {e}"},
            "latency_ms": None,
            "blocked": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

    run["done"] = True


@app.post("/api/merchant/{merchant_id}/sweep")
async def start_merchant_sweep(merchant_id: str):
    if merch_db.get_merchant(merchant_id) is None:
        return {"error": f"Unknown merchant_id: {merchant_id}"}

    mtxn_ids = MERCHANT_SWEEP_TXN_IDS.get(merchant_id, [t["mtxn_id"] for t in merch_db.get_merchant_transactions(merchant_id, days_back=30)])
    run_id = uuid.uuid4().hex[:12]
    MERCHANT_RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_merchant_state(merchant_id),
    }
    asyncio.create_task(execute_merchant_sweep(run_id, merchant_id, mtxn_ids))
    return {"run_id": run_id}


@app.get("/api/merchant/sweep/{run_id}/events")
async def get_merchant_sweep_events(run_id: str, since: int = 0):
    run = MERCHANT_RUNS.get(run_id)
    if run is None:
        return {"events": [], "done": True, "state": {}}
    return {"events": run["events"][since:], "done": run["done"], "state": run["state"]}


async def execute_merchant_query(run_id: str, merchant_id: str, ticket_id: str, question: str) -> None:
    run = MERCHANT_QUERY_RUNS[run_id]
    loop = asyncio.get_event_loop()
    gen = run_merchant_query_events(merchant_id, ticket_id, question)

    try:
        while True:
            event = await loop.run_in_executor(None, _next_or_none, gen)
            if event is None:
                break
            run["events"].append(event)
            run["state"] = _current_merchant_state(merchant_id)
            if event["type"] == "done":
                run["done"] = True
            await asyncio.sleep(0.3)
    except Exception as e:
        run["events"].append({
            "seq": len(run["events"]) + 1,
            "type": "done",
            "tool": None,
            "args": None,
            "result": {"status": "error", "final_text": f"Merchant query failed: {e}"},
            "latency_ms": None,
            "blocked": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

    run["done"] = True


@app.post("/api/merchant/query")
async def start_merchant_query(req: MerchantQueryRequest):
    if merch_db.get_merchant(req.merchant_id) is None:
        return {"error": f"Unknown merchant_id: {req.merchant_id}"}

    ticket = crm.get_ticket_for_customer(req.merchant_id)
    ticket_id = ticket["ticket_id"] if ticket else None

    question = _append_attachment_context(req.question, req.attachments)

    run_id = uuid.uuid4().hex[:12]
    MERCHANT_QUERY_RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_merchant_state(req.merchant_id),
    }
    asyncio.create_task(execute_merchant_query(run_id, req.merchant_id, ticket_id, question))
    return {"run_id": run_id}


@app.get("/api/merchant/query/{run_id}/events")
async def get_merchant_query_events(run_id: str, since: int = 0):
    run = MERCHANT_QUERY_RUNS.get(run_id)
    if run is None:
        return {"events": [], "done": True, "state": {}}
    return {"events": run["events"][since:], "done": run["done"], "state": run["state"]}


@app.get("/api/merchant/list")
async def list_merchants():
    """All seeded merchants, for the UI's workspace picker."""
    return {"merchants": list(merch_db.MERCHANTS.values())}


@app.get("/api/merchant/{merchant_id}/state")
async def get_merchant_state(merchant_id: str):
    """Current snapshot of a merchant's transactions/ticket, without starting a sweep or query."""
    if merch_db.get_merchant(merchant_id) is None:
        return {"error": f"Unknown merchant_id: {merchant_id}"}
    return _current_merchant_state(merchant_id)


@app.get("/api/user/{customer_id}/brief")
async def user_brief(customer_id: str):
    return get_user_brief(customer_id)


@app.get("/api/business/{business_id}/brief")
async def business_brief(business_id: str):
    return get_business_brief(business_id)


@app.post("/api/run")
async def start_run(req: RunRequest):
    ticket = crm.get_ticket_for_customer(req.customer_id)
    ticket_id = ticket["ticket_id"] if ticket else None

    complaint = _append_attachment_context(req.complaint, req.attachments)

    run_id = uuid.uuid4().hex[:12]
    RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_state(req.customer_id, ticket_id),
    }
    asyncio.create_task(execute_agent(run_id, req.customer_id, ticket_id, complaint))
    return {"run_id": run_id}


@app.get("/api/runs/{run_id}/events")
async def get_events(run_id: str, since: int = 0):
    run = RUNS.get(run_id)
    if run is None:
        return {"events": [], "done": True, "state": {}}
    return {
        "events": run["events"][since:],
        "done": run["done"],
        "state": run["state"],
    }


@app.get("/api/escalations")
async def list_escalations():
    """Tickets currently sitting in the human escalation queue, newest first."""
    queue = crm.get_escalation_queue()
    enriched = []
    for ticket in queue:
        transactions = txn_db.get_customer_transactions(ticket["customer_id"], days_back=7)
        enriched.append({**ticket, "transactions": transactions})
    return {"queue": list(reversed(enriched))}


@app.post("/api/escalations/{ticket_id}/resolve")
async def resolve_escalation(ticket_id: str, req: ResolveEscalationRequest):
    try:
        ticket = crm.resolve_escalation(ticket_id, req.resolution_note)
    except ValueError as e:
        return {"error": str(e)}
    log_event("human", "resolve_escalation", {"ticket_id": ticket_id, "resolution_note": req.resolution_note})
    return {"ticket": ticket}


@app.post("/api/reset")
async def reset():
    reset_all_state()
    RUNS.clear()
    SALES_RUNS.clear()
    RECON_RUNS.clear()
    MERCHANT_RUNS.clear()
    MERCHANT_QUERY_RUNS.clear()
    return {"status": "reset"}


@app.get("/api/stats")
async def get_stats():
    """Aggregate measurable outcomes across all completed runs this session."""
    completed = [r for r in RUNS.values() if r["done"]]
    total = len(completed)

    if total == 0:
        return {
            "total_runs": 0,
            "resolved": 0,
            "escalated": 0,
            "errored": 0,
            "resolution_rate": None,
            "escalation_rate": None,
            "avg_steps": None,
            "avg_latency_ms": None,
            "avg_tool_calls": None,
            "guardrail_blocks": 0,
        }

    resolved = escalated = errored = 0
    total_steps = 0
    total_tool_calls = 0
    latencies: list[int] = []
    guardrail_blocks = 0

    for run in completed:
        events = run["events"]
        tool_calls_this_run = 0
        for ev in events:
            if ev["type"] in ("tool_call", "message_sent", "escalation"):
                tool_calls_this_run += 1
            if ev["type"] == "guardrail_block":
                guardrail_blocks += 1
                tool_calls_this_run += 1
            if ev["latency_ms"] is not None:
                latencies.append(ev["latency_ms"])
            if ev["type"] == "done":
                result = ev["result"] or {}
                total_steps += result.get("steps", 0)
                if result.get("status") == "error":
                    errored += 1
                elif any(e["type"] == "escalation" for e in events):
                    escalated += 1
                else:
                    resolved += 1
        total_tool_calls += tool_calls_this_run

    return {
        "total_runs": total,
        "resolved": resolved,
        "escalated": escalated,
        "errored": errored,
        "resolution_rate": round(resolved / total * 100, 1),
        "escalation_rate": round(escalated / total * 100, 1),
        "avg_steps": round(total_steps / total, 1),
        "avg_latency_ms": round(sum(latencies) / len(latencies)) if latencies else None,
        "avg_tool_calls": round(total_tool_calls / total, 1),
        "guardrail_blocks": guardrail_blocks,
    }


class ScamCheckRequest(BaseModel):
    message: str
    customer_id: str


class ScamActionRequest(BaseModel):
    customer_id: str
    message: str


@app.post("/api/scam-shield/check")
async def scam_shield_check(req: ScamCheckRequest):
    result = classify_message(req.message)
    log_event("agent", "scam_shield_check", {"customer_id": req.customer_id, "risk": result["risk_level"]})
    return result


@app.post("/api/scam-shield/block-payee")
async def scam_shield_block(req: ScamActionRequest):
    log_event("agent", "scam_shield_block_payee", {"customer_id": req.customer_id, "message": req.message[:200]})
    return {"status": "BLOCKED", "note": "Payee has been blocked (simulated)."}


@app.post("/api/scam-shield/report")
async def scam_shield_report(req: ScamActionRequest):
    log_event("agent", "scam_shield_report", {"customer_id": req.customer_id, "message": req.message[:200]})
    return {"status": "REPORTED", "note": "Scam reported to DhanAI security team (simulated)."}


@app.get("/api/user/{customer_id}/proactive-scan")
async def proactive_scan(customer_id: str):
    return run_proactive_scan(customer_id)


@app.get("/api/policy/retrieve")
async def retrieve_policy_evidence(q: str = "", status: str = "", action: str = ""):
    """Local keyword-based policy retrieval."""
    keywords = [w for w in q.split() if w] if q else None
    actions = [a for a in action.split(",") if a] if action else None
    return {"policies": retrieve_policies(keywords=keywords, status=status or None, actions=actions)}


@app.get("/api/scam-shield/demos")
async def scam_demo_messages():
    return {"demos": get_demo_messages()}


@app.get("/api/runs/{run_id}/evidence")
async def get_run_evidence(run_id: str):
    """Policy evidence for a completed run's events."""
    run = RUNS.get(run_id)
    if run is None:
        return {"evidence": None}
    # find the primary txn status from events
    txn_status = None
    for ev in run["events"]:
        if ev.get("tool") == "get_customer_transactions" and ev.get("result"):
            try:
                import json
                data = json.loads(ev["result"]) if isinstance(ev["result"], str) else ev["result"]
                txns = data.get("transactions", [])
                if txns:
                    txn_status = txns[0].get("status")
            except Exception:
                pass
    evidence = get_evidence_for_resolution(run["events"], txn_status=txn_status)
    return {"evidence": evidence}


@app.get("/api/impact")
async def impact_metrics():
    """Return live DhanAI Impact metrics based on completed runs and audit logs."""
    return get_impact_metrics()


WEB_DIR = Path(__file__).resolve().parent.parent / "web"
app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
