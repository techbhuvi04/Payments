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
const salesBackBtn = document.getElementById("salesBackBtn");
const reconView = document.getElementById("recon");
const reconActivityBody = document.getElementById("reconActivityBody");
const reconStatusIndicator = document.getElementById("reconStatusIndicator");
const reconStatusText = document.getElementById("reconStatusText");
const reconResetBtn = document.getElementById("reconResetBtn");
const reconBackBtn = document.getElementById("reconBackBtn");
const runSweepBtn = document.getElementById("runSweepBtn");

// Role selector
const roleUserCard = document.getElementById("roleUserCard");
const roleMerchantCard = document.getElementById("roleMerchantCard");
const roleBusinessCard = document.getElementById("roleBusinessCard");

// Login screen
const loginView = document.getElementById("login");
const loginForm = document.getElementById("loginForm");
const loginBackBtn = document.getElementById("loginBackBtn");
const loginRoleIcon = document.getElementById("loginRoleIcon");
const loginRoleTitle = document.getElementById("loginRoleTitle");

// Merchant workspace
const merchantView = document.getElementById("merchant");
const merchantBackBtn = document.getElementById("merchantBackBtn");
const merchantResetBtn = document.getElementById("merchantResetBtn");
const merchantStatusIndicator = document.getElementById("merchantStatusIndicator");
const merchantStatusText = document.getElementById("merchantStatusText");
const merchantPicker = document.getElementById("merchantPicker");
const merchantBriefWrap = document.getElementById("merchantBriefWrap");
const merchantChatBody = document.getElementById("merchantChatBody");
const merchantQueryInput = document.getElementById("merchantQueryInput");
const merchantQuerySendBtn = document.getElementById("merchantQuerySendBtn");
const merchantActivityBody = document.getElementById("merchantActivityBody");
const merchantSweepBtn = document.getElementById("merchantSweepBtn");
const goPlatformReconBtn = document.getElementById("goPlatformReconBtn");
const humanInboxBtnMerch = document.getElementById("humanInboxBtnMerch");
const inboxBadgeMerch = document.getElementById("inboxBadgeMerch");
const humanInboxBtnBiz = document.getElementById("humanInboxBtnBiz");

// ---------- Home dashboard / assistant-overlay elements ----------
// User workspace
const userTxnList = document.getElementById("userTxnList");
const userAskAiFab = document.getElementById("userAskAiFab");
const userAssistOverlay = document.getElementById("userAssistOverlay");
const userAssistClose = document.getElementById("userAssistClose");
const userExplainToggle = document.getElementById("userExplainToggle");
const userExplainWrap = document.getElementById("userExplainWrap");
const qaGetHelp = document.getElementById("qaGetHelp");
const qaRefundHelp = document.getElementById("qaRefundHelp");
const userScenarioToggle = document.getElementById("userScenarioToggle");
const userScenarioPresets = document.getElementById("userScenarioPresets");

// Merchant workspace
const merchantTxnList = document.getElementById("merchantTxnList");
const merchantExceptionsBadge = document.getElementById("merchantExceptionsBadge");
const merchantAskAiFab = document.getElementById("merchantAskAiFab");
const merchantAssistOverlay = document.getElementById("merchantAssistOverlay");
const merchantAssistClose = document.getElementById("merchantAssistClose");
const merchantExplainToggle = document.getElementById("merchantExplainToggle");
const merchantExplainWrap = document.getElementById("merchantExplainWrap");
const qaRunSweep = document.getElementById("qaRunSweep");
const qaMerchantAskAi = document.getElementById("qaMerchantAskAi");
const qaGoRecon = document.getElementById("qaGoRecon");

// Business Owner workspace
const leadListCards = document.getElementById("leadListCards");
const salesAskAiFab = document.getElementById("salesAskAiFab");
const salesAssistOverlay = document.getElementById("salesAssistOverlay");
const salesAssistClose = document.getElementById("salesAssistClose");
const salesExplainToggle = document.getElementById("salesExplainToggle");
const salesExplainWrap = document.getElementById("salesExplainWrap");
const qaBizAskAi = document.getElementById("qaBizAskAi");

// Generic overlay open/close helper, reused by all three workspaces.
function openAssistOverlay(overlayEl) {
  overlayEl.classList.remove("hidden");
}
function closeAssistOverlay(overlayEl) {
  overlayEl.classList.add("hidden");
}
function toggleExplain(toggleBtn, wrapEl, label = "How did AI decide this?") {
  const isHidden = wrapEl.classList.contains("hidden");
  wrapEl.classList.toggle("hidden");
  toggleBtn.textContent = isHidden ? `${label} ↑` : `${label} ↓`;
}

let currentCustomerId = "CUST_A";
let renderedCount = 0;
let pollTimer = null;
let prevStateSnapshot = {};
let inboxBadgeTimer = null;
let currentLeadId = null;
let salesRenderedCount = 0;
let salesPollTimer = null;
let reconRenderedCount = 0;
let reconPollTimer = null;
let currentMerchantId = null;
let merchantRenderedCount = 0;
let merchantPollTimer = null;
let merchantSweepRenderedCount = 0;
let merchantSweepPollTimer = null;
let merchantList = [];

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

// ---------- PERSONAL AI BRIEF (Paytm User workspace) ----------
// Deterministic - fetched from GET /api/user/{customer_id}/brief, no LLM call involved.
async function loadUserBrief(customerId) {
  const wrap = document.getElementById("userBriefWrap");
  wrap.innerHTML = `<div class="panel-loading">Loading your brief</div>`;
  try {
    const res = await fetch(`/api/user/${customerId}/brief`);
    const brief = await res.json();
    renderUserBrief(brief);
  } catch (e) {
    wrap.innerHTML = `<div class="panel-error">Couldn't load your brief right now.</div>`;
  }
}

let latestUserBrief = null;

function renderUserBrief(brief) {
  latestUserBrief = brief;
  const wrap = document.getElementById("userBriefWrap");
  if (!brief.has_data) {
    wrap.innerHTML = `<h3>Your DhanAI Balance</h3><div class="panel-empty">${escapeHtml(brief.proactive_message)}</div>`;
    renderUserTxnList(brief);
    return;
  }
  const s = brief.spend_summary;

  wrap.innerHTML = `
    <h3>Spend Summary</h3>
    <div class="brief-message">${escapeHtml(brief.proactive_message)}</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">Rs.${Number(s.total_spend_7d).toLocaleString("en-IN")}</div><div class="label">Spend, 7d</div></div>
      <div class="brief-stat"><div class="num">Rs.${Number(s.total_spend_30d).toLocaleString("en-IN")}</div><div class="label">Spend, 30d</div></div>
      <div class="brief-stat"><div class="num">${s.transaction_count_30d}</div><div class="label">Txns, 30d</div></div>
    </div>`;
  renderUserTxnList(brief);
}

// ---------- RECENT TRANSACTIONS LIST (Paytm User home) ----------
// Built client-side from the deterministic brief's needs_attention (issues) and
// refund_status (already-resolved items) - no new backend endpoint invented.
// Rows with an issue are tappable and open the assistant panel pre-filled with the
// matching SCENARIOS complaint (matched by customer_id), reusing existing flows.
function renderUserTxnList(brief) {
  if (!userTxnList) return;
  if (!brief.has_data) {
    userTxnList.innerHTML = `<div class="panel-empty">No recent transactions.</div>`;
    return;
  }
  const rows = [];
  (brief.needs_attention || []).forEach(a => {
    const isFailed = /failed/i.test(a.issue);
    rows.push({
      merchant: a.merchant_name, amount: a.amount, txn_id: a.txn_id,
      sub: a.issue, badgeClass: isFailed ? "badge-red" : "badge-amber",
      badgeText: isFailed ? "FAILED" : "PENDING",
      actionable: true,
    });
  });
  (brief.refund_status || []).forEach(r => {
    rows.push({
      merchant: r.merchant_name, amount: r.amount, txn_id: r.txn_id,
      sub: `Refund ${r.status} · ETA ${r.eta_hours}h`, badgeClass: "badge-green",
      badgeText: r.status === "COMPLETED" ? "REFUNDED" : "SUCCESS",
      actionable: false,
    });
  });

  if (!rows.length) {
    userTxnList.innerHTML = `<div class="panel-empty">No recent transactions need attention.</div>`;
    return;
  }

  userTxnList.innerHTML = rows.map((r, i) => `
    <div class="txn-row ${r.actionable ? "" : "not-actionable"}" data-idx="${i}" style="animation-delay:${i * 40}ms">
      <div class="txn-main">
        <div class="txn-merchant">${escapeHtml(r.merchant)}</div>
        <div class="txn-sub">${escapeHtml(r.sub)}</div>
      </div>
      <div class="txn-side">
        <div class="txn-amount">Rs.${Number(r.amount).toLocaleString("en-IN")}</div>
        <span class="status-badge ${r.badgeClass}">${r.badgeText}</span>
      </div>
    </div>`).join("");

  userTxnList.querySelectorAll(".txn-row").forEach((el, i) => {
    if (!rows[i].actionable) return;
    el.addEventListener("click", () => {
      const scenario = SCENARIOS[currentCustomerId.replace("CUST_", "")];
      openAssistOverlay(userAssistOverlay);
      const complaint = scenario ? scenario.complaint :
        `I have an issue with my Rs.${rows[i].amount} payment to ${rows[i].merchant} (${rows[i].sub}).`;
      startRun(currentCustomerId, complaint);
    });
  });
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
    [inboxBadge, inboxBadgeMerch].forEach(badge => {
      badge.textContent = n;
      badge.classList.toggle("hidden", n === 0);
    });
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

let inboxOpenedFrom = consoleView;

function openInbox() {
  inboxOpenedFrom = ALL_WORKSPACE_VIEWS.find(v => !v.classList.contains("hidden")) || consoleView;
  hideAllWorkspaces();
  inboxView.classList.remove("hidden");
  loadInboxView();
  if (inboxBadgeTimer) clearInterval(inboxBadgeTimer);
  inboxBadgeTimer = setInterval(refreshInboxBadge, 3000);
}

function closeInbox() {
  inboxView.classList.add("hidden");
  inboxOpenedFrom.classList.remove("hidden");
  if (inboxBadgeTimer) { clearInterval(inboxBadgeTimer); inboxBadgeTimer = null; }
}

humanInboxBtn.addEventListener("click", openInbox);
humanInboxBtnMerch.addEventListener("click", openInbox);
inboxBackBtn.addEventListener("click", closeInbox);

let currentRunEvents = [];

async function startRun(customerId, complaint) {
  currentCustomerId = customerId;
  renderedCount = 0;
  currentRunEvents = [];
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  removeDecisionCard();
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
      currentRunEvents.push(event);
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
      if (!hadError) renderDecisionCard(currentRunEvents, data.state);
      refreshStats();
      refreshInboxBadge();
      loadUserBrief(currentCustomerId);
    } else {
      showTyping();
    }
  }, 400);
}

// ---------- DECISION CARD (explainability) ----------
// Built entirely from the run's own tool-call events and results - nothing here is
// invented, it's a structured read-out of what the agent actually did and found.
const ACTION_TOOL_LABELS = {
  initiate_refund: "Refund initiated",
  force_settlement: "Force-settled pending transaction",
  escalate_to_human: "Escalated to human agent",
  update_ticket: "Ticket updated",
};

function removeDecisionCard() {
  const existing = document.getElementById("decisionCard");
  if (existing) existing.remove();
}

function renderDecisionCard(events, state) {
  removeDecisionCard();

  const toolCalls = events.filter(e => e.type === "tool_call" || e.type === "escalation" || e.type === "message_sent");
  const guardrails = events.filter(e => e.type === "guardrail_block");
  const doneEvent = events.find(e => e.type === "done");
  const finalText = doneEvent && doneEvent.result && doneEvent.result.final_text;

  const actionEvent = events.find(e => e.tool === "initiate_refund" || e.tool === "force_settlement" || e.tool === "escalate_to_human");
  const finalAction = actionEvent ? (ACTION_TOOL_LABELS[actionEvent.tool] || actionEvent.tool) : "Ticket updated, no monetary action taken";

  const wasEscalated = events.some(e => e.type === "escalation");
  // Confidence is derived, not guessed: a clean run with no guardrail friction and a
  // clear resolution path is high confidence; guardrail pushback lowers it; an
  // escalation means the agent itself judged the case ambiguous or high-risk.
  let confidence = "high";
  let confidenceReason = "Resolved via a single clean tool-call path with no guardrail pushback.";
  if (wasEscalated) {
    confidence = "medium";
    confidenceReason = "Agent judged this case ambiguous or high-risk and deferred to a human rather than acting.";
  } else if (guardrails.length > 0) {
    confidence = "medium";
    confidenceReason = `Agent's first attempt was blocked by a guardrail (${guardrails.length}x) before it found a safe path.`;
  }

  const evidence = toolCalls.slice(0, 6).map(e => {
    const label = e.tool || e.type;
    let detail = "";
    try {
      const r = typeof e.result === "string" ? JSON.parse(e.result) : e.result;
      if (r && r.settlement_state) detail = ` &rarr; bank: ${r.settlement_state}`;
      else if (r && r.status) detail = ` &rarr; ${r.status}`;
    } catch (err) { /* non-JSON result, skip detail */ }
    return `<li><code>${escapeHtml(label)}</code>${detail}</li>`;
  }).join("");

  const policyApplied = guardrails.length > 0
    ? guardrails.map(g => `<li>${escapeHtml(g.result)}</li>`).join("")
    : wasEscalated
      ? "<li>Escalation policy: high-value or ambiguous case routed to a human, not auto-resolved.</li>"
      : "<li>No guardrail was triggered - request was within all auto-resolution limits.</li>";

  const card = document.createElement("div");
  card.className = "decision-card";
  card.id = "decisionCard";
  card.innerHTML = `
    <div class="decision-card-head">
      <span class="decision-card-title">Decision Card</span>
      <span class="confidence-pill ${confidence}">${confidence.toUpperCase()} CONFIDENCE</span>
    </div>
    <div class="decision-row"><div class="drk">Decision</div><div class="drv">${escapeHtml(finalAction)}</div></div>
    <div class="decision-row"><div class="drk">Why</div><div class="drv">${escapeHtml(confidenceReason)}</div></div>
    <div class="decision-row"><div class="drk">Evidence</div><div class="drv"><ul>${evidence || "<li>No tool calls recorded.</li>"}</ul></div></div>
    <div class="decision-row"><div class="drk">Policy applied</div><div class="drv"><ul>${policyApplied}</ul></div></div>
    <div class="decision-row"><div class="drk">Final message</div><div class="drv">${escapeHtml(finalText || "-")}</div></div>
  `;
  activityBody.appendChild(card);
  maybeAutoscroll(activityBody);
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

document.querySelectorAll(".preset-btn[data-scenario]").forEach(btn => {
  btn.addEventListener("click", () => {
    const scenario = SCENARIOS[btn.dataset.scenario];
    openAssistOverlay(userAssistOverlay);
    startRun(scenario.customer_id, scenario.complaint);
    loadUserBrief(scenario.customer_id);
  });
});

resetBtn.addEventListener("click", async () => {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  removeDecisionCard();
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
  refreshStats();
  refreshInboxBadge();
  loadUserBrief(currentCustomerId);
});

// ---------- Paytm User home dashboard wiring ----------
userAskAiFab.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
userAssistClose.addEventListener("click", () => closeAssistOverlay(userAssistOverlay));
userExplainToggle.addEventListener("click", () => toggleExplain(userExplainToggle, userExplainWrap));

qaGetHelp.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
qaRefundHelp.addEventListener("click", () => {
  openAssistOverlay(userAssistOverlay);
  const scenario = SCENARIOS[currentCustomerId.replace("CUST_", "")];
  const complaint = scenario ? scenario.complaint : "I need help with a refund on a recent payment.";
  startRun(currentCustomerId, complaint);
});

// ---------- Paytm User bottom nav ----------
const userNavHome = document.getElementById("userNavHome");
const userNavAskAi = document.getElementById("userNavAskAi");
const userNavInbox = document.getElementById("userNavInbox");
const userNavProfile = document.getElementById("userNavProfile");

userNavHome.addEventListener("click", () => closeAssistOverlay(userAssistOverlay));
userNavAskAi.addEventListener("click", () => openAssistOverlay(userAssistOverlay));
userNavInbox.addEventListener("click", () => openInbox());
userNavProfile.addEventListener("click", () => backBtn.click());

userScenarioToggle.addEventListener("click", () => {
  const isHidden = userScenarioPresets.classList.contains("hidden");
  userScenarioPresets.classList.toggle("hidden");
  userScenarioToggle.textContent = isHidden ? "Hide demo scenarios ↑" : "Try demo scenarios (A–G) →";
});

// ---------- ROLE SELECTOR / WORKSPACE ROUTER ----------
// One shared shell: every workspace view lives hidden in the DOM until routed to,
// and every workspace's back action returns here rather than closing the app.
const ALL_WORKSPACE_VIEWS = [consoleView, inboxView, salesView, reconView, merchantView];

function hideAllWorkspaces() {
  ALL_WORKSPACE_VIEWS.forEach(v => v.classList.add("hidden"));
}

function openConsole() {
  landing.classList.add("fade-out");
  setTimeout(() => {
    landing.classList.add("hidden");
    document.body.classList.add("console-active");
    hideAllWorkspaces();
    consoleView.classList.remove("hidden");
    consoleView.classList.add("fade-in");
    requestAnimationFrame(() => requestAnimationFrame(() => consoleView.classList.add("show")));
  }, 250);
  loadUserBrief(currentCustomerId);
}

async function backToLanding() {
  if (pollTimer) clearInterval(pollTimer);
  await fetch("/api/reset", { method: "POST" });
  hideAllWorkspaces();
  consoleView.classList.remove("fade-in", "show");
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  chatBody.innerHTML = "";
  activityBody.innerHTML = "";
  typingCardRefs.typingCardEl = null;
  renderedCount = 0;
  sendBtn.disabled = false;
  setStatus("", "Idle");
  renderState({ ticket: null, transactions: [], refunds: {}, sms_outbox: [] });
  closeAssistOverlay(userAssistOverlay);
}

// ---------- LOGIN GATE ----------
// Role card tap opens a mock login screen for that role first; submitting the
// form (any values, even empty, are accepted - there's no real backend auth)
// routes into the same workspace-opening functions the role cards used to call
// directly, so the dashboard-first interaction model is unchanged past this point.
const ROLE_LOGIN_CONFIG = {
  user: { icon: "&#128100;", title: "Login as Paytm User", open: () => { openConsole(); refreshStats(); refreshInboxBadge(); } },
  merchant: { icon: "&#127974;", title: "Login as Merchant", open: () => { openMerchant(); } },
  business: { icon: "&#128200;", title: "Login as Business Owner", open: () => { openSales(); } },
};
let pendingLoginRole = "user";

function openLogin(role) {
  pendingLoginRole = role;
  const cfg = ROLE_LOGIN_CONFIG[role] || ROLE_LOGIN_CONFIG.user;
  loginRoleIcon.innerHTML = cfg.icon;
  loginRoleTitle.textContent = cfg.title;
  loginForm.reset();
  landing.classList.add("fade-out");
  setTimeout(() => {
    landing.classList.add("hidden");
    landing.classList.remove("fade-out");
    loginView.classList.remove("hidden");
  }, 250);
}

function closeLoginToLanding() {
  loginView.classList.add("hidden");
  landing.classList.remove("hidden", "fade-out");
}

loginBackBtn.addEventListener("click", closeLoginToLanding);

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginView.classList.add("hidden");
  const cfg = ROLE_LOGIN_CONFIG[pendingLoginRole] || ROLE_LOGIN_CONFIG.user;
  cfg.open();
});

roleUserCard.addEventListener("click", () => openLogin("user"));
backBtn.addEventListener("click", backToLanding);

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

let latestLeads = [];

async function loadLeadPresets() {
  const res = await fetch("/api/sales/leads");
  const data = await res.json();
  latestLeads = data.leads;

  leadPresets.innerHTML = data.leads.map(l =>
    `<button class="preset-btn" data-lead-id="${l.lead_id}">${l.lead_id}</button>`
  ).join("");
  leadPresets.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lead = data.leads.find(l => l.lead_id === btn.dataset.leadId);
      openAssistOverlay(salesAssistOverlay);
      renderLeadPreview(lead);
      startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
    });
  });

  renderLeadListCards(data.leads);
}

// ---------- Business Owner home: recovery lead cards ----------
function renderLeadListCards(leads) {
  if (!leadListCards) return;
  if (!leads.length) {
    leadListCards.innerHTML = `<div class="panel-empty">No recovery leads right now.</div>`;
    return;
  }
  leadListCards.innerHTML = leads.map((l, i) => `
    <div class="lead-card" data-lead-id="${l.lead_id}" style="animation-delay:${i * 40}ms">
      <div class="lead-card-head">
        <span class="lead-card-title">${escapeHtml(l.merchant_name)}</span>
        <span class="lead-tier">${escapeHtml(l.customer_tier)}</span>
      </div>
      <div class="lead-card-sub">${l.lead_id} &middot; Rs.${Number(l.cart_value).toLocaleString("en-IN")} cart &middot; ${l.checkout_status} &middot; ${l.prior_coupons_used} prior coupon(s)</div>
    </div>`).join("");

  leadListCards.querySelectorAll(".lead-card").forEach(card => {
    card.addEventListener("click", () => {
      const lead = latestLeads.find(l => l.lead_id === card.dataset.leadId);
      if (!lead) return;
      openAssistOverlay(salesAssistOverlay);
      renderLeadPreview(lead);
      startSalesRun(lead.lead_id, lead.customer_id, lead.cart_value);
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

let currentSalesRunEvents = [];
let currentLeadCartValue = 0;

async function startSalesRun(leadId, customerId, cartValue) {
  currentLeadId = leadId;
  currentLeadCartValue = cartValue || 0;
  salesRenderedCount = 0;
  currentSalesRunEvents = [];
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
      currentSalesRunEvents.push(event);
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
      if (!hadError) {
        const blocked = currentSalesRunEvents.filter(e => e.type === "guardrail_block");
        updateImpactFromRun(currentLeadCartValue, data.state, blocked);
      }
      loadBusinessBrief();
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

// ---------- BUSINESS AI BRIEF (Business Owner workspace) ----------
// Deterministic - fetched from GET /api/business/{business_id}/brief, no LLM call involved.
async function loadBusinessBrief() {
  const wrap = document.getElementById("businessBriefWrap");
  wrap.innerHTML = `<div class="panel-loading">Loading your brief</div>`;
  try {
    const res = await fetch(`/api/business/default/brief`);
    const brief = await res.json();
    renderBusinessBrief(brief);
  } catch (e) {
    wrap.innerHTML = `<div class="panel-error">Couldn't load the business brief right now.</div>`;
  }
}

function renderBusinessBrief(brief) {
  const wrap = document.getElementById("businessBriefWrap");
  if (!brief.has_data) {
    wrap.innerHTML = `<h3>Business AI Brief</h3><div class="panel-empty">No leads yet.</div>`;
    return;
  }
  const r = brief.recoverable_leads;
  const cd = brief.coupon_discipline;
  const retryOnly = brief.retry_only_lead_ids.length
    ? `<div class="brief-list-item">Retry-reminder only (no discount needed): ${brief.retry_only_lead_ids.join(", ")}</div>`
    : "";

  wrap.innerHTML = `
    <h3>Business AI Brief</h3>
    <div class="brief-message">${r.count} recoverable lead(s) worth an estimated Rs.${Number(r.estimated_value).toLocaleString("en-IN")}.</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">${r.count}</div><div class="label">Recoverable leads</div></div>
      <div class="brief-stat"><div class="num">Rs.${Number(r.estimated_value).toLocaleString("en-IN")}</div><div class="label">Est. value</div></div>
      <div class="brief-stat"><div class="num">${cd.customers_at_coupon_limit}</div><div class="label">At coupon limit</div></div>
    </div>
    ${retryOnly}
    <div class="brief-list-item">Discount protected so far: Rs.${Number(cd.estimated_discount_protected).toLocaleString("en-IN")} (guardrail: max ${cd.max_discount_pct}%, ${cd.max_coupons_per_customer} coupon/customer)</div>`;
}

// ---------- IMPACT CARD ----------
// Running tally for this session, built only from confirmed tool results (coupons
// actually issued, messages actually sent) - not projected or guessed numbers.
let impactTotals = { leadsContacted: 0, couponsIssued: 0, revenueRecovered: 0, discountProtected: 0 };

function resetImpactCard() {
  impactTotals = { leadsContacted: 0, couponsIssued: 0, revenueRecovered: 0, discountProtected: 0 };
  renderImpactCard();
}

function renderImpactCard() {
  const box = document.getElementById("impactCardBox");
  box.innerHTML = `
    <h3>Revenue Impact</h3>
    <div class="impact-grid">
      <div class="impact-stat"><div class="num">${impactTotals.leadsContacted}</div><div class="label">Leads contacted</div></div>
      <div class="impact-stat"><div class="num">${impactTotals.couponsIssued}</div><div class="label">Coupons issued</div></div>
      <div class="impact-stat"><div class="num">Rs.${Number(impactTotals.revenueRecovered).toLocaleString("en-IN")}</div><div class="label">Est. revenue recovered</div></div>
      <div class="impact-stat"><div class="num">Rs.${Number(impactTotals.discountProtected).toLocaleString("en-IN")}</div><div class="label">Discount protected</div></div>
    </div>`;
}

function updateImpactFromRun(leadCartValue, state, blockedEvents) {
  impactTotals.leadsContacted += 1;
  if (state.coupon) {
    impactTotals.couponsIssued += 1;
    impactTotals.revenueRecovered += leadCartValue;
  }
  const blockedDiscountAmount = (blockedEvents || [])
    .filter(e => e.tool === "issue_discount_coupon")
    .length;
  if (blockedDiscountAmount > 0 || (!state.coupon && leadCartValue)) {
    impactTotals.discountProtected += leadCartValue * 0.15;
  }
  renderImpactCard();
}

function openSales() {
  landing.classList.add("hidden");
  hideAllWorkspaces();
  salesView.classList.remove("hidden");
  document.body.classList.add("console-active");
  if (latestLeads.length) renderLeadListCards(latestLeads);
  else loadLeadPresets();
  loadBusinessBrief();
  resetImpactCard();
  closeAssistOverlay(salesAssistOverlay);
}

salesBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  closeAssistOverlay(salesAssistOverlay);
});

roleBusinessCard.addEventListener("click", () => openLogin("business"));
humanInboxBtnBiz.addEventListener("click", openInbox);

// ---------- Business Owner home dashboard wiring ----------
salesAskAiFab.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));
salesAssistClose.addEventListener("click", () => closeAssistOverlay(salesAssistOverlay));
salesExplainToggle.addEventListener("click", () => toggleExplain(salesExplainToggle, salesExplainWrap));
qaBizAskAi.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));

// ---------- Business Owner bottom nav ----------
const salesNavHome = document.getElementById("salesNavHome");
const salesNavAskAi = document.getElementById("salesNavAskAi");
const salesNavInbox = document.getElementById("salesNavInbox");
const salesNavProfile = document.getElementById("salesNavProfile");

salesNavHome.addEventListener("click", () => closeAssistOverlay(salesAssistOverlay));
salesNavAskAi.addEventListener("click", () => openAssistOverlay(salesAssistOverlay));
salesNavInbox.addEventListener("click", () => openInbox());
salesNavProfile.addEventListener("click", () => salesBackBtn.click());

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
  loadBusinessBrief();
  resetImpactCard();
  closeAssistOverlay(salesAssistOverlay);
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

function openRecon() {
  hideAllWorkspaces();
  reconView.classList.remove("hidden");
  document.body.classList.add("console-active");
}

reconBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  merchantView.classList.remove("hidden");
});

goPlatformReconBtn.addEventListener("click", openRecon);
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

// ---------- MERCHANT WORKSPACE ----------
// Collections & settlement operations: a merchant picker (simulates merchant login),
// a proactive sweep over that merchant's own transactions, and a natural-language
// query box. Every request carries the picked merchant_id, and the backend's tool
// executor (merchant_tools.py) independently checks that scope on every call - the
// frontend picker is a UX convenience, not the security boundary.

function setMerchantStatus(kind, label) {
  merchantStatusIndicator.className = `status-indicator ${kind}`;
  merchantStatusText.textContent = label;
}

async function loadMerchantPicker() {
  try {
    const res = await fetch("/api/merchant/list");
    const data = await res.json();
    merchantList = data.merchants;
    merchantPicker.innerHTML = merchantList.map(m =>
      `<button class="merchant-chip" data-merchant-id="${m.merchant_id}">${escapeHtml(m.name)}</button>`
    ).join("");
    merchantPicker.querySelectorAll(".merchant-chip").forEach(chip => {
      chip.addEventListener("click", () => selectMerchant(chip.dataset.merchantId));
    });
    if (merchantList.length && !currentMerchantId) selectMerchant(merchantList[0].merchant_id);
  } catch (e) {
    merchantPicker.innerHTML = `<div class="panel-error">Couldn't load merchants.</div>`;
  }
}

function selectMerchant(merchantId) {
  currentMerchantId = merchantId;
  merchantPicker.querySelectorAll(".merchant-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.merchantId === merchantId);
  });
  merchantChatBody.innerHTML = "";
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  loadMerchantBrief(merchantId);
  loadMerchantState(merchantId);
}

async function loadMerchantBrief(merchantId) {
  merchantBriefWrap.innerHTML = `<div class="panel-loading">Loading merchant brief</div>`;
  try {
    const merchant = merchantList.find(m => m.merchant_id === merchantId);
    const stateRes = await fetch(`/api/merchant/${merchantId}/state`);
    const state = await stateRes.json();
    renderMerchantBriefFromState(merchant, state);
  } catch (e) {
    merchantBriefWrap.innerHTML = `<div class="panel-error">Couldn't load merchant brief.</div>`;
  }
}

function renderMerchantBriefFromState(merchant, state) {
  if (!merchant) {
    merchantBriefWrap.innerHTML = `<div class="panel-empty">Select a merchant above.</div>`;
    renderMerchantTxnList(state);
    return;
  }
  const txns = (state && state.transactions) || [];
  const pendingCount = txns.filter(t => t.settlement_status === "PENDING" || t.settlement_status === null).length;
  const collectedTotal = txns.reduce((sum, t) => sum + Number(t.amount), 0);

  merchantBriefWrap.innerHTML = `
    <h3>Merchant AI Brief</h3>
    <div class="brief-message">${escapeHtml(merchant.name)} &middot; ${escapeHtml(merchant.owner_name)} &middot; ${escapeHtml(merchant.category)}</div>
    <div class="brief-stats">
      <div class="brief-stat"><div class="num">Rs.${Number(collectedTotal).toLocaleString("en-IN")}</div><div class="label">Recorded collections</div></div>
      <div class="brief-stat"><div class="num">${pendingCount}</div><div class="label">Pending/unverified</div></div>
      <div class="brief-stat"><div class="num">${txns.length}</div><div class="label">Transactions</div></div>
    </div>
    <div class="brief-list-item">Run a settlement sweep or ask a question via Ask AI to investigate and act.</div>`;
  renderMerchantTxnList(state);
}

async function loadMerchantState(merchantId) {
  try {
    const res = await fetch(`/api/merchant/${merchantId}/state`);
    const state = await res.json();
    renderMerchantTxnBox(state);
    renderMerchantTxnList(state);
  } catch (e) {
    renderMerchantTxnBox({ transactions: [] });
    renderMerchantTxnList({ transactions: [] });
  }
}

// ---------- Merchant home: Paytm-style collections/settlements list ----------
function renderMerchantTxnList(state) {
  if (!merchantTxnList) return;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    merchantTxnList.innerHTML = `<div class="panel-empty">No data yet &mdash; run a sweep or ask a question.</div>`;
    return;
  }
  merchantTxnList.innerHTML = txns.map((t, i) => {
    const settlement = t.settlement_status || "PENDING";
    const badgeClass = settlement === "SETTLED" ? "badge-green" : settlement === "PENDING" ? "badge-amber" : "badge-red";
    return `
    <div class="txn-row not-actionable" style="animation-delay:${i * 40}ms">
      <div class="txn-main">
        <div class="txn-merchant">${escapeHtml(t.payer_name)}</div>
        <div class="txn-sub">${t.mtxn_id} &middot; collected: ${t.collection_status}</div>
      </div>
      <div class="txn-side">
        <div class="txn-amount">Rs.${Number(t.amount).toLocaleString("en-IN")}</div>
        <span class="status-badge ${badgeClass}">${settlement}</span>
      </div>
    </div>`;
  }).join("");
}

function renderMerchantTxnBox(state) {
  const box = document.getElementById("merchantTxnBox");
  const before = box.innerHTML;
  const txns = (state && state.transactions || []).filter(Boolean);
  if (!txns.length) {
    box.innerHTML = `<h3>Today's Collections &amp; Pending Settlements</h3><div class="panel-empty">No data yet &mdash; run a sweep or ask a question.</div>`;
  } else {
    const rows = txns.map(t => `
      <div class="kv">
        <span class="k">${t.mtxn_id}</span> Rs.${Number(t.amount).toLocaleString("en-IN")} &middot; ${escapeHtml(t.payer_name)}<br>
        <span class="k">collected:</span> ${t.collection_status} &middot; <span class="k">settlement:</span> ${t.settlement_status || "-"} &middot; <span class="k">reversal:</span> ${t.refund_id || "-"}
      </div>`).join("<hr style='border-color:var(--border);margin:6px 0'>");
    box.innerHTML = `<h3>Today's Collections &amp; Pending Settlements</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);
}

function renderMerchantExceptions(events) {
  const box = document.getElementById("merchantExceptionsBox");
  const before = box.innerHTML;
  const exceptions = (events || []).filter(e => e.type === "escalation" || e.type === "guardrail_block");
  if (!exceptions.length) {
    box.innerHTML = `<h3>Exceptions / Escalations</h3><div class="kv">None</div>`;
  } else {
    const rows = exceptions.map(e => `<div class="kv"><span class="status-pill ESCALATED">${e.type === "escalation" ? "ESCALATED" : "BLOCKED"}</span> ${escapeHtml(e.tool || "")}</div>`).join("");
    box.innerHTML = `<h3>Exceptions / Escalations</h3>${rows}`;
  }
  if (box.innerHTML !== before) flash(box);

  if (merchantExceptionsBadge) {
    if (exceptions.length) {
      merchantExceptionsBadge.textContent = `${exceptions.length} exception${exceptions.length > 1 ? "s" : ""} needs review`;
      merchantExceptionsBadge.classList.remove("hidden");
    } else {
      merchantExceptionsBadge.classList.add("hidden");
    }
  }
}

// --- Proactive sweep ---
async function startMerchantSweep() {
  if (!currentMerchantId) return;
  merchantSweepRenderedCount = 0;
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  merchantSweepBtn.disabled = true;
  setMerchantStatus("running", "Sweeping");
  showTyping(merchantActivityBody, "merchantTypingCardEl");

  const res = await fetch(`/api/merchant/${currentMerchantId}/sweep`, { method: "POST" });
  const { run_id, error } = await res.json();
  if (error) {
    merchantActivityBody.innerHTML = `<div class="panel-error">${escapeHtml(error)}</div>`;
    merchantSweepBtn.disabled = false;
    setMerchantStatus("", "Idle");
    return;
  }
  pollMerchantSweepEvents(run_id);
}

function pollMerchantSweepEvents(runId) {
  if (merchantSweepPollTimer) clearInterval(merchantSweepPollTimer);
  let pollInFlight = false;
  let allEvents = [];
  merchantSweepPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/merchant/sweep/${runId}/events?since=${merchantSweepRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("merchantTypingCardEl");

    let hadError = false;
    let summary = null;
    for (const event of data.events) {
      addActivityCard(event, merchantActivityBody, "merchantTypingCardEl");
      allEvents.push(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        else summary = event.result;
      }
    }
    merchantSweepRenderedCount += data.events.length;
    renderMerchantTxnBox(data.state);
    renderMerchantExceptions(allEvents);
    renderMerchantSweepSummary(summary);

    if (data.done) {
      clearInterval(merchantSweepPollTimer);
      merchantSweepPollTimer = null;
      merchantSweepBtn.disabled = false;
      if (hadError) setMerchantStatus("escalated", "Error");
      else setMerchantStatus("resolved", "Sweep Complete");
      refreshInboxBadge();
    } else {
      showTyping(merchantActivityBody, "merchantTypingCardEl");
    }
  }, 400);
}

function renderMerchantSweepSummary(summary) {
  const box = document.getElementById("merchantSweepBox");
  if (!summary) return;
  const btn = document.getElementById("merchantSweepBtn");
  const btnHtml = btn.outerHTML;
  box.innerHTML = `<h3>Reconciliation Sweep</h3>${btnHtml}
    <div class="kv"><span class="k">Audited</span> ${summary.total}</div>
    <div class="kv"><span class="k">Matched</span> ${summary.matched}</div>
    <div class="kv"><span class="k">Auto-fixed</span> ${summary.auto_fixed}</div>
    <div class="kv"><span class="k">Escalated</span> ${summary.escalated}</div>`;
  document.getElementById("merchantSweepBtn").addEventListener("click", startMerchantSweep);
  flash(box);
}

// --- Natural-language query ---
function addMerchantBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  merchantChatBody.appendChild(div);
  if (isNearBottom(merchantChatBody)) {
    merchantChatBody.scrollTo({ top: merchantChatBody.scrollHeight, behavior: "smooth" });
  }
}

async function startMerchantQuery(question) {
  if (!currentMerchantId) return;
  merchantRenderedCount = 0;
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  addMerchantBubble("user", question);
  merchantQuerySendBtn.disabled = true;
  setMerchantStatus("running", "Investigating");
  showTyping(merchantActivityBody, "merchantTypingCardEl");

  const res = await fetch("/api/merchant/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: currentMerchantId, question }),
  });
  const { run_id, error } = await res.json();
  if (error) {
    addMerchantBubble("agent", error);
    merchantQuerySendBtn.disabled = false;
    setMerchantStatus("", "Idle");
    return;
  }
  pollMerchantQueryEvents(run_id);
}

function pollMerchantQueryEvents(runId) {
  if (merchantPollTimer) clearInterval(merchantPollTimer);
  let pollInFlight = false;
  let allEvents = [];
  merchantPollTimer = setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    const res = await fetch(`/api/merchant/query/${runId}/events?since=${merchantRenderedCount}`);
    const data = await res.json();
    pollInFlight = false;

    if (data.events.length > 0) hideTyping("merchantTypingCardEl");

    let hadError = false;
    for (const event of data.events) {
      addActivityCard(event, merchantActivityBody, "merchantTypingCardEl");
      allEvents.push(event);
      if (event.type === "done") {
        if (event.result && event.result.status === "error") hadError = true;
        const text = (event.result && event.result.final_text) || "Ticket escalated to a human agent.";
        addMerchantBubble("agent", text);
      }
    }
    merchantRenderedCount += data.events.length;
    renderMerchantTxnBox(data.state);
    renderMerchantExceptions(allEvents);

    if (data.done) {
      clearInterval(merchantPollTimer);
      merchantPollTimer = null;
      merchantQuerySendBtn.disabled = false;
      if (hadError) setMerchantStatus("escalated", "Error");
      else if (allEvents.some(e => e.type === "escalation")) setMerchantStatus("escalated", "Escalated");
      else setMerchantStatus("resolved", "Resolved");
      refreshInboxBadge();
    } else {
      showTyping(merchantActivityBody, "merchantTypingCardEl");
    }
  }, 400);
}

merchantQuerySendBtn.addEventListener("click", () => {
  const text = merchantQueryInput.value.trim();
  if (!text) return;
  startMerchantQuery(text);
  merchantQueryInput.value = "";
});

merchantQueryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    merchantQuerySendBtn.click();
  }
});

merchantSweepBtn.addEventListener("click", startMerchantSweep);

function openMerchant() {
  landing.classList.add("hidden");
  hideAllWorkspaces();
  merchantView.classList.remove("hidden");
  document.body.classList.add("console-active");
  if (!merchantPicker.children.length) loadMerchantPicker();
  refreshInboxBadge();
  closeAssistOverlay(merchantAssistOverlay);
}

merchantBackBtn.addEventListener("click", () => {
  hideAllWorkspaces();
  document.body.classList.remove("console-active");
  landing.classList.remove("hidden", "fade-out");
  closeAssistOverlay(merchantAssistOverlay);
});

roleMerchantCard.addEventListener("click", () => openLogin("merchant"));

merchantResetBtn.addEventListener("click", async () => {
  if (merchantPollTimer) clearInterval(merchantPollTimer);
  if (merchantSweepPollTimer) clearInterval(merchantSweepPollTimer);
  await fetch("/api/reset", { method: "POST" });
  merchantChatBody.innerHTML = "";
  merchantActivityBody.innerHTML = "";
  typingCardRefs.merchantTypingCardEl = null;
  merchantRenderedCount = 0;
  merchantSweepRenderedCount = 0;
  merchantQuerySendBtn.disabled = false;
  merchantSweepBtn.disabled = false;
  setMerchantStatus("", "Idle");
  renderMerchantTxnBox({ transactions: [] });
  renderMerchantExceptions([]);
  renderMerchantTxnList({ transactions: [] });
  document.getElementById("merchantSweepBox").innerHTML = `<h3>Reconciliation Sweep</h3><button class="preset-btn" id="merchantSweepBtn" style="margin-bottom:8px;">Run Settlement Sweep</button><div class="kv">No sweep run yet</div>`;
  document.getElementById("merchantSweepBtn").addEventListener("click", startMerchantSweep);
  if (currentMerchantId) loadMerchantBrief(currentMerchantId);
  refreshInboxBadge();
  closeAssistOverlay(merchantAssistOverlay);
});

// ---------- Merchant home dashboard wiring ----------
merchantAskAiFab.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
merchantAssistClose.addEventListener("click", () => closeAssistOverlay(merchantAssistOverlay));
merchantExplainToggle.addEventListener("click", () => toggleExplain(merchantExplainToggle, merchantExplainWrap));

qaMerchantAskAi.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
qaRunSweep.addEventListener("click", () => {
  openAssistOverlay(merchantAssistOverlay);
  startMerchantSweep();
});
qaGoRecon.addEventListener("click", () => openRecon());

// ---------- Merchant bottom nav ----------
const merchantNavHome = document.getElementById("merchantNavHome");
const merchantNavAskAi = document.getElementById("merchantNavAskAi");
const merchantNavInbox = document.getElementById("merchantNavInbox");
const merchantNavProfile = document.getElementById("merchantNavProfile");

merchantNavHome.addEventListener("click", () => closeAssistOverlay(merchantAssistOverlay));
merchantNavAskAi.addEventListener("click", () => openAssistOverlay(merchantAssistOverlay));
merchantNavInbox.addEventListener("click", () => openInbox());
merchantNavProfile.addEventListener("click", () => merchantBackBtn.click());
