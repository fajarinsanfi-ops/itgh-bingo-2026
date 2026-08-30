import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { auth } from "./auth.js";
import { listenAllSubmissions } from "./db.js";
import { BOARDS } from "./data/boards.js";

/*
 * TEAM BOARD MODE
 * The main page is shared by one team:
 * - progress bar = team activity completion for selected Bingo + Week
 * - Bingo selector shows team completion per Bingo
 * - board cells show who completed each activity
 * - activity log shows every team submission for the selected context
 *
 * FUTURE / GROWTH:
 * The personal listener remains in db.js. If the application grows to
 * multiple teams or privacy-sensitive deployments, switch this module to
 * teamId-scoped reads and restore personal progress as the default view.
 */

const state = { rows: [], user: null, observer: null, timer: null, rendering: false };
const $ = id => document.getElementById(id);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

function context() {
  return {
    variant: String(localStorage.getItem("itgh.variant") || "A").toUpperCase(),
    week: Number(localStorage.getItem("itgh.week") || 1)
  };
}

function currentRows() {
  const { variant, week } = context();
  return state.rows.filter(row => String(row.variant || "").toUpperCase() === variant && Number(row.week) === week);
}

function activityRows(rows) {
  return rows.filter(row => Number(row.challengeIndex) >= 0);
}

function ownerLabel(row) {
  return String(row.userName || "Team member").trim() || "Team member";
}

function uniqueParticipants(rows) {
  return new Set(rows.map(row => row.userId).filter(Boolean)).size;
}

function renderTeamProgress() {
  const board = BOARDS[context().variant] || [];
  const rows = activityRows(currentRows());
  const completed = new Set(rows.map(row => Number(row.challengeIndex)));
  const count = completed.size;
  const pct = board.length ? Math.round((count / board.length) * 100) : 0;

  $("progressText") && ($("progressText").textContent = `${count} / ${board.length}`);
  $("progressPct") && ($("progressPct").textContent = `${pct}%`);
  $("progressLabel") && ($("progressLabel").textContent = `${count} challenge completed by team`);
  $("progressFill") && ($("progressFill").style.width = `${pct}%`);

  const small = document.querySelector(".progress-card .progress-head small");
  if (small) small.textContent = "TEAM PROGRESS";

  const teamCard = document.querySelector(".team-card");
  if (teamCard) {
    let meta = teamCard.querySelector(".team-member-count");
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "team-member-count";
      teamCard.appendChild(meta);
    }
    meta.textContent = `${uniqueParticipants(rows)} active participant${uniqueParticipants(rows) === 1 ? "" : "s"}`;
  }
}

function renderBingoSummary() {
  const container = $("bingoSelector");
  if (!container) return;
  const { week } = context();

  for (const variant of ["A", "B", "C"]) {
    const boardSize = (BOARDS[variant] || []).length;
    const rows = activityRows(state.rows.filter(row => String(row.variant || "").toUpperCase() === variant && Number(row.week) === week));
    const count = new Set(rows.map(row => Number(row.challengeIndex))).size;
    const button = container.querySelector(`[data-v="${variant}"]`);
    if (!button) continue;

    let meta = button.querySelector(".team-bingo-meta");
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "team-bingo-meta";
      button.appendChild(meta);
    }
    meta.textContent = `${count}/${boardSize}`;
    meta.title = `Team progress: ${count} of ${boardSize}`;
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

    if (!owners.length) {
      cell.classList.remove("team-done");
      badge?.remove();
      return;
    }

    cell.classList.add("team-done");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "team-owner";
      cell.appendChild(badge);
    }

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
  if (!$('appPage') || $('appPage').hidden) return;
  state.rendering = true;
  try {
    renderTeamProgress();
    renderBingoSummary();
    renderBoardOwners();
    renderTeamRecord();
  } finally {
    state.rendering = false;
  }
}

function observeAppRender() {
  if (state.observer) state.observer.disconnect();
  const targets = [$("boardGrid"), $("recordsBody"), $("progressText"), $("progressPct"), $("progressLabel")].filter(Boolean);
  if (!targets.length) return;

  state.observer = new MutationObserver(() => {
    if (state.rendering || !auth.currentUser) return;
    clearTimeout(state.observer.__debounce);
    state.observer.__debounce = setTimeout(() => renderAll(), 0);
  });
  targets.forEach(target => state.observer.observe(target, { childList: true, subtree: true, characterData: true, attributes: true }));
}

let unsubscribe = null;
onAuthStateChanged(auth, user => {
  unsubscribe?.();
  unsubscribe = null;
  state.user = user;
  state.rows = [];
  if (!user) return;

  unsubscribe = listenAllSubmissions(rows => {
    state.rows = Array.isArray(rows) ? rows : [];
    renderAll();
  }, error => console.error("TEAM PROGRESS ERROR:", error));
});

// app.js owns Bingo/Week selection. We mirror its localStorage context and
// refresh the shared team view without another Firestore listener per switch.
state.timer = setInterval(() => {
  if (!auth.currentUser) return;
  renderBingoSummary();
  renderAll();
}, 1200);

// index.html loads this module before app.js can always create the target nodes.
// Wait briefly for the app shell, then observe only the relevant nodes.
const initTimer = setInterval(() => {
  if ($("boardGrid") && $("recordsBody") && $("progressText")) {
    clearInterval(initTimer);
    observeAppRender();
    renderAll();
  }
}, 200);

/*
 * FUTURE / GROWTH NOTES:
 * - listenSubmissions() in db.js is intentionally retained for a future My Progress page.
 * - For multiple teams, add teamId to user/submission and change listenAllSubmissions()
 *   to a team-scoped query. Do not expose every team's raw submissions.
 */
