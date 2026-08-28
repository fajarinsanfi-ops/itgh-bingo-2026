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

function show(id, visible=true){ $(id).hidden = !visible; }
function escapeHtml(value=""){ return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function toast(msg){ $("toast").textContent = msg; show("toast"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>show("toast",false),2800); }

function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("itgh.theme", theme);
  $("themeToggle").textContent = theme === "dark" ? "☀" : "☾";
}
applyTheme(localStorage.getItem("itgh.theme") || "dark");
$("themeToggle").addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));

function renderSelectors(){
  $("bingoSelector").innerHTML = ["A","B","C"].map(v =>
    `<button class="bingo-btn ${state.variant===v?"active":""}" data-v="${v}">BINGO ${v}</button>`
  ).join("");
  document.querySelectorAll(".bingo-btn").forEach(b => b.onclick = () => {
    state.variant=b.dataset.v; localStorage.setItem("itgh.variant",state.variant); subscribe(); render();
  });

  $("weekSelector").innerHTML = WEEKS.map(w =>
    `<button class="week-btn ${state.week===w.id?"active":""}" data-w="${w.id}">
      <small>${w.label}</small><b>${w.date}</b>
    </button>`
  ).join("");
  document.querySelectorAll(".week-btn").forEach(b => b.onclick = () => {
    state.week=Number(b.dataset.w); localStorage.setItem("itgh.week",state.week); subscribe(); render();
  });
}

function render(){
  renderSelectors();
  const board = BOARDS[state.variant] || [];
  $("boardTitle").textContent = `BINGO ${state.variant}`;
  $("recordLabel").textContent = `Minggu ${state.week} · Bingo ${state.variant}`;
  $("teamName").textContent = "ITGH Health Challenge";

  const completed = new Set(state.submissions.map(x => x.challengeIndex));
  $("boardGrid").innerHTML = board.map((c,i) => `
    <button class="cell ${c[3]} ${completed.has(i)?"done":""}" data-index="${i}">
      <span class="num">${i+1}</span>
      <span class="ct">${escapeHtml(c[0])}<br>${escapeHtml(c[1])}</span>
      <span class="ci">${c[2]}</span>
    </button>`).join("");

  document.querySelectorAll(".cell").forEach(btn => btn.onclick = () => openChallenge(Number(btn.dataset.index)));

  const count = completed.size;
  const pct = Math.round((count / board.length) * 100);
  $("progressText").textContent = `${count} / ${board.length}`;
  $("progressPct").textContent = `${pct}%`;
  $("progressLabel").textContent = `${count} challenge completed`;
  requestAnimationFrame(()=> $("progressFill").style.width = `${pct}%`);

  $("recordsBody").innerHTML = state.submissions.length ? state.submissions.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><b>${escapeHtml(r.challengeName || "Quiz ITGH")}</b><br><span style="color:var(--muted);font-size:8px">${escapeHtml(r.achievement || "")}</span></td>
      <td>${escapeHtml(r.target || "—")}</td>
      <td>${escapeHtml(r.userName || state.user.displayName || state.user.email)}</td>
      <td>${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("id-ID") : "Baru saja"}</td>
      <td><span class="done-pill">✓ Completed</span></td>
      <td>${r.evidenceUrl ? `<a class="proof" href="${r.evidenceUrl}" target="_blank" rel="noopener">📎 ${escapeHtml(r.evidenceName || "Evidence")}</a>` : "—"}</td>
    </tr>`).join("") :
    `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Belum ada submission untuk board/week ini.</td></tr>`;
}

function subscribe(){
  if (!state.user) return;
  state.unsubscribe?.();
  state.unsubscribe = listenSubmissions(
    { userId: state.user.uid, variant: state.variant, week: state.week },
    rows => { state.submissions = rows; render(); }
  );
}

function openChallenge(index){
  const c = BOARDS[state.variant][index];
  state.selected = index;
  $("modalIcon").textContent=c[2];
  $("modalCategory").textContent=c[3]==="red"?"Team Challenge":c[3]==="blue"?"Special Challenge":"Individual Challenge";
  $("modalTitle").textContent=c[0];
  $("modalTarget").textContent=c[4];
  $("achievementInput").value="";
  $("evidenceInput").value="";
  $("uploadStatus").textContent="";
  show("challengeModal");
}

async function submitChallenge(){
  if (state.selected === null) return;
  const achievement = $("achievementInput").value.trim();
  if (!achievement) return toast("Masukkan hasil/achievement terlebih dahulu.");

  const c = BOARDS[state.variant][state.selected];
  const btn = $("submitChallengeBtn");
  const file = $("evidenceInput").files[0];

  // Prevent accidental duplicate submissions for the same square in the same week/board.
  if (state.submissions.some(x => x.challengeIndex === state.selected)) {
    return toast("Challenge ini sudah pernah disubmit.");
  }

  try {
    btn.disabled=true; btn.textContent="Saving...";
    let evidence = {url:"",name:""};
    if (file) {
      $("uploadStatus").textContent = "Uploading evidence...";
      evidence = await uploadEvidence(state.user.uid, file);
    }

    await saveSubmission({
      userId: state.user.uid,
      userName: state.user.displayName || state.user.email,
      userEmail: state.user.email,
      variant: state.variant,
      week: state.week,
      challengeIndex: state.selected,
      challengeName: c[0],
      target: c[4],
      achievement,
      evidenceUrl: evidence.url,
      evidenceName: evidence.name
    });

    closeModal("challengeModal");
    toast("✓ Challenge berhasil disimpan.");
  } catch(err) {
    console.error(err);
    toast("Gagal menyimpan. Periksa Firebase configuration/rules.");
  } finally {
    btn.disabled=false; btn.textContent="Submit Challenge";
  }
}

function closeModal(id){ show(id,false); }

async function submitQuiz(){
  const correct = ["q1","q2","q3"].every(id => $(id).value === "y");
  if (!correct) return toast("Semua jawaban harus benar.");

  try {
    await saveSubmission({
      userId: state.user.uid,
      userName: state.user.displayName || state.user.email,
      userEmail: state.user.email,
      variant: state.variant,
      week: state.week,
      challengeIndex: -1,
      challengeName: "Quiz ITGH",
      target: "Quiz selesai",
      achievement: "All answers correct",
      evidenceUrl: "",
      evidenceName: "Quiz Result"
    });
    closeModal("quizModal");
    toast("🎉 Quiz berhasil diselesaikan.");
  } catch(err) {
    console.error(err);
    toast("Quiz gagal disimpan.");
  }
}

$("submitChallengeBtn").onclick = submitChallenge;
$("submitQuizBtn").onclick = submitQuiz;
$("quizBtn").onclick = () => show("quizModal");
document.querySelectorAll("[data-close]").forEach(b => b.onclick=()=>closeModal(b.dataset.close));
$("logoutBtn").onclick = async()=>{ state.unsubscribe?.(); await logout(); };

function onLogin(user){
  state.user=user;
  show("loginPage",false); show("appPage",true);
  $("userName").textContent=user.displayName || "Google User";
  $("userEmail").textContent=user.email || "";
  $("identityEmail").textContent=user.email || "";
  $("identityTeam").textContent="Authenticated with Google";
  $("userAvatar").src=user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
  saveProfile(user).catch(console.error);
  subscribe(); render();
}

watchAuth(user => {
  if (user) onLogin(user);
  else { show("loginPage",true); show("appPage",false); }
});

initGoogleSignIn({
  onSuccess: onLogin,
  onError: err => {
    console.error(err);
    $("loginError").textContent = "Google login gagal. Pastikan OAuth Client ID dan Authorized JavaScript origins sudah benar.";
    show("loginError");
  }
});
