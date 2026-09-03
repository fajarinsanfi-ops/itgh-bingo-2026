/*
 * PullCord-inspired vanilla implementation for the existing GitHub Pages app.
 * The original FeralUI component is React/TypeScript; this small adapter keeps
 * the same interaction idea without adding React or npm dependencies.
 * Source inspiration: https://github.com/mortspace/pullcord (MIT).
 */

const cord = document.getElementById("pullcord");
if (cord) {
  const handle = cord.querySelector(".pullcord-handle");
  const rope = cord.querySelector(".pullcord-rope");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let dragging = false;
  let startY = 0;
  let activated = false;

  const getTheme = () => document.documentElement.dataset.theme || "dark";

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("itgh.theme", theme);
    cord.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function resetPull() {
    dragging = false;
    cord.classList.remove("is-dragging", "is-pulled");
    if (handle) handle.style.top = "113px";
    if (rope) rope.style.height = "112px";
  }

  function updatePull(clientY) {
    const delta = Math.max(0, Math.min(32, clientY - startY));
    if (handle) handle.style.top = `${113 + delta}px`;
    if (rope) rope.style.height = `${112 + delta}px`;
    if (delta >= 20 && !activated) {
      activated = true;
      cord.classList.add("is-pulled");
      toggleTheme();
    }
  }

  cord.addEventListener("pointerdown", event => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    dragging = true;
    activated = false;
    startY = event.clientY;
    cord.classList.add("is-dragging");
    cord.setPointerCapture?.(event.pointerId);
    if (reducedMotion) toggleTheme();
  });

  cord.addEventListener("pointermove", event => {
    if (dragging && !reducedMotion) updatePull(event.clientY);
  });

  cord.addEventListener("pointerup", event => {
    if (!dragging) return;
    if (!activated && !reducedMotion && Math.abs(event.clientY - startY) < 8) toggleTheme();
    resetPull();
  });

  cord.addEventListener("pointercancel", resetPull);
  cord.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTheme();
    }
  });

  cord.addEventListener("click", event => {
    // Pointer interaction handles normal clicks. This fallback covers keyboard
    // activation consistently without changing the existing theme system.
    if (event.detail === 0) return;
  });

  cord.setAttribute("aria-pressed", String(getTheme() === "dark"));
}
