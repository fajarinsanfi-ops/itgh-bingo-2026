import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { BOARDS } from "./data/boards.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const state = {
  user: null,
  submissions: [],
  bingo: "ALL",
  week: "ALL"
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("itgh.theme", theme);
  $("themeToggle").textContent = theme === "dark" ? "☀" : "☾";
}

applyTheme(localStorage.getItem("itgh.theme") || "dark");
$("themeToggle")?.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

function getPoints(row) {
  if (Number(row.challengeIndex) < 0) return 0;
  const board = BOARDS[row.variant] || [];
  const challenge = board[Number(row.challengeIndex)];
  if (!challenge) return 0;
  const match = String(challenge[1] || "").match(/\((\d+)p\)/i);
  return match ? Number(match[1]) : 0;
}

function getActivityName(row) {
  if (Number(row.challengeIndex) < 0) return "Quiz ITGH";
  return row.challengeName || "Challenge";
}

function getFilteredRows() {
  return state.submissions.filter(row =>
    (state.bingo === "ALL" || String(row.variant).toUpperCase() === state.bingo) &&
    (state.week === "ALL" || Number(row.week) === Number(state.week))
  );
}

function aggregate(rows) {
  const map = new Map();

  rows.forEach(row => {
    const id = row.userId || row.userEmail || row.userName || "unknown";
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: row.userName || "Anonymous",
        activities: 0,
        submissions: 0,
        points: 0,
        bingo: { A: 0, B: 0, C: 0 },
        weeks: new Set(),
        lastDate: 0
      });
    }

    const person = map.get(id);
    person.submissions += 1;

    if (Number(row.challengeIndex) >= 0) {
      person.activities += 1;
      person.bingo[String(row.variant).toUpperCase()] =
        (person.bingo[String(row.variant).toUpperCase()] || 0) + 1;
    }

    person.points += getPoints(row);
    person.weeks.add(Number(row.week));

    const time = row.createdAt?.toMillis?.() || 0;
    if (time > person.lastDate) person.lastDate = time;
  });

  return [...map.values()].sort((a, b) =>
    b.points - a.points ||
    b.activities - a.activities ||
    b.submissions - a.submissions ||
    a.name.localeCompare(b.name)
  );
}

function formatDate(row) {
  const date = row.createdAt?.toDate?.();
  return date ? date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Baru saja";
}

function render() {
  const rows = getFilteredRows();
  const ranking = aggregate(rows);
  const mine = ranking.find(x => x.id === state.user?.uid);
  const totalPoints = rows.reduce((sum, row) => sum + getPoints(row), 0);
  const activities = rows.filter(row => Number(row.challengeIndex) >= 0).length;
  const submitters = new Set(rows.map(row => row.userId || row.userEmail || row.userName)).size;

  $("metricSubmitters").textContent = submitters;
  $("metricSubmissions").textContent = rows.length;
  $("metricActivities").textContent = activities;
  $("metricPoints").textContent = totalPoints;
  $("participantCount").textContent = `${ranking.length} participants`;

  const rank = mine ? ranking.indexOf(mine) + 1 : null;
  $("myRank").textContent = rank ? `#${rank}` : "—";
  $("myRankMeta").textContent = mine ? `${mine.points} points · ${mine.activities} activities` : "Belum ada submission";
  $("personalName").textContent = mine?.name || state.user?.displayName || "Your Statistics";
  $("personalSubmissions").textContent = mine?.submissions || 0;
  $("personalActivities").textContent = mine?.activities || 0;
  $("personalPoints").textContent = mine?.points || 0;

  const context = `${state.bingo === "ALL" ? "All Bingo" : `Bingo ${state.bingo}`} · ${state.week === "ALL" ? "All Weeks" : `Week ${state.week}`}`;
  $("filterInfo").textContent = context;
  $("leaderboardContext").textContent = context;
  $("personalContext").textContent = context;

  renderLeaderboard(ranking);
  renderSubmitters(ranking);
  renderBingoBreakdown(mine);
  renderRecent(rows);
}

function renderLeaderboard(ranking) {
  const top = ranking.slice(0, 10);
  $("leaderboard").innerHTML = top.length ? top.map((person, index) => `
    <div class="rank-row ${index < 3 ? "top" : ""}">
      <div class="rank-no">${index + 1}</div>
      <div class="rank-person">
        <strong>${escapeHtml(person.name)}</strong>
        <small>${person.activities} activities · ${person.submissions} submissions</small>
      </div>
      <div class="rank-stat"><strong>${person.points}</strong><small>POINTS</small></div>
      <div class="rank-stat"><strong>${person.bingo.A + person.bingo.B + person.bingo.C}</strong><small>ACTIVITY</small></div>
    </div>
  `).join("") : `<div class="empty-state">Belum ada data submission.</div>`;
}

function renderBingoBreakdown(mine) {
  const values = mine?.bingo || { A: 0, B: 0, C: 0 };
  const max = 25;
  $("bingoBreakdown").innerHTML = ["A", "B", "C"].map(v => `
    <div class="breakdown-row">
      <div class="breakdown-top"><span>BINGO ${v}</span><span>${values[v]} / ${max} activities</span></div>
      <div class="bar"><i style="width:${Math.min(100, (values[v] / max) * 100)}%"></i></div>
    </div>
  `).join("");
}

function renderSubmitters(ranking) {
  $("submitterBody").innerHTML = ranking.length ? ranking.map((person, index) => `
    <tr>
      <td><b>${index + 1}</b></td>
      <td><div class="user-cell"><span class="user-mini">${escapeHtml((person.name || "?").charAt(0).toUpperCase())}</span><b>${escapeHtml(person.name)}</b></div></td>
      <td>${person.activities}</td>
      <td><span class="score">${person.points}</span></td>
      <td>${person.bingo.A}</td>
      <td>${person.bingo.B}</td>
      <td>${person.bingo.C}</td>
      <td><div class="week-badges">${[1,2,3,4].filter(w => person.weeks.has(w)).map(w => `<span class="week-badge">W${w}</span>`).join("") || "—"}</div></td>
      <td>${person.lastDate ? new Date(person.lastDate).toLocaleDateString("id-ID") : "—"}</td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty-state">Belum ada participant pada filter ini.</td></tr>`;
}

function renderRecent(rows) {
  const recent = [...rows].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 20);
  $("recentList").innerHTML = recent.length ? recent.map(row => `
    <div class="recent-item">
      <div class="recent-icon">${escapeHtml((BOARDS[row.variant]?.[Number(row.challengeIndex)]?.[2]) || (Number(row.challengeIndex) < 0 ? "💡" : "🏆"))}</div>
      <div class="recent-copy">
        <strong>${escapeHtml(getActivityName(row))}</strong>
        <small>${escapeHtml(row.userName || "Anonymous")} · Bingo ${escapeHtml(row.variant)} · Week ${Number(row.week)}</small>
      </div>
      <div class="recent-meta">${formatDate(row)}<br><b>${getPoints(row)} pt</b></div>
    </div>
  `).join("") : `<div class="empty-state">Belum ada aktivitas.</div>`;
}

function showError(message) {
  const el = $("statsError");
  el.textContent = message;
  el.hidden = false;
}

$("bingoFilter")?.addEventListener("change", e => {
  state.bingo = e.target.value;
  render();
});

$("weekFilter")?.addEventListener("change", e => {
  state.week = e.target.value;
  render();
});

$("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./index.html";
});

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }

  state.user = user;
  $("userName").textContent = user.displayName || "Google User";
  $("userEmail").textContent = user.email || "";
  $("userAvatar").src = user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
  $("loadingPage").hidden = true;
  $("statsPage").hidden = false;

  const q = query(collection(db, "submissions"));
  onSnapshot(q, snapshot => {
    state.submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  }, error => {
    console.error("Statistics listener error:", error);
    showError(`Gagal membaca leaderboard: ${error?.code || error?.message || "unknown error"}`);
  });
});
