import { auth } from "./auth.js";
import { BOARDS } from "./data/boards.js";
import { saveBooking, listenTeamBookings, listenTeamSubmissions } from "./db.js";

const state = { variant: localStorage.getItem("itgh.variant") || "A", week: Number(localStorage.getItem("itgh.week") || 1), bookings: [], submissions: [], unsubscribeBookings: null, unsubscribeSubmissions: null, initialized: false };
const $ = id => document.getElementById(id);
function toast(message) { const el = $("toast"); if (!el) return; el.textContent = message; el.hidden = false; clearTimeout(window.__bookingToast); window.__bookingToast = setTimeout(() => { el.hidden = true; }, 2800); }
function currentContext() { return { variant: localStorage.getItem("itgh.variant") || "A", week: Number(localStorage.getItem("itgh.week") || 1) }; }
function isBookedByMe(index) { const uid = auth.currentUser?.uid; return !!uid && state.bookings.some(b => b.userId === uid && Number(b.challengeIndex) === Number(index)); }
function bookingCount(index) { return state.bookings.filter(b => Number(b.challengeIndex) === Number(index)).length; }
function completionCount(index) { return state.submissions.filter(s => Number(s.challengeIndex) === Number(index)).length; }
function decorateBoard() {
  document.querySelectorAll("#boardGrid .cell").forEach(cell => {
    const index = Number(cell.dataset.index); if (!Number.isInteger(index)) return;
    let meta = cell.querySelector(".booking-meta");
    if (!meta) { meta = document.createElement("span"); meta.className = "booking-meta"; cell.appendChild(meta); }
    const booked = bookingCount(index), completed = completionCount(index), mine = isBookedByMe(index);
    const html = booked ? `<span class="booking-count">${booked} booked</span>${completed ? `<span class="completion-count">${completed} completed</span>` : ""}${mine ? `<span class="my-booking">✓ You booked</span>` : ""}` : `<span class="booking-available">Booking optional</span>`;
    // Do not rewrite DOM when nothing changed. Rewriting here used to trigger
    // the MutationObserver below continuously and could freeze the browser.
    if (meta.innerHTML !== html) meta.innerHTML = html;
    cell.classList.toggle("booked-by-me", mine); cell.classList.toggle("has-bookings", booked > 0); cell.classList.toggle("has-completions", completed > 0);
  });
}
function currentChallengeIndex() { const title = $("modalTitle")?.textContent || ""; return (BOARDS[state.variant] || []).findIndex(c => c?.[0] === title); }
function updateFormBookingStatus() {
  const status = $("bookingStatus"), button = $("bookActivityBtn"); if (!status || !button) return;
  const index = currentChallengeIndex(); if (index < 0) { status.hidden = true; return; }
  const count = bookingCount(index), mine = isBookedByMe(index);
  status.hidden = false; status.textContent = count ? `${count} ${count === 1 ? "person" : "people"} booked${mine ? " · ✓ You booked" : ""}` : "No one has booked this activity yet.";
  button.disabled = mine; button.textContent = mine ? "✓ You Booked" : "📌 Book Activity";
}
async function bookCurrentActivity() {
  const user = auth.currentUser, index = currentChallengeIndex(); if (!user || index < 0) { toast("Session Google atau activity tidak ditemukan."); return; }
  if (isBookedByMe(index)) { toast("Anda sudah booking activity ini."); updateFormBookingStatus(); return; }
  const challenge = (BOARDS[state.variant] || [])[index], button = $("bookActivityBtn"), variant = state.variant, week = state.week;
  button.disabled = true; button.textContent = "Booking...";
  try {
    await saveBooking({ userId: user.uid, userName: user.displayName || user.email || "Google User", userEmail: user.email || "", variant, week, challengeIndex: index, challengeName: challenge[0], target: challenge[4] });
    toast("✓ Activity berhasil di-book."); updateFormBookingStatus();
  } catch (err) { console.error("BOOKING ERROR:", err); toast(`Booking gagal: ${err?.code || err?.message || "unknown error"}`); button.disabled = false; button.textContent = "📌 Book Activity"; }
}
function subscribeContext() {
  if (!auth.currentUser) { state.initialized = false; return; }
  const next = currentContext(); if (next.variant === state.variant && next.week === state.week && state.initialized) return;
  state.variant = next.variant; state.week = next.week; state.bookings = []; state.submissions = [];
  state.unsubscribeBookings?.(); state.unsubscribeSubmissions?.();
  state.unsubscribeBookings = listenTeamBookings({ variant: state.variant, week: state.week }, rows => { state.bookings = Array.isArray(rows) ? rows : []; decorateBoard(); updateFormBookingStatus(); }, error => console.error("Booking listener error:", error));
  state.unsubscribeSubmissions = listenTeamSubmissions({ variant: state.variant, week: state.week }, rows => { state.submissions = Array.isArray(rows) ? rows.filter(x => Number(x.challengeIndex) >= 0) : []; decorateBoard(); updateFormBookingStatus(); }, error => console.error("Completion listener error:", error));
  state.initialized = true; decorateBoard();
}
function init() {
  $("bookActivityBtn")?.addEventListener("click", bookCurrentActivity);
  subscribeContext();
  setInterval(() => { const next = currentContext(); if (next.variant !== state.variant || next.week !== state.week || (auth.currentUser && !state.initialized)) subscribeContext(); decorateBoard(); updateFormBookingStatus(); }, 1000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
