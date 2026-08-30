import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { db } from "./db.js";

const BADGES = [
  {
    id: "first-step",
    icon: "🏃",
    name: "First Step",
    description: "Selesaikan aktivitas pertama.",
    check: s => s.activities >= 1,
    progress: s => `${Math.min(s.activities, 1)} / 1 activity`
  },
  {
    id: "active-5",
    icon: "⚡",
    name: "Getting Active",
    description: "Selesaikan 5 aktivitas.",
    check: s => s.activities >= 5,
    progress: s => `${Math.min(s.activities, 5)} / 5 activities`
  },
  {
    id: "active-10",
    icon: "🔥",
    name: "On Fire",
    description: "Selesaikan 10 aktivitas.",
    check: s => s.activities >= 10,
    progress: s => `${Math.min(s.activities, 10)} / 10 activities`
  },
  {
    id: "active-25",
    icon: "💎",
    name: "25 Strong",
    description: "Selesaikan 25 aktivitas.",
    check: s => s.activities >= 25,
    progress: s => `${Math.min(s.activities, 25)} / 25 activities`
  },
  {
    id: "bingo-explorer",
    icon: "🧭",
    name: "Bingo Explorer",
    description: "Berpartisipasi di Bingo A, B, dan C.",
    check: s => s.variants.size >= 3,
    progress: s => `${s.variants.size} / 3 Bingo`
  },
  {
    id: "week-warrior",
    icon: "📅",
    name: "Week Warrior",
    description: "Aktif pada Week 1 sampai Week 4.",
    check: s => s.weeks.size >= 4,
    progress: s => `${s.weeks.size} / 4 weeks`
  },
  {
    id: "evidence-hero",
    icon: "📸",
    name: "Evidence Hero",
    description: "Upload evidence untuk 5 aktivitas.",
    check: s => s.evidence >= 5,
    progress: s => `${Math.min(s.evidence, 5)} / 5 evidence`
  },
  {
    id: "quiz-master",
    icon: "🧠",
    name: "Quiz Master",
    description: "Selesaikan Quiz ITGH 3 kali.",
    check: s => s.quizzes >= 3,
    progress: s => `${Math.min(s.quizzes, 3)} / 3 quizzes`
  }
];

let unsubscribe = null;
let lastRows = [];

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function buildStats(rows) {
  const activities = rows.filter(row => Number(row.challengeIndex) >= 0);
  const variants = new Set(
    activities.map(row => String(row.variant || "").toUpperCase()).filter(Boolean)
  );
  const weeks = new Set(
    rows.map(row => Number(row.week)).filter(week => Number.isInteger(week) && week > 0)
  );
  const evidence = activities.filter(row => Boolean(row.evidenceUrl)).length;
  const quizzes = rows.filter(row => Number(row.challengeIndex) === -1).length;

  return {
    activities: activities.length,
    variants,
    weeks,
    evidence,
    quizzes
  };
}

function ensurePanel() {
  if ($("achievementPanel")) return $("achievementPanel");

  const progress = document.querySelector(".progress-card");
  if (!progress) return null;

  const panel = document.createElement("section");
  panel.id = "achievementPanel";
  panel.className = "achievement-panel glass";
  panel.innerHTML = `
    <div class="achievement-head">
      <div>
        <small>ACHIEVEMENT CENTER</small>
        <h3>Badges & Milestones</h3>
      </div>
      <div class="achievement-score">
        <strong id="achievementUnlocked">0</strong>
        <span id="achievementTotal">/ ${BADGES.length} unlocked</span>
      </div>
    </div>
    <div id="achievementGrid" class="achievement-grid"></div>
  `;

  progress.insertAdjacentElement("afterend", panel);
  return panel;
}

function render(rows) {
  const panel = ensurePanel();
  if (!panel) return;

  const stats = buildStats(rows);
  const unlocked = BADGES.filter(badge => badge.check(stats));

  $("achievementUnlocked").textContent = unlocked.length;
  $("achievementTotal").textContent = `/ ${BADGES.length} unlocked`;

  $("achievementGrid").innerHTML = BADGES.map(badge => {
    const isUnlocked = badge.check(stats);
    return `
      <article class="achievement-badge ${isUnlocked ? "unlocked" : "locked"}">
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-copy">
          <strong>${escapeHtml(badge.name)}</strong>
          <span>${escapeHtml(badge.description)}</span>
          <small>${escapeHtml(badge.progress(stats))}</small>
        </div>
        <div class="badge-state">${isUnlocked ? "✓" : "🔒"}</div>
      </article>
    `;
  }).join("");
}

function start(user) {
  unsubscribe?.();
  unsubscribe = null;

  if (!user) {
    lastRows = [];
    return;
  }

  const q = query(
    collection(db, "submissions"),
    where("userId", "==", user.uid)
  );

  unsubscribe = onSnapshot(q, snapshot => {
    lastRows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render(lastRows);
  }, error => {
    console.error("Achievement listener error:", error);
  });
}

onAuthStateChanged(auth, start);

// The panel is inserted after the main app renders its progress section.
const observer = new MutationObserver(() => {
  if ($("appPage") && !$("appPage").hidden) render(lastRows);
});

observer.observe(document.body, { childList: true, subtree: true });
