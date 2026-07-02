import { useEffect, useRef, type RefObject } from "react";

type Props = {
  panelRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
};

export function HeroDotField({ panelRef, containerRef }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const container = containerRef.current;
    if (!layer || !container) return;

    // Skip on touch-only devices / reduced motion — leave layer inert.
    const isTouch = window.matchMedia("(hover: none)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduced) return;

    let raf = 0;
    let targetX = -9999;
    let targetY = -9999;
    let x = -9999;
    let y = -9999;
    let edge = 0;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      // Distance from cursor to nearest edge of the bento panel
      const panel = panelRef.current;
      if (!panel) {
        edge = 0;
        return;
      }
      const p = panel.getBoundingClientRect();
      const cx = e.clientX;
      const cy = e.clientY;
      const dx = Math.max(p.left - cx, 0, cx - p.right);
      const dy = Math.max(p.top - cy, 0, cy - p.bottom);
      const insideX = cx >= p.left && cx <= p.right;
      const insideY = cy >= p.top && cy <= p.bottom;
      const inside = insideX && insideY;
      const dist = inside ? Infinity : Math.hypot(dx, dy);
      // Fade in within 200px of the border, hide when inside the panel
      const NEAR = 80;
      const FAR = 200;
      if (inside) edge = 1;
      else if (dist <= NEAR) edge = 1;
      else if (dist >= FAR) edge = 0;
      else edge = 1 - (dist - NEAR) / (FAR - NEAR);
    };

    const onLeave = () => {
      edge = 0;
    };

    const tick = () => {
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      layer.style.setProperty("--x", `${x}px`);
      layer.style.setProperty("--y", `${y}px`);
      layer.style.setProperty("--edge", edge.toFixed(3));
      raf = requestAnimationFrame(tick);
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [panelRef, containerRef]);

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        opacity: "var(--edge, 0)",
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.18) 0.75px, transparent 1px)",
        backgroundSize: "10px 10px",
        WebkitMaskImage:
          "radial-gradient(180px circle at var(--x, -9999px) var(--y, -9999px), black 0%, rgba(0,0,0,0.6) 55%, transparent 100%)",
        maskImage:
          "radial-gradient(180px circle at var(--x, -9999px) var(--y, -9999px), black 0%, rgba(0,0,0,0.6) 55%, transparent 100%)",
        transition: "opacity 80ms ease-out",
      } as React.CSSProperties}
    />
  );
}
