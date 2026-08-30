import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { auth } from "./auth.js";
import { listenAllSubmissions } from "./db.js";
import { BOARDS } from "./data/boards.js";

/*
 * TEAM BOARD MODE
 * Main page is intentionally shared by one team:
 * - progress = completed activities by the whole team
 * - Bingo A/B/C = team completion for selected Week
 * - board cells = participant(s) who completed each activity
 * - activity log = every submission in the selected Bingo + Week
 *
 * FUTURE / GROWTH:
 * db.js::listenSubmissions() is intentionally retained for a future private
 * "My Progress" page. When multiple teams exist, introduce teamId and scope
 * this listener by teamId instead of exposing all teams.
 */

const state = { rows: [], user: null, lastVariant: null, lastWeek: null, unsubscribe: null, timer: null };
const $ = id => document.getElementById(id);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

function context() {
  return { variant: String(localStorage.getItem("itgh.variant") || "A").toUpperCase(), week: Number(localStorage.getItem("itgh.week") || 1) };
}

function currentRows() {
  const { variant, week } = context();
  return state.rows.filter(r => String(r.variant || "").toUpperCase() === variant && Number(r.week) === week);
}

function activityRows(rows) { return rows.filter(r => Number(r.challengeIndex) >= 0); }
function ownerLabel(row) { return String(row.userName || "Team member").trim() || "Team member"; }
function uniqueParticipants(rows) { return new Set(rows.map(r => r.userId).filter(Boolean)).size; }

function renderTeamProgress() {
  const board = BOARDS[context().variant] || [];
  const rows = activityRows(currentRows());
  const count = new Set(rows.map(r => Number(r.challengeIndex))).size;
  const pct = board.length ? Math.round(count / board.length * 100) : 0;

  $("progressText") && ($("progressText").textContent = `${count} / ${board.length}`);
  $("progressPct") && ($("progressPct").textContent = `${pct}%`);
  $("progressLabel") && ($("progressLabel").textContent = `${count} challenge completed by team`);
  $("progressFill") && ($("progressFill").style.width = `${pct}%`);

  const small = document.querySelector(".progress-card .progress-head small");
  if (small) small.textContent = "TEAM PROGRESS";

  const teamCard = document.querySelector(".team-card");
  if (teamCard) {
    let meta = teamCard.querySelector(".team-member-count");
    if (!meta) { meta = document.createElement("span"); meta.className = "team-member-count"; teamCard.appendChild(meta); }
    const participants = uniqueParticipants(rows);
    meta.textContent = `${participants} active participant${participants === 1 ? "" : "s"}`;
  }
}

function renderBingoSummary() {
  const container = $("bingoSelector");
  if (!container) return;
  const { week } = context();
  for (const variant of ["A", "B", "C"]) {
    const size = (BOARDS[variant] || []).length;
    const rows = activityRows(state.rows.filter(r => String(r.variant || "").toUpperCase() === variant && Number(r.week) === week));
    const count = new Set(rows.map(r => Number(r.challengeIndex))).size;
    const button = container.querySelector(`[data-v="${variant}"]`);
    if (!button) continue;
    let meta = button.querySelector(".team-bingo-meta");
    if (!meta) { meta = document.createElement("span"); meta.className = "team-bingo-meta"; button.appendChild(meta); }
    meta.textContent = `${count}/${size}`;
    meta.title = `Team progress: ${count} of ${size}`;
  }
}

function renderBoardOwners() {
  const grid = $("boardGrid");
  if (!grid) return;
  const rows = activityRows(currentRows());
  const byIndex = new Map();
  rows.forEach(row => {
    const index = Number(row.challengeIndex);
    if (!byIndex.has(index)) byIndex.set(index, []);
    byIndex.get(index).push(row);
  });

  grid.querySelectorAll(".cell").forEach(cell => {
    const index = Number(cell.dataset.index);
    const owners = byIndex.get(index) || [];
    let badge = cell.querySelector(".team-owner");
    if (!owners.length) { cell.classList.remove("team-done"); badge?.remove(); return; }
    cell.classList.add("team-done");
    if (!badge) { badge = document.createElement("span"); badge.className = "team-owner"; cell.appendChild(badge); }
    const names = [...new Set(owners.map(ownerLabel))];
    badge.textContent = `✓ ${names.slice(0, 2).join(" · ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
    badge.title = names.join(", ");
  });
}

function renderTeamRecord() {
  const body = $("recordsBody");
  if (!body) return;
  const rows = currentRows();
  body.innerHTML = rows.length ? rows.map((row, index) => `
    <tr class="team-record-row ${row.userId === state.user?.uid ? "is-me" : ""}">
      <td>${index + 1}</td>
      <td><b>${esc(row.challengeName || "Quiz ITGH")}</b><br><span style="color:var(--muted);font-size:8px">${esc(row.achievement || "")}</span></td>
      <td>${esc(row.target || "—")}</td>
      <td>${esc(ownerLabel(row))}${row.userId === state.user?.uid ? ' <span class="me-tag">YOU</span>' : ""}</td>
      <td>${row.createdAt?.toDate ? row.createdAt.toDate().toLocaleDateString("id-ID") : "Baru saja"}</td>
      <td><span class="done-pill">✓ Completed</span></td>
      <td>${row.evidenceUrl ? `<a class="proof" href="${esc(row.evidenceUrl)}" target="_blank" rel="noopener">📎 ${esc(row.evidenceName || "Evidence")}</a>` : "—"}</td>
    </tr>
  `).join("") : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Belum ada submission tim untuk board/week ini.</td></tr>`;
}

function renderAll() {
  if ($("appPage")?.hidden) return;
  renderTeamProgress(); renderBingoSummary(); renderBoardOwners(); renderTeamRecord();
}

function syncContext() {
  const { variant, week } = context();
  if (variant === state.lastVariant && week === state.lastWeek) return;
  state.lastVariant = variant; state.lastWeek = week; renderAll();
}

onAuthStateChanged(auth, user => {
  state.unsubscribe?.(); state.unsubscribe = null; state.user = user; state.rows = []; state.lastVariant = null; state.lastWeek = null;
  if (!user) return;
  /* All authenticated participants read the shared team dataset. */
  state.unsubscribe = listenAllSubmissions(rows => { state.rows = Array.isArray(rows) ? rows : []; renderAll(); }, error => console.error("TEAM PROGRESS ERROR:", error));
});

/* Poll only localStorage context; never observe the DOM. This prevents the previous render feedback loop / freeze. */
state.timer = setInterval(() => { if (auth.currentUser) syncContext(); }, 400);
