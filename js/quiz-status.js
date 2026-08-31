import { getDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { auth, watchAuth } from "./auth.js";
import { db, saveSubmission } from "./db.js";

/*
 * QUIZ ITGH STATUS MODE
 * The old knowledge-question quiz is intentionally kept in app.js for future
 * reuse. This module replaces the UI with a simple per-person status form:
 *   ○ Belum dikerjakan (default)
 *   ○ Sudah dikerjakan
 *
 * Quiz status is still stored as a normal submission with challengeIndex -1,
 * scoped by user + Bingo + Week. Therefore each participant can mark the
 * Quiz independently on every Bingo/Week board.
 */

const $ = id => document.getElementById(id);
let initialized = false;

function context() {
  return {
    variant: String(localStorage.getItem("itgh.variant") || "A").toUpperCase(),
    week: Number(localStorage.getItem("itgh.week") || 1)
  };
}

function quizDocId(userId, variant, week) {
  return `${userId}_B${variant}_W${week}_C-1`;
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(window.__quizToast);
  window.__quizToast = setTimeout(() => { el.hidden = true; }, 2800);
}

function replaceQuizButton() {
  const oldButton = $("quizBtn");
  if (!oldButton || oldButton.dataset.quizStatusReady === "1") return;
  const button = oldButton.cloneNode(true);
  button.dataset.quizStatusReady = "1";
  oldButton.replaceWith(button);
  button.addEventListener("click", openQuiz);
}

function renderQuizModal() {
  const modal = $("quizModal");
  if (!modal) return;
  const body = modal.querySelector(".modal-body");
  if (!body) return;

  body.innerHTML = `
    <div class="quiz-status-intro">
      <span class="quiz-status-icon">☑</span>
      <div><strong>Quiz ITGH</strong><p>Tandai status quiz Anda untuk Bingo dan Week yang sedang dipilih.</p></div>
    </div>
    <fieldset class="quiz-status-options">
      <legend>STATUS QUIZ</legend>
      <label class="quiz-radio-option">
        <input type="radio" name="quizStatus" value="pending" checked>
        <span class="radio-dot"></span>
        <span><b>Belum dikerjakan</b><small>Quiz belum selesai</small></span>
      </label>
      <label class="quiz-radio-option">
        <input type="radio" name="quizStatus" value="done">
        <span class="radio-dot"></span>
        <span><b>Sudah dikerjakan</b><small>Quiz sudah selesai</small></span>
      </label>
    </fieldset>
    <div id="quizContext" class="quiz-context"></div>
  `;
}

function replaceSubmitButton() {
  const oldButton = $("submitQuizBtn");
  if (!oldButton || oldButton.dataset.quizStatusReady === "1") return;
  const button = oldButton.cloneNode(true);
  button.dataset.quizStatusReady = "1";
  button.textContent = "Simpan Status";
  oldButton.replaceWith(button);
  button.addEventListener("click", saveQuizStatus);
}

async function loadQuizStatus() {
  const user = auth.currentUser;
  if (!user) return false;
  const { variant, week } = context();
  const snap = await getDoc(doc(db, "submissions", quizDocId(user.uid, variant, week)));
  return snap.exists();
}

async function openQuiz() {
  if (!auth.currentUser) {
    toast("Session Google tidak ditemukan.");
    return;
  }

  renderQuizModal();
  replaceSubmitButton();

  const { variant, week } = context();
  const contextEl = $("quizContext");
  if (contextEl) contextEl.textContent = `BINGO ${variant} · WEEK ${week}`;

  const radios = document.querySelectorAll('input[name="quizStatus"]');
  radios.forEach(radio => { radio.checked = radio.value === "pending"; });

  try {
    const completed = await loadQuizStatus();
    radios.forEach(radio => { radio.checked = completed ? radio.value === "done" : radio.value === "pending"; });
  } catch (error) {
    console.error("Quiz status read error:", error);
  }

  const modal = $("quizModal");
  if (modal) modal.hidden = false;
}

async function saveQuizStatus() {
  const user = auth.currentUser;
  if (!user) return toast("Session Google tidak ditemukan.");

  const selected = document.querySelector('input[name="quizStatus"]:checked')?.value || "pending";
  if (selected !== "done") {
    toast("Pilih 'Sudah dikerjakan' untuk menyimpan status quiz.");
    return;
  }

  const { variant, week } = context();
  const button = $("submitQuizBtn");
  if (button) { button.disabled = true; button.textContent = "Saving..."; }

  try {
    await saveSubmission({
      userId: user.uid,
      userName: user.displayName || user.email,
      userEmail: user.email,
      variant,
      week,
      challengeIndex: -1,
      challengeName: "Quiz ITGH",
      target: "Status quiz",
      achievement: "Quiz sudah dikerjakan",
      evidenceUrl: "",
      evidenceName: "Quiz Status"
    });

    $("quizModal").hidden = true;
    toast(`✓ Quiz BINGO ${variant} Week ${week} ditandai sudah dikerjakan.`);
    updateCard(true);
  } catch (error) {
    console.error("Quiz status save error:", error);
    toast(`Gagal menyimpan status quiz: ${error?.code || error?.message || "unknown error"}`);
  } finally {
    if (button) { button.disabled = false; button.textContent = "Simpan Status"; }
  }
}

function updateCard(completed = false) {
  const button = $("quizBtn");
  if (!button) return;
  const small = button.querySelector("small");
  const strong = button.querySelector("strong");
  if (completed) {
    if (strong) strong.textContent = "Quiz ITGH ✓";
    if (small) small.textContent = "SUDAH DIKERJAKAN";
    button.classList.add("quiz-completed");
  } else {
    if (strong) strong.textContent = "Quiz ITGH";
    if (small) small.textContent = "CLICK TO START";
    button.classList.remove("quiz-completed");
  }
}

async function refreshCardStatus() {
  if (!auth.currentUser) return updateCard(false);
  try { updateCard(await loadQuizStatus()); }
  catch (error) { console.error("Quiz card status error:", error); }
}

function init() {
  if (initialized) return;
  initialized = true;
  renderQuizModal();
  replaceQuizButton();
  replaceSubmitButton();
  refreshCardStatus();

  setInterval(() => {
    replaceQuizButton();
    replaceSubmitButton();
    refreshCardStatus();
  }, 1200);
}

watchAuth(user => {
  if (user) init();
  else updateCard(false);
});
