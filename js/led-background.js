/*
 * ITGH Bingo 2026 — LED Dot Matrix Background
 *
 * Based on the supplied LED dot-matrix background concept.
 * Kept as a standalone module so the existing application logic is untouched.
 */

const canvas = document.getElementById("ledBackground");
if (!canvas) {
  console.warn("LED background canvas not found.");
} else {
  const ctx = canvas.getContext("2d", { alpha: false });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let reducedMotion = false;

  const SPACING = 21;
  const MIN_RADIUS = 1.4;
  const MAX_RADIUS = 10.5;
  const SPEED = 0.72;
  const BLUE = 255;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function noise(x, y, t) {
    return (
      Math.sin(x * 0.010 + t * 0.55) +
      Math.sin(y * 0.013 - t * 0.38) +
      Math.sin((x + y) * 0.007 + t * 0.31) +
      Math.sin((x - y) * 0.004 - t * 0.23)
    ) / 4;
  }

  function waveField(x, y, t) {
    const cx1 = width * 0.50 + Math.sin(t * 0.32) * width * 0.42;
    const cy1 = height * 0.42 + Math.cos(t * 0.27) * height * 0.30;

    const cx2 = width * 0.95 + Math.cos(t * 0.21) * width * 0.35;
    const cy2 = height * 0.72 + Math.sin(t * 0.24) * height * 0.40;

    const d1 = Math.hypot(x - cx1, y - cy1);
    const d2 = Math.hypot(x - cx2, y - cy2);

    const w1 = Math.sin(d1 * 0.018 - t * 1.8);
    const w2 = Math.sin(d2 * 0.014 - t * 1.25);

    let field = w1 * 0.58 + w2 * 0.42;
    field += noise(x, y, t) * 0.30;
    field = (field + 1) / 2;

    return Math.max(0, Math.min(1, field));
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#00010a";
    ctx.fillRect(0, 0, width, height);

    const ambient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );

    ambient.addColorStop(0, "rgba(20, 0, 255, 0.08)");
    ambient.addColorStop(0.5, "rgba(0, 0, 100, 0.035)");
    ambient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, width, height);

    const offsetX = SPACING * 0.48;
    const offsetY = SPACING * 0.48;

    ctx.shadowBlur = 0;

    for (let y = offsetY; y < height + SPACING; y += SPACING) {
      for (let x = offsetX; x < width + SPACING; x += SPACING) {
        let intensity = Math.pow(waveField(x, y, t), 1.35);

        const micro = Math.sin(x * 0.031 + y * 0.017 + t * 0.8) * 0.045;
        intensity = Math.max(0, Math.min(1, intensity + micro));

        const radius = MIN_RADIUS + intensity * (MAX_RADIUS - MIN_RADIUS);
        const alpha = 0.18 + intensity * 0.82;
        const r = Math.round(5 + intensity * 18);
        const g = Math.round(intensity * 12);

        if (intensity > 0.55) {
          ctx.shadowBlur = intensity * 5;
          ctx.shadowColor = `rgba(20, 10, 255, ${intensity * 0.45})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${BLUE}, ${alpha})`;
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;

    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.25,
      width / 2,
      height / 2,
      height * 0.80
    );

    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.72, "rgba(0,0,0,0.08)");
    vignette.addColorStop(1, "rgba(0,0,0,0.38)");

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function animate(now) {
    if (reducedMotion) {
      draw(0);
      return;
    }

    const time = (now - start) / 1000;
    draw(time * SPEED);
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = motionQuery.matches;
  motionQuery.addEventListener?.("change", event => {
    reducedMotion = event.matches;
    if (!reducedMotion) requestAnimationFrame(animate);
  });

  let start = performance.now();
  requestAnimationFrame(animate);
}
