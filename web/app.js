const SCENARIOS = {
  A: { customer_id: "CUST_A", complaint: "I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it." },
  B: { customer_id: "CUST_B", complaint: "I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck, please help." },
  C: { customer_id: "CUST_C", complaint: "I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation the shop received it." },
  D: { customer_id: "CUST_D", complaint: "I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time this is happening." },
};

const chatBody = document.getElementById("chatBody");
const activityBody = document.getElementById("activityBody");
const complaintInput = document.getElementById("complaintInput");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const landing = document.getElementById("landing");
const consoleView = document.getElementById("console");
const openConsoleBtn = document.getElementById("openConsoleBtn");
const learnMoreBtn = document.getElementById("learnMoreBtn");
const backBtn = document.getElementById("backBtn");

let currentCustomerId = "CUST_A";
let renderedCount = 0;
let pollTimer = null;
let prevStateSnapshot = {};
let typingCardEl = null;

function setStatus(kind, label) {
  statusIndicator.className = `status-indicator ${kind}`;
  statusText.textContent = label;
}

function showTyping() {
  if (typingCardEl) return;
  typingCardEl = document.createElement("div");
  typingCardEl.className = "typing-card";
  typingCardEl.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  activityBody.appendChild(typingCardEl);
  maybeAutoscroll();
}

function hideTyping() {
  if (typingCardEl) {
    typingCardEl.remove();
    typingCardEl = null;
  }
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

function maybeAutoscroll() {
  if (isNearBottom(activityBody)) {
    activityBody.scrollTo({ top: activityBody.scrollHeight, behavior: "smooth" });
  }
}

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatBody.appendChild(div);
  if (isNearBottom(chatBody)) {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
}

function toolLabel(event) {
  if (event.type === "thinking") return "thinking";
  return event.tool || event.type;
}

function parseMaybeJson(obj) {
  if (typeof obj === "string") {
    try { return JSON.parse(obj); } catch { return obj; }
  }
  return obj;
}

function renderJson(obj, pretty) {
  const parsed = parseMaybeJson(obj);
  if (parsed === null || parsed === undefined) return "";
  if (typeof parsed === "string") return parsed;
  return JSON.stringify(parsed, null, pretty ? 2 : 0);
}

function addJsonBlock(parent, label, value) {
  const group = document.createElement("div");
  group.className = "card-json-group";

  const labelEl = document.createElement("div");
  labelEl.className = "card-json-label";
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const block = document.createElement("div");
  block.className = "card-json";
  block.textContent = renderJson(value, false);
  block.title = "Click to expand";
  block.addEventListener("click", () => {
    block.classList.toggle("expanded");
    block.textContent = renderJson(value, block.classList.contains("expanded"));
  });
  group.appendChild(block);

  parent.appendChild(group);
}

function addActivityCard(event) {
  const isError = event.type === "done" && event.result && event.result.status === "error";
  const card = document.createElement("div");
  card.className = `card ${isError ? "guardrail_block" : event.type}`;

  const head = document.createElement("div");
  head.className = "card-head";

  const tool = document.createElement("span");
  tool.className = "card-tool";
  tool.textContent = toolLabel(event);
  head.appendChild(tool);

  if (event.latency_ms !== null && event.latency_ms !== undefined) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${event.latency_ms}ms`;
    head.appendChild(badge);
  }
  card.appendChild(head);

  if (event.type === "thinking") {
    const p = document.createElement("div");
    p.textContent = event.result;
    card.appendChild(p);
  } else if (event.type === "done") {
    addJsonBlock(card, "result", event.result);
  } else {
    if (event.args) addJsonBlock(card, "args", event.args);
    addJsonBlock(card, "result", event.result);
  }

  if (typingCardEl) {
    activityBody.insertBefore(card, typingCardEl);
  } else {
    activityBody.appendChild(card);
  }
  maybeAutoscroll();
}

function flash(box) {
  box.querySelectorAll(".kv").forEach(row => {
    row.classList.add("flash");
    setTimeout(() => row.classList.remove("flash"), 600);
  });
}

function renderTicket(ticket) {
  const box = document.getElementById("ticketBox");
  const before = box.innerHTML;
  if (!ticket) {
    box.innerHTML = `<h3>Ticket</h3><div class="kv">No ticket yet</div>`;
  } else {
    const notes = (ticket.notes || []).map(n => `<div class="kv">&bull; ${escapeHtml(n)}</div>`).join("");
    box.innerHTML = `<h3>Ticket</h3>
      <div class="kv"><span class="k">${ticket.ticket_id}</span>
      <span class="status-pill ${ticket.status}">${ticket.status}</span></div>
      ${notes}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderTransactions(transactions) {
  const box = document.getElementById("txnBox");
  const before = box.innerHTML;
  if (!transactions || transactions.length === 0) {
    box.innerHTML = `<h3>Transactions</h3><div class="kv">No data</div>`;
  } else {
    const rows = transactions.map(t => `
      <div class="kv">
        <span class="k">${t.txn_id}</span> Rs.${Number(t.amount).toLocaleString()} &middot; ${escapeHtml(t.merchant_name)}<br>
        <span class="k">status:</span> ${t.status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    box.innerHTML = `<h3>Transactions</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderRefunds(refunds) {
  const box = document.getElementById("refundBox");
  const before = box.innerHTML;
  const entries = Object.values(refunds || {});
  if (entries.length === 0) {
    box.innerHTML = `<h3>Refunds</h3><div class="kv">None</div>`;
  } else {
    const rows = entries.map(r => `
      <div class="kv"><span class="k">${r.refund_id}</span> Rs.${Number(r.amount).toLocaleString()} &middot; ${r.status} &middot; ETA ${r.eta_hours}h</div>
    `).join("");
    box.innerHTML = `<h3>Refunds</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderSms(smsOutbox) {
  const box = document.getElementById("smsBox");
  const before = box.innerHTML;
  if (!smsOutbox || smsOutbox.length === 0) {
    box.innerHTML = `<h3>SMS Outbox</h3><div class="kv">Empty</div>`;
  } else {
    const rows = smsOutbox.map(m => `<div class="sms-item">${escapeHtml(m.message)}</div>`).join("");
    box.innerHTML = `<h3>SMS Outbox</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderState(state) {
  renderTicket(state.ticket);
  renderTransactions(state.transactions);
  renderRefunds(state.refunds);
  renderSms(state.sms_outbox);
}

async function startRun(customerId, complaint) {
  currentCustomerId = customerId;
  renderedCount = 0;
  activityBody.innerHTML = "";
  typingCardEl = null;
  addBubble("user", complaint);
  sendBtn.disabled = true;
  setStatus("running", "Running");
  showTyping();

  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ complaint, customer_id: customerId }),
  });
  const { run_id } = await res.json();
  pollEvents(run_id);
}

function pollEvents(runId) {
  if (pollTimer) clearInterval(pollTimer);
  let pollInFlight = false;
  pollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/runs/${runId}/events?since=${renderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping();

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        const text = (event.result && event.result.final_text) || "Ticket escalated to a human agent.";
        addBubble("agent", text);
      }
    }
    renderedCount += data.events.length;
    renderState(data.state);

    if (data.done) {
      clearInterval(pollTimer);
      pollTimer = null;
      sendBtn.disabled = false;
      const finalStatus = data.state.ticket && data.state.ticket.status;
      if (hadError) setStatus("escalated", "Error");
      else if (finalStatus === "ESCALATED") setStatus("escalated", "Escalated");
      else setStatus("resolved", "Resolved");
    } else {
      showTyping();
    }
  }, 400);
}

sendBtn.addEventListener("click", () => {
  const text = complaintInput.value.trim();
  if (!text) return;
  startRun(currentCustomerId, text);
  complaintInput.value = "";
});

complaintInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const scenario = SCENARIOS[btn.dataset.scenario];
    startRun(scenario.customer_id, scenario.complaint);
  });
});

resetBtn.addEventListener("click", async () => {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
});

function openConsole() {
  landing.classList.add("fade-out");
  backBtn.classList.remove("hidden");
  setTimeout(() => {
    landing.classList.add("hidden");
    document.body.classList.add("console-active");
    consoleView.classList.remove("hidden");
    consoleView.classList.add("fade-in");
    requestAnimationFrame(() => requestAnimationFrame(() => consoleView.classList.add("show")));
  }, 250);
}

async function backToLanding() {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  consoleView.classList.add("hidden");
  consoleView.classList.remove("fade-in", "show");
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  backBtn.classList.add("hidden");
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
}

openConsoleBtn.addEventListener("click", openConsole);
backBtn.addEventListener("click", backToLanding);
learnMoreBtn.addEventListener("click", () => {
  document.querySelector(".comparison").scrollIntoView({ behavior: "smooth" });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add("in-view"), i * 60);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
