"""Hand-rolled sales win-back agent loop. Same architecture as agent.py, different domain."""
import json
import os
import time
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI
from sales_tools import SALES_TOOL_SCHEMAS, to_openai_tools, execute_sales_tool
from tools import GuardrailBlocked
from audit_log import log_event

load_dotenv(override=True)

GROQ_MODEL = "openai/gpt-oss-120b"
MAX_STEPS = 10

OPENAI_TOOLS = to_openai_tools(SALES_TOOL_SCHEMAS)

SYSTEM_PROMPT = """You are an autonomous sales teammate for Paytm, working abandoned-checkout and \
failed-payment leads to win back the sale.

You will receive a lead_id and customer_id. You must:
1. Look up the lead's cart value, checkout status, customer tier, and prior coupon history.
2. Decide the outreach:
   - New/first-time customer with an abandoned cart and no prior coupons -> offer a modest win-back \
discount (10-15%) to nudge conversion.
   - Payment FAILED (not abandoned) for a high-tier/repeat customer -> they already intended to buy, \
so just send a friendly retry nudge; do not offer a discount, it is not needed and wastes margin.
   - Customer already at or above the coupon limit -> do not offer another discount, send a plain \
retry nudge only.
3. Execute exactly one outreach path using the tools available.
4. Send the customer a message in simple Hinglish (Roman script, mix of Hindi and English) - \
a friendly nudge to complete their purchase, mentioning the coupon code if one was issued.
5. Update the lead status (CONTACTED, COUPON_OFFERED, or SKIPPED) with notes summarizing the decision.
6. Once the lead status is updated and the customer has been messaged, stop - do not call more tools \
than necessary. Your final reply (the plain-text message you write once you stop calling tools) is \
shown directly as the outcome summary - keep your internal reasoning in English but make sure the \
customer-facing message tool call itself is in Hinglish.

Guardrails (enforced in code - if a tool call is blocked, adjust your plan instead of retrying the \
same call):
- Discounts above 20% will be blocked.
- A second coupon for the same customer will be blocked - send a plain nudge instead.

Be decisive. Use the tools to gather evidence before deciding. Do not ask the user clarifying \
questions - act autonomously using the tools."""


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
        timeout=30.0,
        max_retries=2,
    )


def run_sales_agent_stream(lead_id: str, customer_id: str, verbose: bool = False):
    """Run the sales agent, yielding one event per tool call / final message."""
    client = _get_client()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"lead_id: {lead_id}\ncustomer_id: {customer_id}"},
    ]

    log_event("system", "lead_opened", {"lead_id": lead_id, "customer_id": customer_id})

    steps = 0
    while steps < MAX_STEPS:
        steps += 1
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=400,
            tools=OPENAI_TOOLS,
            messages=messages,
        )

        choice = response.choices[0].message
        messages.append(choice.model_dump(exclude_none=True))

        tool_calls = choice.tool_calls or []
        if not tool_calls:
            final_text = choice.content or ""
            if verbose:
                print(f"[sales-agent] final message: {final_text}")
            yield {"type": "final", "result": {"status": "done", "steps": steps, "final_text": final_text}}
            return

        for call in tool_calls:
            name = call.function.name
            try:
                tool_input = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            result_content, is_error, latency_ms = _run_tool(name, tool_input, verbose)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result_content})
            yield {
                "type": "tool_call",
                "name": name,
                "input": tool_input,
                "result": result_content,
                "is_error": is_error,
                "latency_ms": latency_ms,
            }

    log_event("system", "max_steps_exceeded", {"lead_id": lead_id})
    yield {"type": "final", "result": {"status": "force_stopped", "steps": steps}}


def run_sales_agent_events(lead_id: str, customer_id: str):
    """Run the sales agent, yielding events in the fixed API schema (same shape as agent.py)."""
    seq = 0

    def _emit(event_type: str, tool=None, args=None, result=None, latency_ms=None, blocked=False):
        nonlocal seq
        seq += 1
        return {
            "seq": seq, "type": event_type, "tool": tool, "args": args, "result": result,
            "latency_ms": latency_ms, "blocked": blocked,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }

    yield _emit("thinking", result="Reading lead and checking coupon eligibility...")

    for event in run_sales_agent_stream(lead_id, customer_id, verbose=False):
        if event["type"] == "tool_call":
            name = event["name"]
            if event["is_error"]:
                yield _emit("guardrail_block", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"], blocked=True)
            elif name == "send_winback_message":
                yield _emit("message_sent", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
            else:
                yield _emit("tool_call", tool=name, args=event["input"], result=event["result"], latency_ms=event["latency_ms"])
        elif event["type"] == "final":
            yield _emit("done", result=event["result"])


def _run_tool(name: str, tool_input: dict, verbose: bool) -> tuple[str, bool, int]:
    start = time.time()
    try:
        result = execute_sales_tool(name, tool_input)
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool] {name}({tool_input}) -> {result}  ({latency_ms}ms)")
        return json.dumps(result, default=str), False, latency_ms
    except GuardrailBlocked as e:
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool BLOCKED] {name}({tool_input}) -> {e}  ({latency_ms}ms)")
        return str(e), True, latency_ms
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        if verbose:
            print(f"[tool ERROR] {name}({tool_input}) -> {e}  ({latency_ms}ms)")
        return f"Error: {e}", True, latency_ms
