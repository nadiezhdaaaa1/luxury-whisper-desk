import { useEffect, useMemo, useRef } from "react";

const SIZE = 420;
const CENTER = SIZE / 2;
const CASE_R = 110;
const BEZEL_R = 96;

type Pt = { x: number; y: number };

function circle(cx: number, cy: number, r: number, count: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function line(x1: number, y1: number, x2: number, y2: number, count: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

function buildPoints(): Pt[] {
  const pts: Pt[] = [];

  // Case outline (two concentric rings)
  pts.push(...circle(CENTER, CENTER, CASE_R, 96));
  pts.push(...circle(CENTER, CENTER, CASE_R - 6, 90));

  // Inner bezel
  pts.push(...circle(CENTER, CENTER, BEZEL_R, 80));

  // Hour markers
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const outer = BEZEL_R - 6;
    const inner = h % 3 === 0 ? BEZEL_R - 22 : BEZEL_R - 14;
    const count = h % 3 === 0 ? 5 : 3;
    pts.push(
      ...line(
        CENTER + Math.cos(a) * outer,
        CENTER + Math.sin(a) * outer,
        CENTER + Math.cos(a) * inner,
        CENTER + Math.sin(a) * inner,
        count,
      ),
    );
  }

  // Hands — showing 10:10 (classic watch pose)
  // Hour hand at 10
  const hourAngle = ((10 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  pts.push(
    ...line(
      CENTER,
      CENTER,
      CENTER + Math.cos(hourAngle) * 52,
      CENTER + Math.sin(hourAngle) * 52,
      14,
    ),
  );
  // Minute hand at 10
  const minAngle = (10 / 60) * Math.PI * 2 - Math.PI / 2;
  pts.push(
    ...line(
      CENTER,
      CENTER,
      CENTER + Math.cos(minAngle) * 76,
      CENTER + Math.sin(minAngle) * 76,
      20,
    ),
  );
  // Second hand at 30 (pointing down)
  const secAngle = (30 / 60) * Math.PI * 2 - Math.PI / 2;
  pts.push(
    ...line(
      CENTER,
      CENTER,
      CENTER + Math.cos(secAngle) * 82,
      CENTER + Math.sin(secAngle) * 82,
      22,
    ),
  );
  // Center pin
  pts.push(...circle(CENTER, CENTER, 4, 8));

  // Crown (right side)
  pts.push(...circle(CENTER + CASE_R + 6, CENTER, 5, 10));
  pts.push(...line(CENTER + CASE_R, CENTER - 4, CENTER + CASE_R + 10, CENTER - 4, 4));
  pts.push(...line(CENTER + CASE_R, CENTER + 4, CENTER + CASE_R + 10, CENTER + 4, 4));

  // Straps — trapezoids above and below
  const strapTopY1 = CENTER - CASE_R - 4;
  const strapTopY2 = 20;
  const strapBotY1 = CENTER + CASE_R + 4;
  const strapBotY2 = SIZE - 20;

  // Top strap outline: taper from case width to ~70% at top
  const topOuterLeft = line(CENTER - 70, strapTopY1, CENTER - 55, strapTopY2, 18);
  const topOuterRight = line(CENTER + 70, strapTopY1, CENTER + 55, strapTopY2, 18);
  const botOuterLeft = line(CENTER - 70, strapBotY1, CENTER - 55, strapBotY2, 18);
  const botOuterRight = line(CENTER + 70, strapBotY1, CENTER + 55, strapBotY2, 18);
  pts.push(...topOuterLeft, ...topOuterRight, ...botOuterLeft, ...botOuterRight);

  // Strap stitching / cross-lines
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const yTop = strapTopY1 + (strapTopY2 - strapTopY1) * t;
    const xLT = -70 + (-55 - -70) * t;
    const xRT = 70 + (55 - 70) * t;
    pts.push(...line(CENTER + xLT, yTop, CENTER + xRT, yTop, 10));

    const yBot = strapBotY1 + (strapBotY2 - strapBotY1) * t;
    const xLB = -70 + (-55 - -70) * t;
    const xRB = 70 + (55 - 70) * t;
    pts.push(...line(CENTER + xLB, yBot, CENTER + xRB, yBot, 10));
  }

  // Buckle at bottom
  pts.push(...circle(CENTER, SIZE - 30, 12, 20));
  pts.push(...circle(CENTER, SIZE - 30, 6, 12));

  return pts;
}

const INFLUENCE = 90;
const MIN_PULL = 4;
const MAX_PULL = 8;
const EASE = 0.18;

export function DotWatch() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dotsRef = useRef<SVGCircleElement[]>([]);
  const homes = useMemo(buildPoints, []);
  const offsetsRef = useRef<Float32Array>(new Float32Array(homes.length * 2));
  const targetsRef = useRef<Float32Array>(new Float32Array(homes.length * 2));
  const scalesRef = useRef<Float32Array>(new Float32Array(homes.length).fill(1));
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const svg = svgRef.current;
    if (!svg) return;

    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = SIZE / rect.width;
      const scaleY = SIZE / rect.height;
      pointerRef.current.x = (e.clientX - rect.left) * scaleX;
      pointerRef.current.y = (e.clientY - rect.top) * scaleY;
      pointerRef.current.active = true;
    };
    const onLeave = () => {
      pointerRef.current.active = false;
    };

    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);

    const tick = () => {
      const offsets = offsetsRef.current;
      const targets = targetsRef.current;
      const scales = scalesRef.current;
      const { x: px, y: py, active } = pointerRef.current;

      for (let i = 0; i < homes.length; i++) {
        const h = homes[i];
        let tx = 0;
        let ty = 0;
        let ts = 1;
        if (active) {
          const dx = px - h.x;
          const dy = py - h.y;
          const d = Math.hypot(dx, dy);
          if (d < INFLUENCE && d > 0.001) {
            const t = 1 - d / INFLUENCE;
            const strength = MIN_PULL + (MAX_PULL - MIN_PULL) * t;
            tx = (dx / d) * strength;
            ty = (dy / d) * strength;
            ts = 1 + 0.1 * t;
          }
        }
        targets[i * 2] = tx;
        targets[i * 2 + 1] = ty;

        const ox = offsets[i * 2] + (tx - offsets[i * 2]) * EASE;
        const oy = offsets[i * 2 + 1] + (ty - offsets[i * 2 + 1]) * EASE;
        offsets[i * 2] = ox;
        offsets[i * 2 + 1] = oy;

        const s = scales[i] + (ts - scales[i]) * EASE;
        scales[i] = s;

        const el = dotsRef.current[i];
        if (el) {
          const tx2 = h.x + ox;
          const ty2 = h.y + oy;
          el.setAttribute(
            "transform",
            `translate(${tx2.toFixed(2)} ${ty2.toFixed(2)}) scale(${s.toFixed(3)})`,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerleave", onLeave);
    };
  }, [homes]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-full max-w-[420px] max-h-[420px] translate-x-12 select-none touch-none"
      aria-hidden
    >
      {homes.map((p, i) => (
        <circle
          key={i}
          ref={(el) => {
            if (el) dotsRef.current[i] = el;
          }}
          cx={0}
          cy={0}
          r={1.5}
          fill="#ffffff"
          opacity={0.2}
          transform={`translate(${p.x} ${p.y})`}
          style={{ pointerEvents: "none" }}
        />
      ))}
    </svg>
  );
}
