import { useEffect, useRef } from "react";

/**
 * Ambient grid field for the final CTA.
 * - Strict grid of dots (no jitter).
 * - Brightness + size ripple across the grid in slow diagonal waves.
 * - Left-edge horizontal fade so dots don't compete with the headline.
 * - Cursor gently pushes nearby dots; they ease back to their grid slot.
 * - Pauses when offscreen, respects prefers-reduced-motion.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type P = {
      hx: number;
      hy: number; // grid slot (home)
      gx: number;
      gy: number; // integer grid indices
      ox: number;
      oy: number; // pointer-driven display offset
      vx: number;
      vy: number; // velocity for pointer push easing
    };

    let particles: P[] = [];
    let w = 0,
      h = 0,
      dpr = 1;
    const pointer = { x: -9999, y: -9999, active: false };
    const POINTER_RADIUS = 140;
    const POINTER_FORCE = 34;
    const BASE_ALPHA = 0.55;
    const BASE_R = 1.0;

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = 14;
      const cols = Math.ceil(w / spacing) + 2;
      const rows = Math.ceil(h / spacing) + 2;
      const arr: P[] = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          arr.push({
            hx: i * spacing - spacing,
            hy: j * spacing - spacing,
            gx: i,
            gy: j,
            ox: 0,
            oy: 0,
            vx: 0,
            vy: 0,
          });
        }
      }
      particles = arr;
    };

    build();

    const ro = new ResizeObserver(build);
    ro.observe(wrap);

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(wrap);

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const draw = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      if (visible) {
        t += dt;

        ctx.clearRect(0, 0, w, h);

        const fadeStart = w * 0.32;
        const fadeEnd = w * 0.62;

        for (let k = 0; k < particles.length; k++) {
          const p = particles[k];

          // Warped density waves — sine-of-sine bends the crests into
          // natural, swell-like fronts instead of straight diagonals.
          const u = p.gx + p.gy + 1.8 * Math.sin(p.gy * 0.18 + t * 0.15);
          const v = p.gx - p.gy + 1.6 * Math.sin(p.gx * 0.16 - t * 0.12);
          const wave1 = 0.5 + 0.5 * Math.sin(u * 0.32 - t * 0.55);
          const wave2 = 0.5 + 0.5 * Math.sin(v * 0.2 + t * 0.33);
          // Slow off-angle swell for large drifting gusts.
          const wave3 = 0.5 + 0.5 * Math.sin(p.gx * 0.09 + p.gy * 0.13 + t * 0.18);
          let intensity = 0.5 * wave1 + 0.3 * wave2 + 0.2 * wave3;
          // Smoothstep: crests brighter, troughs quieter, natural rolling feel.
          intensity = intensity * intensity * (3 - 2 * intensity);

          // Pointer repulsion (soft, eased return to grid slot).
          if (pointer.active && !reduce) {
            const dx = p.hx + p.ox - pointer.x;
            const dy = p.hy + p.oy - pointer.y;
            const d2 = dx * dx + dy * dy;
            const R2 = POINTER_RADIUS * POINTER_RADIUS;
            if (d2 < R2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = 1 - d / POINTER_RADIUS;
              const push = f * f * POINTER_FORCE;
              p.vx += (dx / d) * push * dt * 6;
              p.vy += (dy / d) * push * dt * 6;
            }
          }

          // Ease offset back toward 0 (grid slot) while applying velocity.
          p.ox += (0 - p.ox) * 0.06 + p.vx * dt;
          p.oy += (0 - p.oy) * 0.06 + p.vy * dt;
          p.vx *= 0.9;
          p.vy *= 0.9;

          const x = p.hx + p.ox;
          const y = p.hy + p.oy;

          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;

          let mask = 1;
          if (x < fadeStart) mask = 0;
          else if (x < fadeEnd) mask = (x - fadeStart) / (fadeEnd - fadeStart);

          const brightStart = w * 0.6;
          const bright =
            x <= brightStart ? 1 : 1 + 0.2 * ((x - brightStart) / Math.max(1, w - brightStart));

          const vpScale = window.innerWidth < 1024 ? 0.8 : 1;
          const alpha = BASE_ALPHA * (0.35 + 0.65 * intensity) * mask * bright * vpScale;
          if (alpha < 0.01) continue;
          const r = BASE_R * (0.85 + 0.35 * intensity);

          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    if (reduce) {
      // Static grid at mid intensity.
      ctx.clearRect(0, 0, w, h);
      const fadeStart = w * 0.32;
      const fadeEnd = w * 0.62;
      for (const p of particles) {
        let mask = 1;
        if (p.hx < fadeStart) mask = 0;
        else if (p.hx < fadeEnd) mask = (p.hx - fadeStart) / (fadeEnd - fadeStart);
        const brightStart = w * 0.6;
        const bright =
          p.hx <= brightStart ? 1 : 1 + 0.2 * ((p.hx - brightStart) / Math.max(1, w - brightStart));
        const vpScale = window.innerWidth < 1024 ? 0.8 : 1;
        const alpha = BASE_ALPHA * 0.675 * mask * bright * vpScale;
        if (alpha < 0.01) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.arc(p.hx, p.hy, BASE_R, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-auto" aria-hidden>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
