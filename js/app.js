import { initGoogleSignIn, watchAuth, logout } from "./auth.js";
import {
  saveSubmission,
  saveProfile,
  uploadEvidence,
  listenSubmissions
} from "./db.js";
import { BOARDS, WEEKS } from "./data/boards.js";


/* =========================================================
   APP STATE
========================================================= */

const state = {
  user: null,

  variant:
    localStorage.getItem("itgh.variant") || "A",

  week:
    Number(localStorage.getItem("itgh.week") || 1),

  submissions: [],

  selected: null,

  unsubscribe: null
};


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);


function show(id, visible = true) {
  const el = $(id);

  if (!el) {
    console.warn(`Element #${id} not found`);
    return;
  }

  el.hidden = !visible;
}


function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]
  );
}


function toast(msg) {
  const el = $("toast");

  if (!el) return;

  el.textContent = msg;

  show("toast");

  clearTimeout(window.__toast);

  window.__toast = setTimeout(() => {
    show("toast", false);
  }, 2800);
}


/* =========================================================
   THEME
========================================================= */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  localStorage.setItem("itgh.theme", theme);

  const toggle = $("themeToggle");

  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀" : "☾";
  }
}


applyTheme(
  localStorage.getItem("itgh.theme") || "dark"
);


$("themeToggle")?.addEventListener(
  "click",
  () => {
    const current =
      document.documentElement.dataset.theme;

    applyTheme(
      current === "dark"
        ? "light"
        : "dark"
    );
  }
);


/* =========================================================
   SELECTORS
========================================================= */

function renderSelectors() {

  /* -------------------------
     BINGO SELECTOR
  ------------------------- */

  $("bingoSelector").innerHTML =
    ["A", "B", "C"]
      .map(
        v => `
          <button
            class="bingo-btn ${state.variant === v ? "active" : ""}"
            data-v="${v}">
            BINGO ${v}
          </button>
        `
      )
      .join("");


  document
    .querySelectorAll(".bingo-btn")
    .forEach(button => {

      button.onclick = () => {

        state.variant =
          button.dataset.v;

        localStorage.setItem(
          "itgh.variant",
          state.variant
        );

        state.selected = null;

        subscribe();

        render();
      };
    });


  /* -------------------------
     WEEK SELECTOR
  ------------------------- */

  $("weekSelector").innerHTML =
    WEEKS
      .map(
        w => `
          <button
            class="week-btn ${state.week === w.id ? "active" : ""}"
            data-w="${w.id}">

            <small>${escapeHtml(w.label)}</small>

            <b>${escapeHtml(w.date)}</b>

          </button>
        `
      )
      .join("");


  document
    .querySelectorAll(".week-btn")
    .forEach(button => {

      button.onclick = () => {

        state.week =
          Number(button.dataset.w);

        localStorage.setItem(
          "itgh.week",
          state.week
        );

        state.selected = null;

        subscribe();

        render();
      };
    });
}


/* =========================================================
   RENDER MAIN APP
========================================================= */

function render() {

  renderSelectors();


  const board =
    BOARDS[state.variant] || [];


  /* -------------------------
     HEADER
  ------------------------- */

  $("boardTitle").textContent =
    `BINGO ${state.variant}`;

  $("recordLabel").textContent =
    `Minggu ${state.week} · Bingo ${state.variant}`;

  $("teamName").textContent =
    "ITGH Health Challenge";


  /* -------------------------
     COMPLETED CHALLENGES
  ------------------------- */

  const completed =
    new Set(
      state.submissions
        .map(x => x.challengeIndex)
    );


  /* -------------------------
     BOARD
  ------------------------- */

  $("boardGrid").innerHTML =
    board
      .map(
        (c, i) => `
          <button
            class="cell ${c[3]} ${completed.has(i) ? "done" : ""}"
            data-index="${i}">

            <span class="num">
              ${i + 1}
            </span>

            <span class="ct">
              ${escapeHtml(c[0])}<br>
              ${escapeHtml(c[1])}
            </span>

            <span class="ci">
              ${escapeHtml(c[2])}
            </span>

          </button>
        `
      )
      .join("");


  document
    .querySelectorAll(".cell")
    .forEach(button => {

      button.onclick = () => {

        openChallenge(
          Number(button.dataset.index)
        );
      };
    });


  /* -------------------------
     PROGRESS
  ------------------------- */

  const count =
    completed.size;

  const pct =
    board.length
      ? Math.round(
          (count / board.length) * 100
        )
      : 0;


  $("progressText").textContent =
    `${count} / ${board.length}`;

  $("progressPct").textContent =
    `${pct}%`;

  $("progressLabel").textContent =
    `${count} challenge completed`;


  requestAnimationFrame(() => {

    if ($("progressFill")) {
      $("progressFill").style.width =
        `${pct}%`;
    }

  });


  /* -------------------------
     RECORDS
  ------------------------- */

  $("recordsBody").innerHTML =
    state.submissions.length

      ? state.submissions
          .map(
            (r, i) => `
              <tr>

                <td>
                  ${i + 1}
                </td>

                <td>

                  <b>
                    ${escapeHtml(
                      r.challengeName ||
                      "Quiz ITGH"
                    )}
                  </b>

                  <br>

                  <span
                    style="
                      color:var(--muted);
                      font-size:8px;
                    "
                  >
                    ${escapeHtml(
                      r.achievement || ""
                    )}
                  </span>

                </td>

                <td>
                  ${escapeHtml(
                    r.target || "—"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    r.userName ||
                    state.user?.displayName ||
                    state.user?.email ||
                    ""
                  )}
                </td>

                <td>
                  ${
                    r.createdAt?.toDate
                      ? r.createdAt
                          .toDate()
                          .toLocaleDateString(
                            "id-ID"
                          )
                      : "Baru saja"
                  }
                </td>

                <td>
                  <span class="done-pill">
                    ✓ Completed
                  </span>
                </td>

                <td>

                  ${
                    r.evidenceUrl

                      ? `
                        <a
                          class="proof"
                          href="${escapeHtml(
                            r.evidenceUrl
                          )}"
                          target="_blank"
                          rel="noopener"
                        >
                          📎
                          ${escapeHtml(
                            r.evidenceName ||
                            "Evidence"
                          )}
                        </a>
                      `

                      : "—"
                  }

                </td>

              </tr>
            `
          )
          .join("")

      : `
          <tr>
            <td
              colspan="7"
              style="
                text-align:center;
                color:var(--muted);
                padding:24px
              "
            >
              Belum ada submission
              untuk board/week ini.
            </td>
          </tr>
        `;
}


/* =========================================================
   FIRESTORE LISTENER
========================================================= */

function subscribe() {

  if (!state.user) {
    return;
  }


  /* Unsubscribe previous listener */

  state.unsubscribe?.();


  state.unsubscribe =
    listenSubmissions(

      {
        userId: state.user.uid,

        variant: state.variant,

        week: state.week
      },

      rows => {

        state.submissions =
          rows || [];

        render();
      }

    );
}


/* =========================================================
   RESET CHALLENGE FORM
========================================================= */

function resetChallengeForm() {
  const achievement = $("achievementInput");
  const evidence = $("evidenceInput");
  const uploadStatus = $("uploadStatus");

  if (achievement) {
    achievement.value = "";
  }

  if (evidence) {
    evidence.value = "";
  }

  if (uploadStatus) {
    uploadStatus.textContent = "";
  }
}


/* =========================================================
   OPEN CHALLENGE MODAL
========================================================= */

function openChallenge(index) {

  const board =
    BOARDS[state.variant] || [];

  const c =
    board[index];


  if (!c) {
    console.error(
      "Challenge tidak ditemukan:",
      {
        variant: state.variant,
        week: state.week,
        index
      }
    );

    toast(
      "Challenge tidak ditemukan."
    );

    return;
  }


  /* Check duplicate before opening */

  if (
    state.submissions.some(
      x =>
        x.challengeIndex === index
    )
  ) {

    toast(
      "Challenge ini sudah selesai."
    );

    return;
  }


  state.selected =
    index;


  /* -------------------------
     MODAL CONTENT
  ------------------------- */

  $("modalIcon").textContent =
    c[2];

  $("modalCategory").textContent =
    c[3] === "red"
      ? "Team Challenge"
      : c[3] === "blue"
        ? "Special Challenge"
        : "Individual Challenge";

  $("modalTitle").textContent =
    c[0];

  $("modalTarget").textContent =
    c[4];


  /* -------------------------
     RESET FORM
  ------------------------- */

  resetChallengeForm();


  /* -------------------------
     OPEN MODAL
  ------------------------- */

  show(
    "challengeModal",
    true
  );
}


/* =========================================================
   SUBMIT CHALLENGE
========================================================= */

async function submitChallenge() {

  /* -------------------------
     VALIDATE SELECTED
  ------------------------- */

  if (state.selected === null) {

    toast(
      "Pilih challenge terlebih dahulu."
    );

    return;
  }


  /* -------------------------
     VALIDATE USER
  ------------------------- */

  if (!state.user) {

    toast(
      "Session Google tidak ditemukan."
    );

    return;
  }


  /* -------------------------
     GET FORM DATA
  ------------------------- */

  const achievement =
    $("achievementInput")
      .value
      .trim();


  if (!achievement) {

    toast(
      "Masukkan hasil/achievement terlebih dahulu."
    );

    $("achievementInput")?.focus();

    return;
  }


  const board =
    BOARDS[state.variant] || [];

  const c =
    board[state.selected];


  if (!c) {

    toast(
      "Data challenge tidak ditemukan."
    );

    return;
  }


  const btn =
    $("submitChallengeBtn");


  const file =
    $("evidenceInput")
      ?.files?.[0] || null;


  /* -------------------------
     DUPLICATE PROTECTION
  ------------------------- */

  if (
    state.submissions.some(
      x =>
        x.challengeIndex ===
        state.selected
    )
  ) {

    toast(
      "Challenge ini sudah pernah disubmit."
    );

    return;
  }


  try {

    /* -------------------------
       LOCK SUBMIT BUTTON
    ------------------------- */

    if (btn) {

      btn.disabled = true;

      btn.textContent =
        "Saving...";
    }


    /* -------------------------
       EVIDENCE
    ------------------------- */

    let evidence = {
      url: "",
      name: ""
    };


    if (file) {

      $("uploadStatus").textContent =
        "Uploading evidence...";


      evidence =
        await uploadEvidence(
          state.user.uid,
          file
        );
    }


    /* -------------------------
       FIRESTORE SAVE
    ------------------------- */

    $("uploadStatus").textContent =
      "Saving submission...";


    await saveSubmission({

      userId:
        state.user.uid,

      userName:
        state.user.displayName ||
        state.user.email,

      userEmail:
        state.user.email,

      variant:
        state.variant,

      week:
        state.week,

      challengeIndex:
        state.selected,

      challengeName:
        c[0],

      target:
        c[4],

      achievement,

      evidenceUrl:
        evidence.url,

      evidenceName:
        evidence.name

    });


    /* =====================================================
       SUCCESS
    ===================================================== */

    console.log(
      "Challenge saved successfully:",
      {
        variant: state.variant,
        week: state.week,
        challengeIndex:
          state.selected
      }
    );


    /* -------------------------
       RESET FORM
    ------------------------- */

    resetChallengeForm();


    /* -------------------------
       CLOSE MODAL
    ------------------------- */

    closeModal(
      "challengeModal"
    );


    /* -------------------------
       SUCCESS MESSAGE
    ------------------------- */

    toast(
      "✓ Challenge berhasil disimpan."
    );


    } catch (err) {

    /* =====================================================
       ERROR
    ===================================================== */

    console.error(
      "SUBMIT CHALLENGE ERROR:",
      err
    );


    console.error(
      "Error code:",
      err?.code
    );


    console.error(
      "Error message:",
      err?.message
    );


    /* -------------------------
       IMPORTANT:
       FORM TIDAK DI-RESET
       JIKA ERROR
    ------------------------- */

    const reason =
      err?.code ||
      err?.message ||
      "unknown error";

    if ($("uploadStatus")) {

      $("uploadStatus").textContent =
        `Gagal menyimpan submission (${reason}).`;
    }


    toast(
      `Gagal menyimpan: ${reason}. Cek Firestore/Storage rules & console.`
    );


  } finally {

    /* -------------------------
       RESTORE BUTTON
    ------------------------- */

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        "Submit Challenge";
    }

  }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal(id) {

  const modal = $(id);

  if (!modal) {
    return;
  }


  /* -------------------------
     HIDE MODAL
  ------------------------- */

  show(
    id,
    false
  );


  /* -------------------------
     RESET CHALLENGE
  ------------------------- */

  // Challenge modal cleanup
  if (id === "challengeModal") {

    resetChallengeForm();

    // Baru di sini selected dihapus
    state.selected = null;
  }

  /* -------------------------
     RESET QUIZ
  ------------------------- */

  if (id === "quizModal") {

    ["q1", "q2", "q3"].forEach(id => {

      const el = $(id);

      if (el) {
        el.value = "";
      }

    });
  }
}


/* =========================================================
   QUIZ
========================================================= */

async function submitQuiz() {

  if (!state.user) {

    toast(
      "Session Google tidak ditemukan."
    );

    return;
  }


  const correct =
    ["q1", "q2", "q3"]
      .every(
        id =>
          $(id)?.value === "y"
      );


  if (!correct) {

    toast(
      "Semua jawaban harus benar."
    );

    return;
  }


  const btn =
    $("submitQuizBtn");


  try {

    if (btn) {

      btn.disabled = true;

      btn.textContent =
        "Saving...";
    }


    await saveSubmission({

      userId:
        state.user.uid,

      userName:
        state.user.displayName ||
        state.user.email,

      userEmail:
        state.user.email,

      variant:
        state.variant,

      week:
        state.week,

      challengeIndex:
        -1,

      challengeName:
        "Quiz ITGH",

      target:
        "Quiz selesai",

      achievement:
        "All answers correct",

      evidenceUrl:
        "",

      evidenceName:
        "Quiz Result"
    });


    /* Reset + close */

    closeModal(
      "quizModal"
    );


    toast(
      "🎉 Quiz berhasil diselesaikan."
    );


  } catch (err) {

    console.error(
      "QUIZ SAVE ERROR:",
      err
    );


    toast(
      "Quiz gagal disimpan."
    );


  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        "Submit Quiz";
    }
  }
}


/* =========================================================
   BUTTON EVENTS
========================================================= */

$("submitChallengeBtn")
  ?.addEventListener(
    "click",
    submitChallenge
  );


$("submitQuizBtn")
  ?.addEventListener(
    "click",
    submitQuiz
  );


$("quizBtn")
  ?.addEventListener(
    "click",
    () => {

      /* Reset quiz before opening */

      ["q1", "q2", "q3"]
        .forEach(id => {

          const el = $(id);

          if (el) {
            el.value = "";
          }

        });


      show(
        "quizModal",
        true
      );
    }
  );


/* =========================================================
   MODAL CLOSE BUTTONS
========================================================= */

document
  .querySelectorAll("[data-close]")
  .forEach(button => {

    button.onclick = () => {

      closeModal(
        button.dataset.close
      );

    };

  });


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        state.unsubscribe?.();

        state.unsubscribe =
          null;

        state.submissions =
          [];

        state.selected =
          null;


        await logout();


      } catch (err) {

        console.error(
          "Logout error:",
          err
        );

        toast(
          "Logout gagal."
        );
      }
    }
  );


/* =========================================================
   LOGIN SUCCESS
========================================================= */

function onLogin(user) {

  if (!user) {
    return;
  }


  state.user =
    user;


  /* -------------------------
     PAGE SWITCH
  ------------------------- */

  show(
    "loginPage",
    false
  );

  show(
    "appPage",
    true
  );


  /* -------------------------
     USER INFO
  ------------------------- */

  $("userName").textContent =
    user.displayName ||
    "Google User";

  $("userEmail").textContent =
    user.email ||
    "";

  $("identityEmail").textContent =
    user.email ||
    "";

  $("identityTeam").textContent =
    "Authenticated with Google";


  /* -------------------------
     AVATAR
  ------------------------- */

  $("userAvatar").src =
    user.photoURL ||
    "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";


  /* -------------------------
     SAVE PROFILE
  ------------------------- */

  saveProfile(user)
    .catch(err => {

      console.error(
        "Profile save error:",
        err
      );

    });


  /* -------------------------
     LOAD SUBMISSIONS
  ------------------------- */

  subscribe();


  /* -------------------------
     RENDER APP
  ------------------------- */

  render();
}


/* =========================================================
   AUTH STATE
========================================================= */

watchAuth(user => {

  if (user) {

    onLogin(user);

  } else {

    state.user = null;

    state.submissions = [];

    state.selected = null;

    state.unsubscribe?.();

    state.unsubscribe = null;


    show(
      "loginPage",
      true
    );

    show(
      "appPage",
      false
    );
  }

});


/* =========================================================
   GOOGLE SIGN IN
========================================================= */

initGoogleSignIn({

  onSuccess:
    onLogin,

  onError:
    err => {

      console.error(
        "Google login error:",
        err
      );


      if ($("loginError")) {

        $("loginError").textContent =
          "Google login gagal. Pastikan OAuth Client ID dan Authorized JavaScript origins sudah benar.";

        show(
          "loginError",
          true
        );
      }

    }

});
