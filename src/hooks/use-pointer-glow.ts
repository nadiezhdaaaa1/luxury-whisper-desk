import { useEffect, useRef } from "react";

/**
 * Physical-button pointer feedback.
 *
 * Desktop: an edge-origin glow. On pointerenter the lerp position is *seeded*
 * to the entry coordinate, so the glow blooms from the edge the pointer just
 * crossed instead of gliding in from wherever it was last, then trails the
 * cursor. Same 0.18 lerp factor as HeroDotField.
 *
 * Touch: no glow (a glow under a fingertip is invisible) — a ripple expands
 * from the contact point instead.
 */
export function usePointerGlow<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let tapTimer: ReturnType<typeof setTimeout> | undefined;

    const write = () => {
      el.style.setProperty("--glow-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--glow-y", `${y.toFixed(1)}px`);
    };

    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      write();
      raf = requestAnimationFrame(tick);
    };

    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const [px, py] = local(e);
      x = tx = px;
      y = ty = py;
      write();
      el.style.setProperty("--glow-o", "1");
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const [px, py] = local(e);
      tx = px;
      ty = py;
    };

    const onLeave = () => {
      el.style.setProperty("--glow-o", "0");
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const [px, py] = local(e);
      el.style.setProperty("--tap-x", `${px}px`);
      el.style.setProperty("--tap-y", `${py}px`);
      el.classList.remove("btn-tapping");
      void el.offsetWidth; // force reflow so the animation restarts
      el.classList.add("btn-tapping");
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => el.classList.remove("btn-tapping"), 640);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(tapTimer);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return ref;
}
