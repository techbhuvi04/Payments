const SCENARIOS = {
  A: { customer_id: "CUST_A", complaint: "I paid 2400 to Sharma Electronics yesterday, money is gone but shopkeeper says he didn't get it." },
  B: { customer_id: "CUST_B", complaint: "I paid 5600 to Verma Mobile Store 3 days ago and the payment is still stuck, please help." },
  C: { customer_id: "CUST_C", complaint: "I paid 850 to Gupta Kirana Store today, app shows it went through but I want confirmation the shop received it." },
  D: { customer_id: "CUST_D", complaint: "I paid 47000 to Singh Jewellers, money got deducted but transaction failed. This is the second time this is happening." },
  E: { customer_id: "CUST_E", complaint: "I paid 640 to Reddy Medical Store 4 hours ago, payment failed but amount was deducted from my account." },
  F: { customer_id: "CUST_F", complaint: "I paid 3200 to Iyer Textiles 10 hours ago, status still shows pending, please check." },
  G: { customer_id: "CUST_G", complaint: "I paid 31000 to Malhotra Furnishings, transaction failed but money was debited from my account." },
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
const inboxView = document.getElementById("inbox");
const inboxBody = document.getElementById("inboxBody");
const humanInboxBtn = document.getElementById("humanInboxBtn");
const inboxBackBtn = document.getElementById("inboxBackBtn");
const inboxBadge = document.getElementById("inboxBadge");
const salesView = document.getElementById("sales");
const leadPresets = document.getElementById("leadPresets");
const leadBody = document.getElementById("leadBody");
const salesActivityBody = document.getElementById("salesActivityBody");
const salesStatusIndicator = document.getElementById("salesStatusIndicator");
const salesStatusText = document.getElementById("salesStatusText");
const salesResetBtn = document.getElementById("salesResetBtn");
const openSalesBtn = document.getElementById("openSalesBtn");
const goSalesBtn = document.getElementById("goSalesBtn");
const salesBackBtn = document.getElementById("salesBackBtn");
const reconView = document.getElementById("recon");
const reconActivityBody = document.getElementById("reconActivityBody");
const reconStatusIndicator = document.getElementById("reconStatusIndicator");
const reconStatusText = document.getElementById("reconStatusText");
const reconResetBtn = document.getElementById("reconResetBtn");
const openReconBtn = document.getElementById("openReconBtn");
const goReconBtn = document.getElementById("goReconBtn");
const reconBackBtn = document.getElementById("reconBackBtn");
const runSweepBtn = document.getElementById("runSweepBtn");

let currentCustomerId = "CUST_A";
let renderedCount = 0;
let pollTimer = null;
let prevStateSnapshot = {};
let inboxBadgeTimer = null;
let currentLeadId = null;
let salesRenderedCount = 0;
let salesPollTimer = null;
let salesOpenedFrom = "landing";
let reconRenderedCount = 0;
let reconPollTimer = null;
let reconOpenedFrom = "landing";

function setStatus(kind, label) {
  statusIndicator.className = `status-indicator ${kind}`;
  statusText.textContent = label;
}

const typingCardRefs = {};

function showTyping(container = activityBody, cardRef = "typingCardEl") {
  if (typingCardRefs[cardRef]) return;
  const el = document.createElement("div");
  el.className = "typing-card";
  el.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  container.appendChild(el);
  typingCardRefs[cardRef] = el;
  maybeAutoscroll(container);
}

function hideTyping(cardRef = "typingCardEl") {
  const el = typingCardRefs[cardRef];
  if (el) {
    el.remove();
    typingCardRefs[cardRef] = null;
  }
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

function maybeAutoscroll(container = activityBody) {
  if (isNearBottom(container)) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
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

function addActivityCard(event, container = activityBody, cardRef = "typingCardEl") {
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

  const typingEl = typingCardRefs[cardRef];
  if (typingEl) {
    container.insertBefore(card, typingEl);
  } else {
    container.appendChild(card);
  }
  maybeAutoscroll(container);
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

async function refreshStats() {
  const box = document.getElementById("statsBox");
  const before = box.innerHTML;
  try {
    const res = await fetch("/api/stats");
    const s = await res.json();
    if (!s.total_runs) {
      box.innerHTML = `<h3>Session Outcomes</h3><div class="kv">No runs yet</div>`;
    } else {
      box.innerHTML = `<h3>Session Outcomes</h3>
        <div class="kv"><span class="k">Runs</span> ${s.total_runs}</div>
        <div class="kv"><span class="k">Resolved</span> ${s.resolved} (${s.resolution_rate}%)</div>
        <div class="kv"><span class="k">Escalated</span> ${s.escalated} (${s.escalation_rate}%)</div>
        <div class="kv"><span class="k">Guardrail blocks</span> ${s.guardrail_blocks}</div>
        <div class="kv"><span class="k">Avg steps</span> ${s.avg_steps}</div>
        <div class="kv"><span class="k">Avg tool latency</span> ${s.avg_latency_ms ?? "-"} ms</div>`;
    }
  } catch (e) {
    box.innerHTML = `<h3>Session Outcomes</h3><div class="kv">Unavailable</div>`;
  }
  if (box.innerHTML !== before) flash(box);
}

async function refreshInboxBadge() {
  try {
    const res = await fetch("/api/escalations");
    const data = await res.json();
    const n = data.queue.length;
    inboxBadge.textContent = n;
    inboxBadge.classList.toggle("hidden", n === 0);
  } catch (e) { /* badge is best-effort */ }
}

async function loadInboxView() {
  inboxBody.innerHTML = `<div class="inbox-empty">Loading escalation queue...</div>`;
  const res = await fetch("/api/escalations");
  const data = await res.json();
  renderInboxQueue(data.queue);
}

function renderInboxQueue(queue) {
  if (!queue.length) {
    inboxBody.innerHTML = `<div class="inbox-empty">No escalations waiting. The agent handles everything else on its own.</div>`;
    return;
  }
  inboxBody.innerHTML = queue.map(ticket => {
    const esc = ticket.escalation;
    const txnRows = (ticket.transactions || []).slice(0, 3).map(t =>
      `${t.txn_id}  ${escapeHtml(t.merchant_name)}  Rs.${t.amount.toLocaleString("en-IN")}  ${t.status}`
    ).join("\n") || "No recent transactions";
    return `
      <div class="esc-card" data-ticket-id="${ticket.ticket_id}">
        <div class="esc-card-head">
          <div>
            <div class="esc-card-title">${ticket.ticket_id} &middot; ${ticket.customer_id}</div>
            <div class="esc-card-sub">Handed off by the agent &mdash; awaiting human review</div>
          </div>
          <span class="status-pill ESCALATED">ESCALATED</span>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Why it was escalated</div>
          <div class="esc-field-value">${escapeHtml(esc.reason)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Agent's context summary</div>
          <div class="esc-field-value">${escapeHtml(esc.context_summary)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Suggested action</div>
          <div class="esc-field-value">${escapeHtml(esc.suggested_action)}</div>
        </div>
        <div class="esc-field">
          <div class="esc-field-label">Recent transactions</div>
          <div class="esc-txns">${escapeHtml(txnRows)}</div>
        </div>
        <div class="esc-resolve">
          <input type="text" placeholder="Resolution note (e.g. manually refunded after KYC check)..." />
          <button>Resolve</button>
        </div>
      </div>`;
  }).join("");

  inboxBody.querySelectorAll(".esc-card").forEach(card => {
    const ticketId = card.dataset.ticketId;
    const input = card.querySelector(".esc-resolve input");
    const btn = card.querySelector(".esc-resolve button");
    btn.addEventListener("click", async () => {
      const note = input.value.trim();
      if (!note) { input.focus(); return; }
      btn.disabled = true;
      await fetch(`/api/escalations/${ticketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_note: note }),
      });
      await loadInboxView();
      refreshInboxBadge();
      refreshStats();
    });
  });
}

function openInbox() {
  inboxView.classList.remove("hidden");
  consoleView.classList.add("hidden");
  loadInboxView();
  if (inboxBadgeTimer) clearInterval(inboxBadgeTimer);
  inboxBadgeTimer = setInterval(refreshInboxBadge, 3000);
}

function closeInbox() {
  inboxView.classList.add("hidden");
  consoleView.classList.remove("hidden");
  if (inboxBadgeTimer) { clearInterval(inboxBadgeTimer); inboxBadgeTimer = null; }
}

humanInboxBtn.addEventListener("click", openInbox);
inboxBackBtn.addEventListener("click", closeInbox);

async function startRun(customerId, complaint) {
  currentCustomerId = customerId;
  renderedCount = 0;
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
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
      refreshStats();
      refreshInboxBadge();
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
  typingCardRefs.typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
  refreshStats();
  refreshInboxBadge();
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
  typingCardRefs.typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
}

openConsoleBtn.addEventListener("click", () => { openConsole(); refreshStats(); refreshInboxBadge(); });
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

// ---------- SALES TEAMMATE ----------

function setSalesStatus(kind, label) {
  salesStatusIndicator.className = `status-indicator ${kind}`;
  salesStatusText.textContent = label;
}

async function loadLeadPresets() {
  const res = await fetch("/api/sales/leads");
  const data = await res.json();
  leadPresets.innerHTML = data.leads.map(l =>
    `<button class="preset-btn" data-lead-id="${l.lead_id}">${l.lead_id}</button>`
  ).join("");
  leadPresets.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lead = data.leads.find(l => l.lead_id === btn.dataset.leadId);
      renderLeadPreview(lead);
      startSalesRun(lead.lead_id, lead.customer_id);
    });
  });
}

function renderLeadPreview(lead) {
  leadBody.innerHTML = `
    <div class="bubble agent">
      <strong>${lead.lead_id}</strong> &middot; ${lead.customer_id} &middot; ${lead.customer_tier}<br>
      ${escapeHtml(lead.merchant_name)} &middot; Rs.${Number(lead.cart_value).toLocaleString("en-IN")}<br>
      Status: ${lead.checkout_status} &middot; Prior coupons: ${lead.prior_coupons_used}
    </div>`;
}

async function startSalesRun(leadId, customerId) {
  currentLeadId = leadId;
  salesRenderedCount = 0;
  salesActivityBody.innerHTML = "";
  typingCardRefs.salesTypingCardEl = null;
  setSalesStatus("running", "Running");
  showTyping(salesActivityBody, "salesTypingCardEl");

  const res = await fetch("/api/sales/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId, customer_id: customerId }),
  });
  const { run_id } = await res.json();
  pollSalesEvents(run_id);
}

function pollSalesEvents(runId) {
  if (salesPollTimer) clearInterval(salesPollTimer);
  let pollInFlight = false;
  salesPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/sales/runs/${runId}/events?since=${salesRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("salesTypingCardEl");

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event, salesActivityBody, "salesTypingCardEl");
      if (event.type === "done" && event.result && event.result.status === "error") hadError = true;
    }
    salesRenderedCount += data.events.length;
    renderSalesState(data.state);

    if (data.done) {
      clearInterval(salesPollTimer);
      salesPollTimer = null;
      const status = data.state.lead_record && data.state.lead_record.status;
      if (hadError) setSalesStatus("escalated", "Error");
      else if (status === "COUPON_OFFERED") setSalesStatus("resolved", "Coupon Offered");
      else setSalesStatus("resolved", "Contacted");
      refreshSalesStats();
    } else {
      showTyping(salesActivityBody, "salesTypingCardEl");
    }
  }, 400);
}

function renderSalesState(state) {
  const recordBox = document.getElementById("leadRecordBox");
  const beforeR = recordBox.innerHTML;
  if (!state.lead_record) {
    recordBox.innerHTML = `<h3>Lead Status</h3><div class="kv">No lead selected</div>`;
  } else {
    const notes = (state.lead_record.notes || []).map(n => `<div class="kv">&bull; ${escapeHtml(n)}</div>`).join("");
    recordBox.innerHTML = `<h3>Lead Status</h3>
      <div class="kv"><span class="k">${state.lead_record.lead_id}</span>
      <span class="status-pill ${state.lead_record.status}">${state.lead_record.status}</span></div>
      ${notes}`;
  }
  if (recordBox.innerHTML !== beforeR) flash(recordBox);

  const couponBox = document.getElementById("couponBox");
  const beforeC = couponBox.innerHTML;
  if (!state.coupon) {
    couponBox.innerHTML = `<h3>Coupon</h3><div class="kv">None issued</div>`;
  } else {
    couponBox.innerHTML = `<h3>Coupon</h3>
      <div class="kv"><span class="k">${state.coupon.coupon_code}</span> ${state.coupon.discount_pct}% off &middot; valid ${state.coupon.valid_hours}h</div>`;
  }
  if (couponBox.innerHTML !== beforeC) flash(couponBox);

  const smsBox = document.getElementById("salesSmsBox");
  const beforeS = smsBox.innerHTML;
  if (!state.sms_outbox || state.sms_outbox.length === 0) {
    smsBox.innerHTML = `<h3>SMS Outbox</h3><div class="kv">Empty</div>`;
  } else {
    smsBox.innerHTML = `<h3>SMS Outbox</h3>` + state.sms_outbox.map(m => `<div class="sms-item">${escapeHtml(m.message)}</div>`).join("");
  }
  if (smsBox.innerHTML !== beforeS) flash(smsBox);
}

function refreshSalesStats() {
  const box = document.getElementById("salesStatsBox");
  const before = box.innerHTML;
  box.innerHTML = `<h3>Session Outcomes</h3><div class="kv">Same agent architecture as Support &mdash; see Support console for aggregate resolution stats</div>`;
  if (box.innerHTML !== before) flash(box);
}

function openSales(from) {
  salesOpenedFrom = from;
  landing.classList.add("hidden");
  consoleView.classList.add("hidden");
  inboxView.classList.add("hidden");
  salesView.classList.remove("hidden");
  document.body.classList.add("console-active");
  if (!leadPresets.children.length) loadLeadPresets();
}

salesBackBtn.addEventListener("click", () => {
  salesView.classList.add("hidden");
  if (salesOpenedFrom === "console") {
    consoleView.classList.remove("hidden");
  } else {
    document.body.classList.remove("console-active");
    landing.classList.remove("hidden", "fade-out");
  }
});

openSalesBtn.addEventListener("click", () => openSales("landing"));
goSalesBtn.addEventListener("click", () => openSales("console"));

salesResetBtn.addEventListener("click", async () => {
  if (salesPollTimer) clearInterval(salesPollTimer);
  await fetch("/api/reset", { method: "POST" });
  leadBody.innerHTML = "";
  salesActivityBody.innerHTML = "";
  typingCardRefs.salesTypingCardEl = null;
  salesRenderedCount = 0;
  setSalesStatus("", "Idle");
  renderSalesState({ lead_record: null, coupon: null, sms_outbox: [] });
  loadLeadPresets();
});

// ---------- RECONCILIATION TEAMMATE ----------

function setReconStatus(kind, label) {
  reconStatusIndicator.className = `status-indicator ${kind}`;
  reconStatusText.textContent = label;
}

async function startReconSweep() {
  reconRenderedCount = 0;
  reconActivityBody.innerHTML = "";
  typingCardRefs.reconTypingCardEl = null;
  runSweepBtn.disabled = true;
  setReconStatus("running", "Sweeping");
  showTyping(reconActivityBody, "reconTypingCardEl");

  const res = await fetch("/api/recon/run", { method: "POST" });
  const { run_id } = await res.json();
  pollReconEvents(run_id);
}

function pollReconEvents(runId) {
  if (reconPollTimer) clearInterval(reconPollTimer);
  let pollInFlight = false;
  reconPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/recon/runs/${runId}/events?since=${reconRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("reconTypingCardEl");

    let hadError = false;
    let summary = null;
    for (const event of data.events) {
      addActivityCard(event, reconActivityBody, "reconTypingCardEl");
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        else summary = event.result;
      }
    }
    reconRenderedCount += data.events.length;
    renderReconState(data.state, summary);

    if (data.done) {
      clearInterval(reconPollTimer);
      reconPollTimer = null;
      runSweepBtn.disabled = false;
      if (hadError) setReconStatus("escalated", "Error");
      else setReconStatus("resolved", "Sweep Complete");
    } else {
      showTyping(reconActivityBody, "reconTypingCardEl");
    }
  }, 400);
}

function renderReconState(state, summary) {
  const summaryBox = document.getElementById("reconSummaryBox");
  const beforeS = summaryBox.innerHTML;
  if (summary) {
    summaryBox.innerHTML = `<h3>Last Sweep</h3>
      <div class="kv"><span class="k">Audited</span> ${summary.total}</div>
      <div class="kv"><span class="k">Matched</span> ${summary.matched}</div>
      <div class="kv"><span class="k">Auto-fixed</span> ${summary.auto_fixed}</div>
      <div class="kv"><span class="k">Escalated</span> ${summary.escalated}</div>`;
    if (summaryBox.innerHTML !== beforeS) flash(summaryBox);
  }

  const txnBox = document.getElementById("reconTxnBox");
  const beforeT = txnBox.innerHTML;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    txnBox.innerHTML = `<h3>Transactions Audited</h3><div class="kv">No data</div>`;
  } else {
    const rows = txns.map(t => `
      <div class="kv">
        <span class="k">${t.txn_id}</span> Rs.${Number(t.amount).toLocaleString("en-IN")} &middot; ${escapeHtml(t.merchant_name)}<br>
        <span class="k">internal:</span> ${t.status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"} &middot; <span class="k">refund:</span> ${t.refund_id || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    txnBox.innerHTML = `<h3>Transactions Audited</h3>${rows}`;
  }
  if (txnBox.innerHTML !== beforeT) flash(txnBox);
}

function openRecon(from) {
  reconOpenedFrom = from;
  landing.classList.add("hidden");
  consoleView.classList.add("hidden");
  inboxView.classList.add("hidden");
  salesView.classList.add("hidden");
  reconView.classList.remove("hidden");
  document.body.classList.add("console-active");
}

reconBackBtn.addEventListener("click", () => {
  reconView.classList.add("hidden");
  if (reconOpenedFrom === "console") {
    consoleView.classList.remove("hidden");
  } else {
    document.body.classList.remove("console-active");
    landing.classList.remove("hidden", "fade-out");
  }
});

openReconBtn.addEventListener("click", () => openRecon("landing"));
goReconBtn.addEventListener("click", () => openRecon("console"));
runSweepBtn.addEventListener("click", startReconSweep);

reconResetBtn.addEventListener("click", async () => {
  if (reconPollTimer) clearInterval(reconPollTimer);
  await fetch("/api/reset", { method: "POST" });
  reconActivityBody.innerHTML = "";
  typingCardRefs.reconTypingCardEl = null;
  reconRenderedCount = 0;
  runSweepBtn.disabled = false;
  setReconStatus("", "Idle");
  renderReconState({ transactions: [] }, null);
  document.getElementById("reconSummaryBox").innerHTML = `<h3>Last Sweep</h3><div class="kv">No sweep run yet</div>`;
});
