import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { auth } from "./auth.js";
import { listenAllSubmissions } from "./db.js";
import { BOARDS } from "./data/boards.js";

/*
  TEAM VIEW
  ----------
  This module makes the main page a shared Team Board.
  Every authenticated member can see team progress, completed cells,
  participant names, and the team activity log.

  FUTURE PERSONAL VIEW
  --------------------
  The previous personal-only listener remains available in db.js as
  listenSubmissions(). Keep it there for future growth if we later add
  a dedicated "My Progress" view/profile. Do not remove it.
*/

const state = {
  rows: [],
  user: null,
  signature: ""
};

const $ = id => document.getElementById(id);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function context() {
  return {
    variant: String(localStorage.getItem("itgh.variant") || "A").toUpperCase(),
    week: Number(localStorage.getItem("itgh.week") || 1)
  };
}

function ownerLabel(row) {
  return String(row.userName || "Participant").trim() || "Participant";
}

function currentRows() {
  const { variant, week } = context();
  return state.rows.filter(row =>
    String(row.variant || "").toUpperCase() === variant &&
    Number(row.week) === week
  );
}

function activityRows(rows) {
  return rows.filter(row => Number(row.challengeIndex) >= 0);
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

  // The main board is intentionally TEAM progress, not personal progress.
  $("progressText") && ($("progressText").textContent = `${count} / ${board.length}`);
  $("progressPct") && ($("progressPct").textContent = `${pct}%`);
  $("progressLabel") && ($("progressLabel").textContent = `${count} challenge completed by team`);
  $("progressFill") && ($("progressFill").style.width = `${pct}%`);

  const card = document.querySelector(".progress-card");
  const small = card?.querySelector(".progress-head small");
  if (small) small.textContent = "TEAM PROGRESS";

  renderBingoSummary();
}

function renderBingoSummary() {
  const container = $("bingoSelector");
  if (!container) return;

  const counts = { A: 0, B: 0, C: 0 };
  for (const variant of ["A", "B", "C"]) {
    const boardSize = (BOARDS[variant] || []).length;
    const rows = activityRows(state.rows.filter(row =>
      String(row.variant || "").toUpperCase() === variant &&
      Number(row.week) === context().week
    ));
    counts[variant] = new Set(rows.map(row => Number(row.challengeIndex))).size;

    const button = container.querySelector(`[data-v="${variant}"]`);
    if (!button) continue;
    let meta = button.querySelector(".team-bingo-meta");
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "team-bingo-meta";
      button.appendChild(meta);
    }
    meta.textContent = `${counts[variant]}/${boardSize}`;
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

  const signature = `${context().variant}|${context().week}|${rows.map(r => `${r.challengeIndex}:${r.userId}:${r.id}`).join(",")}`;
  if (state.signature === signature) return;
  state.signature = signature;

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

    const names = owners.map(ownerLabel);
    const shown = names.slice(0, 2).join(" · ");
    badge.textContent = `✓ ${shown}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
    badge.title = names.join(", ");
  });
}

function renderTeamRecord() {
  const body = $("recordsBody");
  if (!body) return;

  const rows = currentRows();
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Belum ada submission tim untuk board/week ini.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((row, index) => `
    <tr class="team-record-row ${row.userId === state.user?.uid ? "is-me" : ""}">
      <td>${index + 1}</td>
      <td><b>${esc(row.challengeName || "Quiz ITGH")}</b><br><span style="color:var(--muted);font-size:8px">${esc(row.achievement || "")}</span></td>
      <td>${esc(row.target || "—")}</td>
      <td>${esc(ownerLabel(row))}${row.userId === state.user?.uid ? " <span class=\"me-tag\">YOU</span>" : ""}</td>
      <td>${row.createdAt?.toDate ? row.createdAt.toDate().toLocaleDateString("id-ID") : "Baru saja"}</td>
      <td><span class="done-pill">✓ Completed</span></td>
      <td>${row.evidenceUrl ? `<a class="proof" href="${esc(row.evidenceUrl)}" target="_blank" rel="noopener">📎 ${esc(row.evidenceName || "Evidence")}</a>` : "—"}</td>
    </tr>
  `).join("");
}

function renderAll() {
  renderTeamProgress();
  renderBoardOwners();
  renderTeamRecord();

  const participants = uniqueParticipants(currentRows());
  const teamCard = document.querySelector(".team-card");
  if (teamCard) {
    let meta = teamCard.querySelector(".team-member-count");
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "team-member-count";
      teamCard.appendChild(meta);
    }
    meta.textContent = `${participants} active participant${participants === 1 ? "" : "s"}`;
  }
}

function start(user) {
  state.user = user;
  state.rows = [];
  state.signature = "";

  if (!user) return;

  /*
    TEAM DATA SOURCE
    Read all authenticated participants' submissions.
    Firestore Rules must allow: allow read: if request.auth != null;
  */
  return listenAllSubmissions(rows => {
    state.rows = Array.isArray(rows) ? rows : [];
    renderAll();
  }, error => {
    console.error("TEAM PROGRESS ERROR:", error);
  });
}

let unsubscribe = null;

onAuthStateChanged(auth, user => {
  unsubscribe?.();
  unsubscribe = null;
  state.rows = [];
  state.signature = "";
  if (user) unsubscribe = start(user);
});

// app.js stores Bingo/Week in localStorage and rerenders its selectors.
// A lightweight interval keeps the team view synchronized with those selectors
// without using a MutationObserver, avoiding the render feedback-loop bug.
setInterval(() => {
  if (!auth.currentUser) return;
  const { variant, week } = context();
  if (state._variant !== variant || state._week !== week) {
    state._variant = variant;
    state._week = week;
    state.signature = "";
    renderAll();
  } else {
    renderBingoSummary();
  }
}, 500);
