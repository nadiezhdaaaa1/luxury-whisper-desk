import { useEffect, useRef, useState } from "react";

const SIZE = 480;
const C = SIZE / 2;

// Watch geometry (matches the reference proportions)
const CASE_OUTER = 165;
const CASE_INNER = 156;
const BEZEL_OUTER = 150;
const BEZEL_INNER = 136;
const NUMERAL_R = 118;
const MINUTE_TRACK_R = 100;
const INNER_DIAL_R = 92;
const GEAR_CENTER_Y = C + 28;

// Dot look
const DOT_R = 1.4;
const MIN_DIST = 4.4; // > 2 * DOT_R + gap → no overlap at rest

type Pt = { x: number; y: number; p?: number }; // p = priority (higher = kept first)

/* ---------------- shape samplers ---------------- */

function arc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  spacing: number,
  p: number,
  out: Pt[],
) {
  const len = Math.abs(a1 - a0) * r;
  const n = Math.max(2, Math.round(len / spacing));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, p });
  }
}

function ring(cx: number, cy: number, r: number, spacing: number, p: number, out: Pt[]) {
  arc(cx, cy, r, 0, Math.PI * 2, spacing, p, out);
}

function seg(x1: number, y1: number, x2: number, y2: number, spacing: number, p: number, out: Pt[]) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(2, Math.round(len / spacing));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, p });
  }
}

function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
  p: number,
  out: Pt[],
) {
  for (let yy = 0; yy <= h; yy += step) {
    for (let xx = 0; xx <= w; xx += step) {
      out.push({ x: x + xx, y: y + yy, p });
    }
  }
}

/* ---------------- roman numerals via canvas raster ---------------- */

const ROMANS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function rasterGlyph(text: string, size: number): Pt[] {
  const pad = 4;
  const cvs = document.createElement("canvas");
  const ctx = cvs.getContext("2d")!;
  ctx.font = `600 ${size}px "Times New Roman", serif`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = Math.ceil(size * 1.2) + pad * 2;
  cvs.width = w;
  cvs.height = h;
  const ctx2 = cvs.getContext("2d")!;
  ctx2.font = `600 ${size}px "Times New Roman", serif`;
  ctx2.textBaseline = "middle";
  ctx2.fillStyle = "#fff";
  ctx2.fillText(text, pad, h / 2);
  const data = ctx2.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  const step = 2;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 140) pts.push({ x: x - w / 2, y: y - h / 2 });
    }
  }
  return pts;
}

/* ---------------- full geometry ---------------- */

function buildPoints(): Pt[] {
  const out: Pt[] = [];

  /* --- straps (drawn behind case) --- */
  const strapHalfTop = 62;
  const strapHalfBot = 56;
  const lugY = 58; // where strap meets case
  // Top strap
  seg(C - strapHalfTop, 8, C - strapHalfTop + 4, lugY, 3.5, 2, out);
  seg(C + strapHalfTop, 8, C + strapHalfTop - 4, lugY, 3.5, 2, out);
  seg(C - strapHalfTop, 8, C + strapHalfTop, 8, 3.5, 2, out);
  // Top strap highlight bands
  for (let i = 1; i <= 3; i++) {
    const y = 8 + i * 12;
    seg(C - strapHalfTop + 6, y, C + strapHalfTop - 6, y, 5, 1, out);
  }
  // Bottom strap
  seg(C - strapHalfBot, SIZE - 8, C - strapHalfBot + 4, SIZE - lugY, 3.5, 2, out);
  seg(C + strapHalfBot, SIZE - 8, C + strapHalfBot - 4, SIZE - lugY, 3.5, 2, out);
  seg(C - strapHalfBot, SIZE - 8, C + strapHalfBot, SIZE - 8, 3.5, 2, out);
  for (let i = 1; i <= 3; i++) {
    const y = SIZE - 8 - i * 12;
    seg(C - strapHalfBot + 6, y, C + strapHalfBot - 6, y, 5, 1, out);
  }

  /* --- lugs (short vertical strokes at 4 corners of case) --- */
  const lugs: Array<[number, number]> = [
    [-strapHalfTop, lugY],
    [strapHalfTop, lugY],
    [-strapHalfBot, SIZE - lugY],
    [strapHalfBot, SIZE - lugY],
  ];
  for (const [dx, y] of lugs) {
    seg(C + dx, y, C + dx * 0.9, y > C ? y - 12 : y + 12, 3, 2, out);
  }

  /* --- case (double outline) --- */
  ring(C, C, CASE_OUTER, 3.2, 3, out);
  ring(C, C, CASE_INNER, 3.2, 3, out);

  /* --- fluted bezel: rectangular tick blocks --- */
  const bezelMidR = (BEZEL_OUTER + BEZEL_INNER) / 2;
  const bezelBlocks = 60;
  for (let i = 0; i < bezelBlocks; i++) {
    const a = (i / bezelBlocks) * Math.PI * 2;
    const cx = C + Math.cos(a) * bezelMidR;
    const cy = C + Math.sin(a) * bezelMidR;
    // small radial rectangle
    const rOut = BEZEL_OUTER - 1;
    const rIn = BEZEL_INNER + 1;
    seg(
      C + Math.cos(a) * rIn,
      C + Math.sin(a) * rIn,
      C + Math.cos(a) * rOut,
      C + Math.sin(a) * rOut,
      2.5,
      3,
      out,
    );
    void cx;
    void cy;
  }
  ring(C, C, BEZEL_OUTER, 3, 3, out);
  ring(C, C, BEZEL_INNER, 3, 3, out);

  /* --- roman numerals ring --- */
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const cx = C + Math.cos(a) * NUMERAL_R;
    const cy = C + Math.sin(a) * NUMERAL_R;
    const glyph = rasterGlyph(ROMANS[h], 16);
    for (const g of glyph) out.push({ x: cx + g.x, y: cy + g.y, p: 6 });
    // small circle marker between numerals
    const a2 = ((h + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
    ring(C + Math.cos(a2) * NUMERAL_R, C + Math.sin(a2) * NUMERAL_R, 2.2, 1.4, 4, out);
  }

  /* --- minute track (fine ticks) --- */
  ring(C, C, MINUTE_TRACK_R, 3, 3, out);
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * Math.PI * 2 - Math.PI / 2;
    const inner = MINUTE_TRACK_R - 3;
    const outer = MINUTE_TRACK_R + (m % 5 === 0 ? 4 : 2);
    seg(
      C + Math.cos(a) * inner,
      C + Math.sin(a) * inner,
      C + Math.cos(a) * outer,
      C + Math.sin(a) * outer,
      2.5,
      3,
      out,
    );
  }

  /* --- inner dial ring --- */
  ring(C, C, INNER_DIAL_R, 3, 3, out);

  /* --- skeleton gear cluster (lower half) --- */
  // concentric arcs suggesting movement layers
  for (const r of [78, 68, 58]) {
    arc(C, C, r, Math.PI * 0.15, Math.PI * 0.85, 3, 3, out);
  }
  // main gear
  const gears: Array<[number, number, number, number]> = [
    [C, GEAR_CENTER_Y, 22, 14],
    [C - 26, GEAR_CENTER_Y + 4, 12, 10],
    [C + 26, GEAR_CENTER_Y + 4, 12, 10],
    [C, GEAR_CENTER_Y + 24, 10, 8],
  ];
  for (const [gx, gy, gr, teeth] of gears) {
    ring(gx, gy, gr, 2.4, 4, out);
    ring(gx, gy, gr - 5, 2.4, 4, out);
    ring(gx, gy, 1.6, 1.8, 4, out);
    // teeth
    for (let t = 0; t < teeth; t++) {
      const a = (t / teeth) * Math.PI * 2;
      seg(
        gx + Math.cos(a) * gr,
        gy + Math.sin(a) * gr,
        gx + Math.cos(a) * (gr + 2.5),
        gy + Math.sin(a) * (gr + 2.5),
        1.6,
        4,
        out,
      );
    }
  }

  /* --- ornate hour + minute hands (10:10 pose) --- */
  const drawHand = (angle: number, length: number, halfWidth: number) => {
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;
    // shaft edges
    seg(
      C + nx * 1.2,
      C + ny * 1.2,
      C + ux * length + nx * 0.6,
      C + uy * length + ny * 0.6,
      2.2,
      5,
      out,
    );
    seg(
      C - nx * 1.2,
      C - ny * 1.2,
      C + ux * length - nx * 0.6,
      C + uy * length - ny * 0.6,
      2.2,
      5,
      out,
    );
    // leaf bulge at ~60% length
    const mx = C + ux * length * 0.55;
    const my = C + uy * length * 0.55;
    for (let s = -1; s <= 1; s += 2) {
      const px = mx + nx * halfWidth * s;
      const py = my + ny * halfWidth * s;
      seg(mx - ux * halfWidth * 1.4 + nx * 0.4 * s, my - uy * halfWidth * 1.4 + ny * 0.4 * s, px, py, 2, 5, out);
      seg(px, py, mx + ux * halfWidth * 1.4 + nx * 0.4 * s, my + uy * halfWidth * 1.4 + ny * 0.4 * s, 2, 5, out);
    }
  };
  const hourA = ((10 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minA = (10 / 60) * Math.PI * 2 - Math.PI / 2;
  drawHand(hourA, 62, 3.5);
  drawHand(minA, 86, 3);
  // thin second hand at ~2 o'clock direction (matches reference sweep)
  const secA = (14 / 60) * Math.PI * 2 - Math.PI / 2;
  seg(C, C, C + Math.cos(secA) * 96, C + Math.sin(secA) * 96, 2.2, 5, out);

  // central boss + counterweight
  ring(C, C, 4, 1.8, 6, out);
  ring(C, C, 2, 1.6, 6, out);

  /* --- crown at 3 o'clock --- */
  const crownX = C + CASE_OUTER + 4;
  fillRect(crownX - 2, C - 8, 8, 16, 2.6, 3, out);
  for (let i = 0; i < 5; i++) {
    const y = C - 6 + i * 3;
    seg(crownX - 2, y, crownX + 6, y, 2, 3, out);
  }

  return out;
}

/* ---------------- Poisson-like non-overlap filter ---------------- */

function poissonFilter(pts: Pt[]): Pt[] {
  // sort by priority desc so structural points survive
  const sorted = pts.slice().sort((a, b) => (b.p ?? 0) - (a.p ?? 0));
  const cell = MIN_DIST;
  const cols = Math.ceil(SIZE / cell) + 2;
  const grid = new Map<number, Pt[]>();
  const key = (cx: number, cy: number) => cy * cols + cx;
  const kept: Pt[] = [];
  const minSq = MIN_DIST * MIN_DIST;
  for (const p of sorted) {
    if (p.x < 2 || p.x > SIZE - 2 || p.y < 2 || p.y > SIZE - 2) continue;
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    let ok = true;
    outer: for (let dy = -1; dy <= 1 && ok; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const bucket = grid.get(key(cx + dx, cy + dy));
        if (!bucket) continue;
        for (const q of bucket) {
          const ddx = q.x - p.x;
          const ddy = q.y - p.y;
          if (ddx * ddx + ddy * ddy < minSq) {
            ok = false;
            break outer;
          }
        }
      }
    }
    if (ok) {
      kept.push(p);
      const k = key(cx, cy);
      const arr = grid.get(k);
      if (arr) arr.push(p);
      else grid.set(k, [p]);
    }
  }
  return kept;
}

/* ---------------- animation ---------------- */

const INFLUENCE = 90;
const MIN_PULL = 4;
const MAX_PULL = 8;
const EASE = 0.18;

export function DotWatch() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dotsRef = useRef<SVGCircleElement[]>([]);
  const [homes, setHomes] = useState<Pt[]>([]);
  const offsetsRef = useRef<Float32Array | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  // build points once on client (rasterGlyph needs document)
  useEffect(() => {
    const raw = buildPoints();
    const filtered = poissonFilter(raw);
    offsetsRef.current = new Float32Array(filtered.length * 2);
    dotsRef.current = new Array(filtered.length);
    setHomes(filtered);
  }, []);

  useEffect(() => {
    if (!homes.length) return;
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
      const offsets = offsetsRef.current!;
      const { x: px, y: py, active } = pointerRef.current;
      for (let i = 0; i < homes.length; i++) {
        const h = homes[i];
        let tx = 0;
        let ty = 0;
        if (active) {
          const dx = px - h.x;
          const dy = py - h.y;
          const d = Math.hypot(dx, dy);
          if (d < INFLUENCE && d > 0.001) {
            const strength = MAX_PULL - (MAX_PULL - MIN_PULL) * (d / INFLUENCE);
            tx = (dx / d) * strength;
            ty = (dy / d) * strength;
          }
        }
        const ox = offsets[i * 2] + (tx - offsets[i * 2]) * EASE;
        const oy = offsets[i * 2 + 1] + (ty - offsets[i * 2 + 1]) * EASE;
        offsets[i * 2] = ox;
        offsets[i * 2 + 1] = oy;

        const el = dotsRef.current[i];
        if (el) el.setAttribute("transform", `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`);
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
      className="w-full h-full max-w-[460px] max-h-[460px] select-none touch-none"
      aria-hidden
    >
      {homes.map((p, i) => (
        <circle
          key={i}
          ref={(el) => {
            if (el) dotsRef.current[i] = el;
          }}
          cx={p.x}
          cy={p.y}
          r={DOT_R}
          fill="#ffffff"
          opacity={0.2}
          style={{ pointerEvents: "none" }}
        />
      ))}
    </svg>
  );
}
