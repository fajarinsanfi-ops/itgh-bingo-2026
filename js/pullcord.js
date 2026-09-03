/*
 * PullCord-inspired vanilla implementation for the existing GitHub Pages app.
 * Adapted from mortspace/pullcord (MIT) while keeping the existing app theme
 * storage/toggle logic intact.
 */

const cord = document.getElementById("pullcord");
if (cord) {
  const handle = cord.querySelector(".pullcord-handle");
  const rope = cord.querySelector(".pullcord-rope");
  const mount = cord.querySelector(".pullcord-mount");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let activated = false;
  let raf = 0;
  let vx = 0;
  let vy = 0;
  let x = 32;
  let y = 120;
  let lastT = 0;

  const REST_Y = 120;
  const MAX_PULL = 46;
  const ACTUATE_AT = 22;
  const SPRING = 0.18;
  const DAMPING = 0.78;

  const getTheme = () => document.documentElement.dataset.theme || "dark";

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("itgh.theme", theme);
    cord.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function applyGeometry() {
    const dx = x - 32;
    if (rope) {
      rope.style.height = `${Math.max(20, y)}px`;
      rope.style.transform = `translateX(-50%) rotate(${dx * 0.08}deg)`;
    }
    if (handle) {
      handle.style.left = `${x}px`;
      handle.style.top = `${y}px`;
      handle.style.transform = "translate(-50%, -50%)";
    }
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastT = 0;
  }

  function frame(now) {
    if (!lastT) lastT = now;
    const dt = Math.min(0.04, (now - lastT) / 1000);
    lastT = now;

    if (!dragging) {
      vx += (32 - x) * SPRING;
      vy += (REST_Y - y) * SPRING;
      vx *= DAMPING;
      vy *= DAMPING;
      x += vx * dt * 60;
      y += vy * dt * 60;

      if (Math.abs(x - 32) < 0.05 && Math.abs(y - REST_Y) < 0.05 && Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
        x = 32;
        y = REST_Y;
        applyGeometry();
        stopLoop();
        return;
      }
    }

    applyGeometry();
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }

  function resetPull() {
    dragging = false;
    activated = false;
    cord.classList.remove("is-dragging", "is-pulled");
    vx = Math.max(-1.6, Math.min(1.6, vx));
    vy = Math.max(-2.2, Math.min(2.2, vy));
    wake();
  }

  function updatePull(clientX, clientY) {
    const dx = clientX - startX;
    const dy = Math.max(0, Math.min(MAX_PULL, clientY - startY));
    x = Math.max(20, Math.min(44, 32 + dx * 0.35));
    y = REST_Y + dy;
    applyGeometry();

    if (dy >= ACTUATE_AT && !activated) {
      activated = true;
      cord.classList.add("is-pulled");
      toggleTheme();
    }
  }

  cord.addEventListener("pointerdown", event => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    dragging = true;
    activated = false;
    startX = event.clientX;
    startY = event.clientY;
    vx = 0;
    vy = 0;
    cord.classList.add("is-dragging");
    cord.setPointerCapture?.(event.pointerId);
    wake();

    if (reducedMotion) toggleTheme();
  });

  cord.addEventListener("pointermove", event => {
    if (!dragging || reducedMotion) return;
    updatePull(event.clientX, event.clientY);
  });

  cord.addEventListener("pointerup", event => {
    if (!dragging) return;
    const wasClick = Math.abs(event.clientY - startY) < 8 && Math.abs(event.clientX - startX) < 8;
    if (!activated && !reducedMotion && wasClick) toggleTheme();
    resetPull();
  });

  cord.addEventListener("pointercancel", resetPull);

  cord.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTheme();
      if (!reducedMotion) {
        y = REST_Y + 18;
        vy = -2;
        wake();
      }
    }
  });

  applyGeometry();
  cord.setAttribute("aria-pressed", String(getTheme() === "dark"));
  // The original control is intentionally positioned below the topbar so the
  // Sign in / Sign out controls remain fully unobstructed.
  if (mount) mount.setAttribute("aria-hidden", "true");
}
