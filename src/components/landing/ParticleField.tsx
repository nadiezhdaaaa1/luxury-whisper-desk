import { useEffect, useRef } from "react";

/**
 * Ambient particle field for the final CTA.
 * - Field of small circular dots on a fixed grid, jittered.
 * - Slow flow-field motion driven by layered sine waves (organic, seamless).
 * - Left-edge horizontal fade so dots don't compete with the headline.
 * - Cursor gently pushes nearby dots; they ease back home.
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
      hx: number; hy: number; // home
      ox: number; oy: number; // current offset from home
      vx: number; vy: number; // velocity (for pointer push easing)
      r: number;              // radius
      a: number;              // base alpha
      phase: number;          // per-dot phase
    };

    let particles: P[] = [];
    let w = 0, h = 0, dpr = 1;
    const pointer = { x: -9999, y: -9999, active: false };
    const POINTER_RADIUS = 140;
    const POINTER_FORCE = 34;

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

      // Grid spacing tuned for density ~ hundreds/thousands.
      const spacing = 14;
      const cols = Math.ceil(w / spacing) + 2;
      const rows = Math.ceil(h / spacing) + 2;
      const arr: P[] = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const jitterX = (Math.random() - 0.5) * spacing * 0.6;
          const jitterY = (Math.random() - 0.5) * spacing * 0.6;
          const hx = i * spacing - spacing + jitterX;
          const hy = j * spacing - spacing + jitterY;
          const size = Math.random();
          arr.push({
            hx, hy,
            ox: 0, oy: 0,
            vx: 0, vy: 0,
            r: size < 0.82 ? 0.9 : size < 0.97 ? 1.3 : 1.8,
            a: 0.28 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
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
    const onLeave = () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999; };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    // Pause when offscreen
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0 });
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

        // Left-edge fade so dots don't compete with the text.
        // Fully faded 0..40%, ramp to full by ~65%.
        const fadeStart = w * 0.32;
        const fadeEnd = w * 0.62;

        for (let k = 0; k < particles.length; k++) {
          const p = particles[k];

          // Flow field: layered sines produce slow, seamless drift.
          const nx = p.hx * 0.006;
          const ny = p.hy * 0.006;
          const flowX =
            Math.sin(nx + t * 0.18 + p.phase * 0.3) * 3.2 +
            Math.cos(ny * 1.3 - t * 0.11) * 2.4;
          const flowY =
            Math.cos(ny + t * 0.16 + p.phase * 0.2) * 3.2 +
            Math.sin(nx * 1.1 + t * 0.09) * 2.4;

          // Pointer repulsion (soft, eased return).
          if (pointer.active && !reduce) {
            const dx = (p.hx + p.ox) - pointer.x;
            const dy = (p.hy + p.oy) - pointer.y;
            const d2 = dx * dx + dy * dy;
            const R2 = POINTER_RADIUS * POINTER_RADIUS;
            if (d2 < R2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1 - d / POINTER_RADIUS);
              const push = f * f * POINTER_FORCE;
              p.vx += (dx / d) * push * dt * 6;
              p.vy += (dy / d) * push * dt * 6;
            }
          }

          // Ease offset toward flow target while applying velocity.
          const targetX = flowX;
          const targetY = flowY;
          p.ox += (targetX - p.ox) * 0.04 + p.vx * dt;
          p.oy += (targetY - p.oy) * 0.04 + p.vy * dt;
          // Damp velocity
          p.vx *= 0.90;
          p.vy *= 0.90;

          const x = p.hx + p.ox;
          const y = p.hy + p.oy;

          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;

          // Horizontal fade mask
          let mask = 1;
          if (x < fadeStart) mask = 0;
          else if (x < fadeEnd) mask = (x - fadeStart) / (fadeEnd - fadeStart);

          // Subtle scale breathing
          const breathe = 1 + Math.sin(t * 0.4 + p.phase) * 0.08;

          const alpha = p.a * mask;
          if (alpha < 0.01) continue;

          ctx.beginPath();
          ctx.fillStyle = `rgba(200, 220, 255, ${alpha.toFixed(3)})`;
          ctx.arc(x, y, p.r * breathe, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    if (reduce) {
      // Static render
      ctx.clearRect(0, 0, w, h);
      const fadeStart = w * 0.32;
      const fadeEnd = w * 0.62;
      for (const p of particles) {
        let mask = 1;
        if (p.hx < fadeStart) mask = 0;
        else if (p.hx < fadeEnd) mask = (p.hx - fadeStart) / (fadeEnd - fadeStart);
        const alpha = p.a * mask;
        if (alpha < 0.01) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha.toFixed(3)})`;
        ctx.arc(p.hx, p.hy, p.r, 0, Math.PI * 2);
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
