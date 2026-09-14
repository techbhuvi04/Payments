"""FastAPI backend. One process, one port: serves the API and the ./web static frontend."""
import asyncio
import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import run_agent_events
import mock_txn_db as txn_db
import mock_crm as crm
import mock_notifier as notifier
import mock_refund_api as refund_api
from reset_state import reset_all_state

app = FastAPI()

RUNS: dict[str, dict] = {}


class RunRequest(BaseModel):
    complaint: str
    customer_id: str


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


@app.post("/api/run")
async def start_run(req: RunRequest):
    ticket = crm.get_ticket_for_customer(req.customer_id)
    ticket_id = ticket["ticket_id"] if ticket else None

    run_id = uuid.uuid4().hex[:12]
    RUNS[run_id] = {
        "events": [],
        "done": False,
        "state": _current_state(req.customer_id, ticket_id),
    }
    asyncio.create_task(execute_agent(run_id, req.customer_id, ticket_id, req.complaint))
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


@app.post("/api/reset")
async def reset():
    reset_all_state()
    RUNS.clear()
    return {"status": "reset"}


app.mount("/", StaticFiles(directory="web", html=True), name="web")
