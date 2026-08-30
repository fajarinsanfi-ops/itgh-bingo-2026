import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { auth } from "./auth.js";
import { listenTeamSubmissions } from "./db.js";
import { BOARDS } from "./data/boards.js";

const state = { rows: [], variant: null, week: null, unsubscribe: null, signature: "" };
const $ = id => document.getElementById(id);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function context() {
  return {
    variant: String(localStorage.getItem("itgh.variant") || "A").toUpperCase(),
    week: Number(localStorage.getItem("itgh.week") || 1)
  };
}

function points(row) {
  if (Number(row.challengeIndex) < 0) return 0;
  const challenge = BOARDS[row.variant]?.[Number(row.challengeIndex)];
  const match = String(challenge?.[1] || "").match(/\((\d+)p\)/i);
  return match ? Number(match[1]) : 0;
}

function currentRows() {
  const { variant, week } = context();
  return state.rows.filter(r => String(r.variant).toUpperCase() === variant && Number(r.week) === week);
}

function ownerLabel(row) {
  const name = String(row.userName || "Participant").trim();
  return name || "Participant";
}

function renderBoard() {
  const grid = $("boardGrid");
  if (!grid) return;

  const rows = currentRows().filter(r => Number(r.challengeIndex) >= 0);
  const byIndex = new Map();
  rows.forEach(row => byIndex.set(Number(row.challengeIndex), row));
  const board = BOARDS[context().variant] || [];
  const sig = `${context().variant}|${context().week}|${rows.map(r => `${r.challengeIndex}:${r.userId}`).join(",")}`;
  if (state.signature === sig) return;
  state.signature = sig;

  grid.querySelectorAll(".cell").forEach(cell => {
    const index = Number(cell.dataset.index);
    const row = byIndex.get(index);
    let badge = cell.querySelector(".team-owner");
    if (!row) {
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
    badge.textContent = `✓ ${ownerLabel(row)}`;
    badge.title = `${ownerLabel(row)} menyelesaikan aktivitas ini`;
  });
}

function renderTeamRecord() {
  const body = $("recordsBody");
  if (!body) return;
  const rows = currentRows();
  if (!rows.length) return;

  body.innerHTML = rows.map((r, i) => `
    <tr class="team-record-row ${r.userId === auth.currentUser?.uid ? "is-me" : ""}">
      <td>${i + 1}</td>
      <td><b>${esc(r.challengeName || "Quiz ITGH")}</b><br><span style="color:var(--muted);font-size:8px">${esc(r.achievement || "")}</span></td>
      <td>${esc(r.target || "—")}</td>
      <td>${esc(ownerLabel(r))}${r.userId === auth.currentUser?.uid ? " <span class=\"me-tag\">YOU</span>" : ""}</td>
      <td>${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("id-ID") : "Baru saja"}</td>
      <td><span class="done-pill">✓ Completed</span></td>
      <td>${r.evidenceUrl ? `<a class="proof" href="${esc(r.evidenceUrl)}" target="_blank" rel="noopener">📎 ${esc(r.evidenceName || "Evidence")}</a>` : "—"}</td>
    </tr>
  `).join("");
}

function subscribe() {
  const { variant, week } = context();
  if (!auth.currentUser) return;
  if (state.variant === variant && state.week === week && state.unsubscribe) return;

  state.unsubscribe?.();
  state.variant = variant;
  state.week = week;
  state.signature = "";
  state.unsubscribe = listenTeamSubmissions({ variant, week }, rows => {
    if (state.variant !== variant || state.week !== week) return;
    state.rows = rows;
    renderBoard();
    renderTeamRecord();
  }, error => console.error("TEAM PROGRESS ERROR:", error));
}

function watchContext() {
  const grid = $("boardGrid");
  if (!grid || grid.dataset.teamObserver) return;
  grid.dataset.teamObserver = "1";
  const observer = new MutationObserver(() => {
    const { variant, week } = context();
    if (variant !== state.variant || week !== state.week) subscribe();
    renderBoard();
  });
  observer.observe(grid, { childList: true, subtree: true });
}

onAuthStateChanged(auth, user => {
  state.unsubscribe?.();
  state.unsubscribe = null;
  state.rows = [];
  state.variant = null;
  state.week = null;
  state.signature = "";
  if (!user) return;
  subscribe();
  watchContext();
});
