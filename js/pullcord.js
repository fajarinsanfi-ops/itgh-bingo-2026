/*
 * PullCord — vanilla port adapted from mortspace/pullcord (MIT).
 *
 * The original component uses React + Motion. This project is plain HTML/JS,
 * so the React layer is removed while preserving the important behavior:
 * 17 Verlet rope nodes, distance constraints, gravity, damping, high-refresh
 * normalization, sleeping, scripted pull, drag-to-pull, and entrance handoff.
 */

const cord = document.getElementById("pullcord");
const knob = document.getElementById("pullcordKnob");
const path = document.getElementById("pullcordPath");
const group = document.getElementById("pullcordGroup");
const inner = document.getElementById("pullcordInner");

if (cord && knob && path && group && inner) {
  const W = 64;
  const ANCHOR_X = W / 2;
  const REST_Y = 176;
  const SVG_H = 340;
  const SEGMENTS = 16;
  const REST_SEG = REST_Y / SEGMENTS;
  const KNOB_R = 6.5;
  const HIT = 46;

  // Same defaults as the source config.ts.
  const cfg = {
    gravity: 1250,
    damping: 0.94,
    iterations: 20,
    stretchMax: 26,
    stretchToggle: 20,
    maxVelocity: 22,
    sleepVelocity: 0.15,
  };

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const nodes = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const y = REST_SEG * i;
    nodes.push({ x: ANCHOR_X, y, ox: ANCHOR_X, oy: y, fixed: i === 0 });
  }

  const last = nodes.length - 1;
  let dragging = false;
  let didDrag = false;
  let clicked = false;
  let raf = 0;
  let running = false;
  let prevT = 0;
  let prevDt = 0;
  let pointerId = null;
  let pointerStart = { x: 0, y: 0 };
  const target = { x: ANCHOR_X, y: REST_Y };

  function buildPath(points) {
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`;
    }
    d += ` L ${points[last].x.toFixed(1)} ${points[last].y.toFixed(1)}`;
    return d;
  }

  function render() {
    path.setAttribute("d", buildPath(nodes));
    group.setAttribute(
      "transform",
      `translate(${(nodes[last].x - ANCHOR_X).toFixed(2)} ${(nodes[last].y - REST_Y).toFixed(2)})`
    );
    knob.style.left = `${ANCHOR_X - HIT / 2}px`;
    knob.style.top = `${REST_Y - HIT / 2}px`;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = false;
    prevT = 0;
    prevDt = 0;
  }

  function step(now) {
    const dt = prevT
      ? Math.min(0.04, Math.max(0.004, (now - prevT) / 1000))
      : 1 / 60;
    prevT = now;

    const tc = prevDt > 0 ? dt / prevDt : 1;
    const velCoef = tc * Math.pow(cfg.damping, dt * 60);
    const accCoef = dt * dt;

    nodes[last].fixed = dragging;

    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i];
      if (p.fixed) continue;
      const vx = p.x - p.ox;
      const vy = p.y - p.oy;
      p.ox = p.x;
      p.oy = p.y;
      p.x += vx * velCoef;
      p.y += vy * velCoef + cfg.gravity * accCoef;
    }

    nodes[0].x = ANCHOR_X;
    nodes[0].y = 0;

    if (dragging) {
      nodes[last].ox = nodes[last].x;
      nodes[last].oy = nodes[last].y;
      nodes[last].x = target.x;
      nodes[last].y = target.y;
    }

    for (let k = 0; k < cfg.iterations; k++) {
      for (let i = 0; i < last; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = ((REST_SEG - dist) / dist) * 0.5;
        const ox = dx * diff;
        const oy = dy * diff;
        if (!a.fixed) {
          a.x -= ox;
          a.y -= oy;
        }
        if (!b.fixed) {
          b.x += ox;
          b.y += oy;
        }
      }
    }

    prevDt = dt;
    render();

    let speed = 0;
    for (let i = 1; i < nodes.length; i++) {
      speed += Math.abs(nodes[i].x - nodes[i].ox) + Math.abs(nodes[i].y - nodes[i].oy);
    }

    if (!dragging && speed < cfg.sleepVelocity * dt * 60) {
      running = false;
      raf = 0;
      return;
    }

    raf = requestAnimationFrame(step);
  }

  function wake() {
    if (running) return;
    running = true;
    prevT = 0;
    prevDt = 0;
    raf = requestAnimationFrame(step);
  }

  function toggleTheme() {
    // Reuse the existing app theme button/listener when available, so the
    // PullCord does not create a second source of truth for theme state.
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.click();
    } else {
      const current = document.documentElement.dataset.theme || "dark";
      document.documentElement.dataset.theme = current === "dark" ? "light" : "dark";
      localStorage.setItem("itgh.theme", current === "dark" ? "light" : "dark");
    }
    const light = (document.documentElement.dataset.theme || "dark") === "light";
    cord.setAttribute("aria-pressed", String(light));
    knob.setAttribute("aria-pressed", String(light));
  }

  function scriptedPull() {
    toggleTheme();
    if (reduce) return;
    nodes[last].oy -= 22;
    wake();
  }

  function pointInSvg(event) {
    const rect = cord.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = SVG_H / rect.height;
    return {
      x: (event.clientX - rect.left) * sx,
      y: (event.clientY - rect.top) * sy,
    };
  }

  knob.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (reduce) return;

    dragging = true;
    didDrag = true;
    clicked = false;
    pointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    knob.setPointerCapture?.(event.pointerId);
    wake();
    event.preventDefault();
  });

  knob.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;

    const p = pointInSvg(event);
    const offsetX = p.x - ANCHOR_X;
    const offsetY = p.y - REST_Y;
    const rx = offsetX;
    const ry = REST_Y + offsetY;
    const dist = Math.hypot(rx, ry) || 0.0001;
    const maxD = REST_Y + cfg.stretchMax;
    const scale = dist > maxD ? maxD / dist : 1;

    target.x = ANCHOR_X + rx * scale;
    target.y = ry * scale;

    const clickAt = Math.min(cfg.stretchToggle, cfg.stretchMax - 1);
    if (!clicked && dist - REST_Y >= clickAt) {
      clicked = true;
      toggleTheme();
    }

    wake();
  });

  function endDrag(event) {
    if (!dragging || (event.pointerId != null && event.pointerId !== pointerId)) return;
    dragging = false;

    const p = nodes[last];
    const vx = p.x - p.ox;
    const vy = p.y - p.oy;
    const v = Math.hypot(vx, vy);
    if (v > cfg.maxVelocity) {
      const k = cfg.maxVelocity / v;
      p.ox = p.x - vx * k;
      p.oy = p.y - vy * k;
    }

    knob.releasePointerCapture?.(pointerId);
    pointerId = null;
    wake();
    window.requestAnimationFrame(() => { didDrag = false; });
  }

  knob.addEventListener("pointerup", endDrag);
  knob.addEventListener("pointercancel", endDrag);

  knob.addEventListener("click", (event) => {
    if (didDrag) return;
    if (event.detail === 0) return;
    scriptedPull();
  });

  knob.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      event.preventDefault();
      scriptedPull();
    }
  });

  function endDrop() {
    if (!inner.classList.contains("pullcord-inner--drop")) return;
    inner.classList.remove("pullcord-inner--drop");
    if (reduce) return;
    nodes[last].oy -= 13;
    nodes[last].ox -= 6;
    wake();
  }

  inner.addEventListener("animationend", (event) => {
    if (event.animationName === "pullcord-drop") endDrop();
  });

  // Fallback if animationend is missed while the tab is backgrounded.
  window.setTimeout(endDrop, 1700);

  const currentTheme = document.documentElement.dataset.theme || "dark";
  const pulled = currentTheme === "light";
  cord.setAttribute("aria-pressed", String(pulled));
  knob.setAttribute("aria-pressed", String(pulled));
  render();
}
