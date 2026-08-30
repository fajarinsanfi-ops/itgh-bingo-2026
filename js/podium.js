import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { BOARDS } from "./data/boards.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let allRows = [];
let currentUser = null;

function esc(value = "") {
  return String(value).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"})[c]);
}

function points(row) {
  const index = Number(row.challengeIndex);
  if (index < 0) return 0;
  const challenge = (BOARDS[row.variant] || [])[index];
  const match = String(challenge?.[1] || "").match(/\((\d+)p\)/i);
  return match ? Number(match[1]) : 0;
}

function filtered() {
  const bingo = $("bingoFilter")?.value || "ALL";
  const week = $("weekFilter")?.value || "ALL";
  return allRows.filter(row =>
    (bingo === "ALL" || String(row.variant).toUpperCase() === bingo) &&
    (week === "ALL" || Number(row.week) === Number(week))
  );
}

function ranking(rows) {
  const map = new Map();
  rows.forEach(row => {
    const id = row.userId || row.userEmail || row.userName || "unknown";
    if (!map.has(id)) map.set(id, { id, name: row.userName || "Anonymous", points: 0, activities: 0, submissions: 0 });
    const p = map.get(id);
    p.submissions += 1;
    if (Number(row.challengeIndex) >= 0) p.activities += 1;
    p.points += points(row);
  });
  return [...map.values()].sort((a,b) => b.points-a.points || b.activities-a.activities || b.submissions-a.submissions || a.name.localeCompare(b.name));
}

function render() {
  const list = ranking(filtered()).slice(0, 3);
  const el = $("leaderboard");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="podium-empty">🏃‍♂️<strong>Belum ada pemenang</strong><span>Submit activity untuk mengisi podium!</span></div>`;
    return;
  }

  const slots = [list[1], list[0], list[2]];
  const ranks = [2, 1, 3];
  const emojis = ["🥈", "👑", "🥉"];
  const classes = ["second", "first", "third"];
  const heights = ["podium-second", "podium-first", "podium-third"];

  el.innerHTML = `<div class="podium-stage" aria-label="Top 3 leaderboard">${slots.map((person, i) => person ? `
    <article class="podium-slot ${classes[i]} ${heights[i]}">
      <div class="podium-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>•</i></div>
      <div class="podium-avatar">${esc((person.name || "?").charAt(0).toUpperCase())}<span>${emojis[i]}</span></div>
      <div class="podium-name">${esc(person.name)}</div>
      <div class="podium-stats">${person.activities} activity · ${person.points} pt</div>
      <div class="podium-pillar"><b>${ranks[i]}</b><span>${i === 1 ? "CHAMPION" : "PLACE"}</span></div>
      ${i === 1 ? `<div class="podium-mascot" aria-hidden="true">🏃‍♂️</div>` : ""}
    </article>` : `<div class="podium-slot ${classes[i]} empty-slot"><div class="podium-avatar">?</div><div class="podium-name">Waiting...</div><div class="podium-pillar"><b>${ranks[i]}</b><span>PLACE</span></div></div>`).join("")}</div>
    <div class="podium-floor" aria-hidden="true"><span>✦</span><span>•</span><span>✧</span><span>•</span><span>✦</span></div>
    <div class="podium-note">🏆 Top 3 berdasarkan <b>Points</b>, lalu Activities</div>`;
}

["bingoFilter", "weekFilter"].forEach(id => $(id)?.addEventListener("change", render));

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (!user) return;
  const q = query(collection(db, "submissions"));
  onSnapshot(q, snapshot => {
    allRows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  }, error => {
    console.error("Podium listener error:", error);
    const el = $("leaderboard");
    if (el) el.innerHTML = `<div class="podium-empty"><strong>Podium belum dapat dimuat</strong><span>${esc(error?.code || "permission-denied")}</span></div>`;
  });
});

window.addEventListener("beforeunload", () => { currentUser = null; allRows = []; });
