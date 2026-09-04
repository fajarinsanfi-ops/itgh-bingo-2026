import { auth } from "./auth.js";
import { BOARDS } from "./data/boards.js";
import {
  saveBooking,
  listenTeamBookings,
  listenTeamSubmissions
} from "./db.js";

const state = {
  variant: localStorage.getItem("itgh.variant") || "A",
  week: Number(localStorage.getItem("itgh.week") || 1),
  bookings: [],
  submissions: [],
  unsubscribeBookings: null,
  unsubscribeSubmissions: null,
  initialized: false
};

const $ = id => document.getElementById(id);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(window.__bookingToast);
  window.__bookingToast = setTimeout(() => { el.hidden = true; }, 2800);
}

function currentContext() {
  return {
    variant: localStorage.getItem("itgh.variant") || "A",
    week: Number(localStorage.getItem("itgh.week") || 1)
  };
}

function isBookedByMe(index) {
  const uid = auth.currentUser?.uid;
  return !!uid && state.bookings.some(b =>
    b.userId === uid &&
    Number(b.challengeIndex) === Number(index)
  );
}

function bookingCount(index) {
  return state.bookings.filter(b => Number(b.challengeIndex) === Number(index)).length;
}

function completionCount(index) {
  return state.submissions.filter(s =>
    Number(s.challengeIndex) === Number(index)
  ).length;
}

function decorateBoard() {
  const grid = $("boardGrid");
  if (!grid) return;

  grid.querySelectorAll(".cell").forEach(cell => {
    if (cell.dataset.bookingDecorated === "1") return;
    const index = Number(cell.dataset.index);
    if (!Number.isInteger(index)) return;

    const booked = bookingCount(index);
    const completed = completionCount(index);
    const mine = isBookedByMe(index);

    const meta = document.createElement("span");
    meta.className = "booking-meta";
    meta.innerHTML = booked
      ? `<span class="booking-count">${booked} booked</span>${completed ? `<span class="completion-count">${completed} completed</span>` : ""}${mine ? `<span class="my-booking">✓ You booked</span>` : ""}`
      : `<span class="booking-available">Click to book</span>`;

    cell.appendChild(meta);
    cell.dataset.bookingDecorated = "1";

    if (mine) cell.classList.add("booked-by-me");
    if (booked) cell.classList.add("has-bookings");
    if (completed) cell.classList.add("has-completions");
  });
}

function refreshDecorations() {
  document.querySelectorAll("#boardGrid .cell").forEach(cell => {
    cell.dataset.bookingDecorated = "";
    cell.querySelector(".booking-meta")?.remove();
    cell.classList.remove("booked-by-me", "has-bookings", "has-completions");
  });
  decorateBoard();
}

function ensureBookingModal() {
  if ($("bookingModal")) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="bookingModal" class="modal-backdrop" hidden>
      <div class="modal glass booking-modal">
        <div class="modal-head">
          <div class="modal-icon" id="bookingModalIcon">🏃</div>
          <div>
            <small>ACTIVITY BOOKING</small>
            <h3 id="bookingModalTitle">Book Activity</h3>
          </div>
          <button class="close-btn" id="bookingCancelTop" type="button">×</button>
        </div>
        <div class="modal-body">
          <div class="target-box">
            <small>TARGET</small>
            <strong id="bookingModalTarget">—</strong>
          </div>
          <p class="booking-confirm-copy">Anda akan menandai activity ini sebagai <b>Booked</b>. Tidak perlu memilih tanggal atau jam. Setelah activity benar-benar dilakukan, gunakan form completion seperti biasa.</p>
          <div id="bookingModalCount" class="booking-modal-count"></div>
        </div>
        <div class="modal-footer">
          <button class="ghost-btn" id="bookingCancelBtn" type="button">Cancel</button>
          <button class="primary-btn" id="confirmBookingBtn" type="button">Book Activity</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrapper.firstElementChild);

  $("bookingCancelTop").onclick = closeBookingModal;
  $("bookingCancelBtn").onclick = closeBookingModal;
  $("confirmBookingBtn").onclick = confirmBooking;
}

let selectedIndex = null;

function openBookingModal(index) {
  const board = BOARDS[state.variant] || [];
  const challenge = board[index];
  if (!challenge) return;

  ensureBookingModal();
  selectedIndex = index;
  $("bookingModalIcon").textContent = challenge[2];
  $("bookingModalTitle").textContent = challenge[0];
  $("bookingModalTarget").textContent = challenge[4];
  $("bookingModalCount").textContent = bookingCount(index)
    ? `${bookingCount(index)} orang sudah booking activity ini.`
    : "Belum ada yang booking activity ini.";
  $("confirmBookingBtn").disabled = false;
  $("confirmBookingBtn").textContent = "Book Activity";
  $("bookingModal").hidden = false;
}

function closeBookingModal() {
  const modal = $("bookingModal");
  if (modal) modal.hidden = true;
  selectedIndex = null;
}

async function confirmBooking() {
  if (selectedIndex === null) return;
  const user = auth.currentUser;
  if (!user) {
    toast("Session Google tidak ditemukan.");
    closeBookingModal();
    return;
  }

  const index = selectedIndex;
  const variant = state.variant;
  const week = state.week;

  if (isBookedByMe(index)) {
    toast("Anda sudah booking activity ini.");
    closeBookingModal();
    return;
  }

  const board = BOARDS[variant] || [];
  const challenge = board[index];
  if (!challenge) return;

  const btn = $("confirmBookingBtn");
  btn.disabled = true;
  btn.textContent = "Booking...";

  try {
    await saveBooking({
      userId: user.uid,
      userName: user.displayName || user.email || "Google User",
      userEmail: user.email || "",
      variant,
      week,
      challengeIndex: index,
      challengeName: challenge[0],
      target: challenge[4]
    });
    toast("✓ Activity berhasil di-book.");
    closeBookingModal();
    refreshDecorations();
  } catch (err) {
    console.error("BOOKING ERROR:", err);
    toast(`Booking gagal: ${err?.code || err?.message || "unknown error"}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Book Activity";
  }
}

function handleBoardClick(event) {
  const cell = event.target.closest?.("#boardGrid .cell");
  if (!cell) return;

  const index = Number(cell.dataset.index);
  if (!Number.isInteger(index)) return;

  const mine = isBookedByMe(index);

  // Let the existing app open its completion form once this user has booked.
  if (mine) return;

  // A user must book before completing, but the same activity can be booked
  // by many users. Other people's bookings never lock the square.
  event.preventDefault();
  event.stopImmediatePropagation();
  openBookingModal(index);
}

function subscribeContext() {
  if (!auth.currentUser) {
    state.initialized = false;
    return;
  }

  const next = currentContext();
  if (next.variant === state.variant && next.week === state.week && state.initialized) return;

  state.variant = next.variant;
  state.week = next.week;
  state.bookings = [];
  state.submissions = [];
  state.unsubscribeBookings?.();
  state.unsubscribeSubmissions?.();

  state.unsubscribeBookings = listenTeamBookings(
    { variant: state.variant, week: state.week },
    rows => {
      state.bookings = Array.isArray(rows) ? rows : [];
      refreshDecorations();
    },
    error => console.error("Booking listener error:", error)
  );

  state.unsubscribeSubmissions = listenTeamSubmissions(
    { variant: state.variant, week: state.week },
    rows => {
      state.submissions = Array.isArray(rows) ? rows.filter(x => Number(x.challengeIndex) >= 0) : [];
      refreshDecorations();
    },
    error => console.error("Completion listener error:", error)
  );

  state.initialized = true;
  refreshDecorations();
}

function init() {
  ensureBookingModal();
  $("boardGrid")?.addEventListener("click", handleBoardClick, true);

  const observer = new MutationObserver(() => {
    const cells = document.querySelectorAll("#boardGrid .cell:not([data-booking-decorated])");
    if (cells.length) decorateBoard();
  });
  const grid = $("boardGrid");
  if (grid) observer.observe(grid, { childList: true, subtree: true });

  subscribeContext();

  setInterval(() => {
    const next = currentContext();
    if (next.variant !== state.variant || next.week !== state.week || (auth.currentUser && !state.initialized)) subscribeContext();
    if (auth.currentUser && document.querySelector("#boardGrid .cell:not([data-booking-decorated])")) decorateBoard();
  }, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
