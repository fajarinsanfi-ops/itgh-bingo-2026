import { initGoogleSignIn, watchAuth, logout } from "./auth.js";
import { saveSubmission, saveProfile, uploadEvidence, listenSubmissions } from "./db.js";
import { BOARDS, WEEKS } from "./data/boards.js";

const state = {
  user: null,
  variant: localStorage.getItem("itgh.variant") || "A",
  week: Number(localStorage.getItem("itgh.week") || 1),
  submissions: [],
  selected: null,
  unsubscribe: null
};

const $ = id => document.getElementById(id);

function show(id, visible = true) {
  const el = $(id);
  if (!el) return;
  el.hidden = !visible;
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

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  show("toast");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => show("toast", false), 2800);
}

/* =========================================================
   THEME
========================================================= */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("itgh.theme", theme);
  const toggle = $("themeToggle");
  if (toggle) toggle.textContent = theme === "dark" ? "☀" : "☾";
}

applyTheme(localStorage.getItem("itgh.theme") || "dark");

$("themeToggle")?.addEventListener("click", () => {
  applyTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark"
  );
});

/* =========================================================
   SELECTORS
========================================================= */

function renderSelectors() {
  $("bingoSelector").innerHTML = ["A", "B", "C"].map(v => `
    <button class="bingo-btn ${state.variant === v ? "active" : ""}" data-v="${v}">
      BINGO ${v}
    </button>
  `).join("");

  document.querySelectorAll(".bingo-btn").forEach(button => {
    button.onclick = () => {
      const nextVariant = button.dataset.v;
      if (state.variant === nextVariant) return;

      closeModalIfOpen();
      state.variant = nextVariant;
      localStorage.setItem("itgh.variant", state.variant);
      state.selected = null;
      state.submissions = [];
      subscribe();
      render();
    };
  });

  $("weekSelector").innerHTML = WEEKS.map(w => `
    <button class="week-btn ${state.week === w.id ? "active" : ""}" data-w="${w.id}">
      <small>${escapeHtml(w.label)}</small>
      <b>${escapeHtml(w.date)}</b>
    </button>
  `).join("");

  document.querySelectorAll(".week-btn").forEach(button => {
    button.onclick = () => {
      const nextWeek = Number(button.dataset.w);
      if (state.week === nextWeek) return;

      closeModalIfOpen();
      state.week = nextWeek;
      localStorage.setItem("itgh.week", state.week);
      state.selected = null;
      state.submissions = [];
      subscribe();
      render();
    };
  });
}

/* =========================================================
   RENDER
========================================================= */

function render() {
  renderSelectors();

  const board = BOARDS[state.variant] || [];

  $("boardTitle").textContent = `BINGO ${state.variant}`;
  $("recordLabel").textContent = `Minggu ${state.week} · Bingo ${state.variant}`;
  $("teamName").textContent = "ITGH Health Challenge";

  const completed = new Set(
    state.submissions
      .filter(x =>
        x.variant === state.variant &&
        Number(x.week) === Number(state.week) &&
        Number(x.challengeIndex) >= 0
      )
      .map(x => Number(x.challengeIndex))
  );

  $("boardGrid").innerHTML = board.map((c, i) => `
    <button class="cell ${c[3]} ${completed.has(i) ? "done" : ""}" data-index="${i}">
      <span class="num">${i + 1}</span>
      <span class="ct">${escapeHtml(c[0])}<br>${escapeHtml(c[1])}</span>
      <span class="ci">${escapeHtml(c[2])}</span>
    </button>
  `).join("");

  document.querySelectorAll(".cell").forEach(button => {
    button.onclick = () => openChallenge(Number(button.dataset.index));
  });

  const count = completed.size;
  const pct = board.length ? Math.round((count / board.length) * 100) : 0;

  $("progressText").textContent = `${count} / ${board.length}`;
  $("progressPct").textContent = `${pct}%`;
  $("progressLabel").textContent = `${count} challenge completed`;

  requestAnimationFrame(() => {
    if ($("progressFill")) $("progressFill").style.width = `${pct}%`;
  });

  $("recordsBody").innerHTML = state.submissions.length
    ? state.submissions.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <b>${escapeHtml(r.challengeName || "Quiz ITGH")}</b><br>
          <span style="color:var(--muted);font-size:8px">${escapeHtml(r.achievement || "")}</span>
        </td>
        <td>${escapeHtml(r.target || "—")}</td>
        <td>${escapeHtml(r.userName || state.user?.displayName || state.user?.email || "")}</td>
        <td>${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("id-ID") : "Baru saja"}</td>
        <td><span class="done-pill">✓ Completed</span></td>
        <td>${r.stravaUrl ? `<a class="proof strava-proof" href="${escapeHtml(r.stravaUrl)}" target="_blank" rel="noopener noreferrer">🏃 Strava</a>` : "—"}</td>
        <td>${r.evidenceUrl ? `<a class="proof" href="${escapeHtml(r.evidenceUrl)}" target="_blank" rel="noopener noreferrer">📎 ${escapeHtml(r.evidenceName || "Evidence")}</a>` : "—"}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Belum ada submission untuk board/week ini.</td></tr>`;
}

/* =========================================================
   FIRESTORE LISTENER
========================================================= */

function subscribe() {
  if (!state.user) return;

  state.unsubscribe?.();
  state.unsubscribe = null;
  state.submissions = [];

  const context = {
    variant: state.variant,
    week: Number(state.week)
  };

  state.unsubscribe = listenSubmissions(
    {
      userId: state.user.uid,
      variant: context.variant,
      week: context.week
    },
    rows => {
      // Ignore a late callback from an old Bingo/Week listener.
      if (
        state.variant !== context.variant ||
        Number(state.week) !== Number(context.week)
      ) return;

      state.submissions = Array.isArray(rows) ? rows : [];
      render();
    },
    error => {
      console.error("Submission listener error:", error);
      if (
        state.variant === context.variant &&
        Number(state.week) === Number(context.week)
      ) {
        state.submissions = [];
        render();
        toast(`Gagal membaca data: ${error?.code || error?.message || "unknown error"}`);
      }
    }
  );

  render();
}

/* =========================================================
   MODAL / FORM HELPERS
========================================================= */

function closeModalIfOpen() {
  if ($("challengeModal") && !$("challengeModal").hidden) closeModal("challengeModal");
  if ($("quizModal") && !$("quizModal").hidden) closeModal("quizModal");
}

function resetChallengeForm() {
  if ($("achievementInput")) $("achievementInput").value = "";
  if ($("evidenceInput")) $("evidenceInput").value = "";
  if ($("stravaInput")) $("stravaInput").value = "";
  if ($("uploadStatus")) {
    $("uploadStatus").textContent = "";
    $("uploadStatus").style.color = "";
    $("uploadStatus").style.fontWeight = "";
  }
}

function isChallengeCompleted(challengeIndex) {
  return state.submissions.some(submission =>
    submission.variant === state.variant &&
    Number(submission.week) === Number(state.week) &&
    Number(submission.challengeIndex) === Number(challengeIndex)
  );
}

function isQuizCompleted() {
  return state.submissions.some(submission =>
    submission.variant === state.variant &&
    Number(submission.week) === Number(state.week) &&
    Number(submission.challengeIndex) === -1
  );
}

/* =========================================================
   OPEN CHALLENGE
========================================================= */

function openChallenge(index) {
  const board = BOARDS[state.variant] || [];
  const c = board[index];

  if (!c) {
    console.error("Challenge tidak ditemukan:", {
      variant: state.variant,
      week: state.week,
      index
    });
    toast("Challenge tidak ditemukan.");
    return;
  }

  if (isChallengeCompleted(index)) {
    toast("Challenge ini sudah selesai.");
    return;
  }

  state.selected = index;

  $("modalIcon").textContent = c[2];
  $("modalCategory").textContent = c[3] === "red"
    ? "Team Challenge"
    : c[3] === "blue"
      ? "Special Challenge"
      : "Individual Challenge";
  $("modalTitle").textContent = c[0];
  $("modalTarget").textContent = c[4];

  resetChallengeForm();
  show("challengeModal", true);
}

/* =========================================================
   SUBMIT CHALLENGE
========================================================= */

async function submitChallenge() {
  if (state.selected === null) {
    toast("Pilih challenge terlebih dahulu.");
    return;
  }

  if (!state.user) {
    toast("Session Google tidak ditemukan.");
    return;
  }

  // Capture the exact context before any async work starts.
  const submissionVariant = state.variant;
  const submissionWeek = Number(state.week);
  const submissionIndex = Number(state.selected);

  const achievement = $("achievementInput").value.trim();
  const stravaUrl = $("stravaInput")?.value.trim() || "";

  if (!achievement) {
    toast("Masukkan hasil/achievement terlebih dahulu.");
    $("achievementInput")?.focus();
    return;
  }

  if (stravaUrl) {
    try {
      const parsed = new URL(stravaUrl);
      const hostname = parsed.hostname.toLowerCase();
      if (parsed.protocol !== "https:" || !["strava.com", "www.strava.com"].includes(hostname)) {
        throw new Error("Invalid Strava URL");
      }
    } catch {
      toast("Link Strava tidak valid. Gunakan https://www.strava.com/...");
      $("stravaInput")?.focus();
      return;
    }
  }

  const board = BOARDS[submissionVariant] || [];
  const c = board[submissionIndex];

  if (!c) {
    toast("Data challenge tidak ditemukan.");
    return;
  }

  if (
    state.submissions.some(x =>
      x.variant === submissionVariant &&
      Number(x.week) === submissionWeek &&
      Number(x.challengeIndex) === submissionIndex
    )
  ) {
    toast("Challenge ini sudah pernah disubmit.");
    return;
  }

  const btn = $("submitChallengeBtn");
  const file = $("evidenceInput")?.files?.[0] || null;

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    let evidence = { url: "", name: "" };

    if (file) {
      $("uploadStatus").textContent = "Uploading evidence...";
      try {
        evidence = await uploadEvidence(state.user.uid, file);
      } catch (evidenceErr) {
        console.error("EVIDENCE UPLOAD ERROR:", evidenceErr);
        const reason = evidenceErr?.code || evidenceErr?.message || "unknown error";
        // Keep the submission usable even if Storage is unavailable.
        toast(`Upload evidence gagal (${reason}). Submission tetap disimpan tanpa evidence.`);
      }
    }

    $("uploadStatus").textContent = "Saving submission...";

    await saveSubmission({
      userId: state.user.uid,
      userName: state.user.displayName || state.user.email,
      userEmail: state.user.email,
      variant: submissionVariant,
      week: submissionWeek,
      challengeIndex: submissionIndex,
      challengeName: c[0],
      target: c[4],
      achievement,
      stravaUrl,
      evidenceUrl: evidence.url,
      evidenceName: evidence.name
    });

    console.log("Challenge saved successfully:", {
      variant: submissionVariant,
      week: submissionWeek,
      challengeIndex: submissionIndex,
      stravaUrl: stravaUrl || null
    });

    resetChallengeForm();
    closeModal("challengeModal");
    toast("✓ Challenge berhasil disimpan.");
  } catch (err) {
    console.error("SUBMIT CHALLENGE ERROR:", err);
    const reason = err?.code || err?.message || "unknown error";

    if ($("uploadStatus")) {
      $("uploadStatus").textContent = `❌ Gagal menyimpan submission — kode error: ${reason}`;
      $("uploadStatus").style.color = "#ff4d4f";
      $("uploadStatus").style.fontWeight = "700";
    }

    toast(`Gagal menyimpan: ${reason}. Cek Firestore rules & console.`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Submit Challenge";
    }
  }
}

/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;

  show(id, false);

  if (id === "challengeModal") {
    resetChallengeForm();
    state.selected = null;
  }

  if (id === "quizModal") {
    ["q1", "q2", "q3"].forEach(questionId => {
      const el = $(questionId);
      if (el) el.value = "";
    });
  }
}

/* =========================================================
   QUIZ
========================================================= */

async function submitQuiz() {
  if (!state.user) {
    toast("Session Google tidak ditemukan.");
    return;
  }

  if (isQuizCompleted()) {
    toast("Quiz untuk Bingo/Week ini sudah selesai.");
    closeModal("quizModal");
    return;
  }

  const correct = ["q1", "q2", "q3"].every(id => $(id)?.value === "y");
  if (!correct) {
    toast("Semua jawaban harus benar.");
    return;
  }

  const btn = $("submitQuizBtn");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    const submissionVariant = state.variant;
    const submissionWeek = Number(state.week);

    await saveSubmission({
      userId: state.user.uid,
      userName: state.user.displayName || state.user.email,
      userEmail: state.user.email,
      variant: submissionVariant,
      week: submissionWeek,
      challengeIndex: -1,
      challengeName: "Quiz ITGH",
      target: "Quiz selesai",
      achievement: "All answers correct",
      evidenceUrl: "",
      evidenceName: "Quiz Result"
    });

    closeModal("quizModal");
    toast("🎉 Quiz berhasil diselesaikan.");
  } catch (err) {
    console.error("QUIZ SAVE ERROR:", err);
    toast(`Quiz gagal disimpan: ${err?.code || err?.message || "unknown error"}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Submit Quiz";
    }
  }
}

/* =========================================================
   EVENTS
========================================================= */

$("submitChallengeBtn")?.addEventListener("click", submitChallenge);
$("submitQuizBtn")?.addEventListener("click", submitQuiz);

$("quizBtn")?.addEventListener("click", () => {
  if (isQuizCompleted()) {
    toast("Quiz untuk Bingo/Week ini sudah selesai.");
    return;
  }

  ["q1", "q2", "q3"].forEach(id => {
    const el = $(id);
    if (el) el.value = "";
  });

  show("quizModal", true);
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.onclick = () => closeModal(button.dataset.close);
});

$("logoutBtn")?.addEventListener("click", async () => {
  try {
    state.unsubscribe?.();
    state.unsubscribe = null;
    state.submissions = [];
    state.selected = null;
    await logout();
  } catch (err) {
    console.error("Logout error:", err);
    toast("Logout gagal.");
  }
});

/* =========================================================
   LOGIN
========================================================= */

function onLogin(user) {
  if (!user) return;

  state.user = user;

  show("loginPage", false);
  show("appPage", true);

  $("userName").textContent = user.displayName || "Google User";
  $("userEmail").textContent = user.email || "";
  $("identityEmail").textContent = user.email || "";
  $("identityTeam").textContent = "Authenticated with Google";
  $("userAvatar").src = user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

  saveProfile(user).catch(err => console.error("Profile save error:", err));

  subscribe();
  render();
}

watchAuth(user => {
  if (user) {
    onLogin(user);
  } else {
    state.user = null;
    state.submissions = [];
    state.selected = null;
    state.unsubscribe?.();
    state.unsubscribe = null;

    show("loginPage", true);
    show("appPage", false);
  }
});

initGoogleSignIn({
  onSuccess: onLogin,
  onError: err => {
    console.error("Google login error:", err);
    if ($("loginError")) {
      $("loginError").textContent = "Google login gagal. Pastikan OAuth Client ID dan Authorized JavaScript origins sudah benar.";
      show("loginError", true);
    }
  }
});
