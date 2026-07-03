import { useEffect, useRef, useState } from "react";

const SIZE = 480;
const C = SIZE / 2;

const R_THICK = 2.2;
const R_THIN = 1.1;
const MIN_DIST_THICK = 6.0;
const MIN_DIST_THIN = 3.2;
const EDGE_THRESHOLD = 4; // pixels: >= is "thick mass", < is "thin line"

type Pt = { x: number; y: number; r: number };

/* -------- rasterize the watch silhouette -------- */

function rasterizeWatch(): { mask: Uint8Array; thinMask: Uint8Array; w: number; h: number } {
  const cvs = document.createElement("canvas");
  cvs.width = SIZE;
  cvs.height = SIZE;
  const ctx = cvs.getContext("2d")!;
  ctx.fillStyle = "#000";

  const tilt = -0.42; // radians, ~ -24° (case leans upper-left, straps run upper-right / lower-left)
  const caseOuter = 96;
  const caseInner = 74; // creates the thick bezel donut

  ctx.save();
  ctx.translate(C, C);
  ctx.rotate(tilt);

  // --- straps (drawn first so case overlaps them) ---
  const strapHalfWidth = 44;
  const strapNearCase = caseOuter - 8; // start slightly inside case edge
  const strapFar = 210;

  const drawStrap = (dir: 1 | -1) => {
    // trapezoid: wider near case, slightly tapered at far end
    const nearY = dir * strapNearCase;
    const farY = dir * strapFar;
    const nearHalf = strapHalfWidth;
    const farHalf = strapHalfWidth - 8;
    ctx.beginPath();
    ctx.moveTo(-nearHalf, nearY);
    ctx.lineTo(nearHalf, nearY);
    ctx.lineTo(farHalf, farY);
    ctx.lineTo(-farHalf, farY);
    ctx.closePath();
    ctx.fill();
    // buckle notch (small rect near strap end, offset to one side)
    const buckleY = dir * (strapFar - 18);
    ctx.fillRect(-6, buckleY - 6, 12, 12);
  };
  drawStrap(-1); // upper strap (post-tilt, extends upper-right in screen)
  drawStrap(1); // lower strap

  // --- case: donut (outer black filled disk minus inner white disk) ---
  ctx.beginPath();
  ctx.arc(0, 0, caseOuter, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, 0, caseInner, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- crown (small nub at 3 o'clock of the case, pre-tilt) ---
  ctx.fillRect(caseOuter - 2, -6, 10, 12);

  ctx.restore();

  // extract full mask
  const img = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const mask = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    mask[i] = img[i * 4 + 3] > 128 ? 1 : 0;
  }

  // --- draw hands + center pin on a separate mask so they always count as "thin" ---
  const cvs2 = document.createElement("canvas");
  cvs2.width = SIZE;
  cvs2.height = SIZE;
  const ctx2 = cvs2.getContext("2d")!;
  ctx2.save();
  ctx2.translate(C, C);
  ctx2.rotate(tilt);
  ctx2.strokeStyle = "#000";
  ctx2.lineCap = "butt";
  // hour hand toward ~2 o'clock (pre-tilt): angle from 12 = 60°
  const hourAngle = (60 * Math.PI) / 180 - Math.PI / 2; // canvas 0 rad = +x
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.moveTo(0, 0);
  ctx2.lineTo(Math.cos(hourAngle) * 34, Math.sin(hourAngle) * 34);
  ctx2.stroke();
  // minute hand toward ~5 o'clock: angle 150°
  const minAngle = (150 * Math.PI) / 180 - Math.PI / 2;
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.moveTo(0, 0);
  ctx2.lineTo(Math.cos(minAngle) * 52, Math.sin(minAngle) * 52);
  ctx2.stroke();
  // center pin
  ctx2.fillStyle = "#000";
  ctx2.beginPath();
  ctx2.arc(0, 0, 3, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.restore();

  const img2 = ctx2.getImageData(0, 0, SIZE, SIZE).data;
  const thinMask = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (img2[i * 4 + 3] > 128) {
      thinMask[i] = 1;
      mask[i] = 1; // union into main mask so distance transform sees them
    }
  }

  return { mask, thinMask, w: SIZE, h: SIZE };
}

/* -------- distance transform (2-pass chamfer, edge = mask 0) -------- */

function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const D1 = 1;
  const D2 = Math.SQRT2;
  // forward pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let m = d[i];
      if (x > 0) m = Math.min(m, d[i - 1] + D1);
      if (y > 0) m = Math.min(m, d[i - w] + D1);
      if (x > 0 && y > 0) m = Math.min(m, d[i - w - 1] + D2);
      if (x < w - 1 && y > 0) m = Math.min(m, d[i - w + 1] + D2);
      d[i] = m;
    }
  }
  // backward pass
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let m = d[i];
      if (x < w - 1) m = Math.min(m, d[i + 1] + D1);
      if (y < h - 1) m = Math.min(m, d[i + w] + D1);
      if (x < w - 1 && y < h - 1) m = Math.min(m, d[i + w + 1] + D2);
      if (x > 0 && y < h - 1) m = Math.min(m, d[i + w - 1] + D2);
      d[i] = m;
    }
  }
  return d;
}

/* -------- Poisson-like sampling on a mask -------- */

function sampleMask(
  predicate: (i: number, x: number, y: number) => boolean,
  w: number,
  h: number,
  minDist: number,
  r: number,
  existing: Pt[],
): Pt[] {
  // candidate scan on a jittered grid, filter by predicate + spatial hash
  const cell = minDist;
  const cols = Math.ceil(w / cell) + 2;
  const grid = new Map<number, Pt[]>();
  const key = (cx: number, cy: number) => cy * cols + cx;
  // seed grid with existing points so new class avoids them
  for (const p of existing) {
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    const k = key(cx, cy);
    const arr = grid.get(k);
    if (arr) arr.push(p);
    else grid.set(k, [p]);
  }
  const kept: Pt[] = [];
  const step = Math.max(1, Math.floor(minDist * 0.55));
  const minSq = minDist * minDist;
  for (let y = 2; y < h - 2; y += step) {
    for (let x = 2; x < w - 2; x += step) {
      // small jitter for organic feel
      const jx = x + ((Math.random() - 0.5) * step) | 0;
      const jy = y + ((Math.random() - 0.5) * step) | 0;
      if (jx < 2 || jx >= w - 2 || jy < 2 || jy >= h - 2) continue;
      const i = jy * w + jx;
      if (!predicate(i, jx, jy)) continue;
      const cx = Math.floor(jx / cell);
      const cy = Math.floor(jy / cell);
      let ok = true;
      outer: for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bucket = grid.get(key(cx + dx, cy + dy));
          if (!bucket) continue;
          for (const q of bucket) {
            const ddx = q.x - jx;
            const ddy = q.y - jy;
            if (ddx * ddx + ddy * ddy < minSq) {
              ok = false;
              break outer;
            }
          }
        }
      }
      if (ok) {
        const p: Pt = { x: jx, y: jy, r };
        kept.push(p);
        const k = key(cx, cy);
        const arr = grid.get(k);
        if (arr) arr.push(p);
        else grid.set(k, [p]);
      }
    }
  }
  return kept;
}

function buildDots(): Pt[] {
  const { mask, thinMask, w, h } = rasterizeWatch();
  const dist = distanceTransform(mask, w, h);

  // Class A: thick mass — edge distance >= threshold AND not part of thin (hands)
  const thickPts = sampleMask(
    (i) => mask[i] === 1 && !thinMask[i] && dist[i] >= EDGE_THRESHOLD,
    w,
    h,
    MIN_DIST_THICK,
    R_THICK,
    [],
  );

  // Class B: thin lines — everything in thinMask, plus edges of mass thinner than threshold
  const thinPts = sampleMask(
    (i) => thinMask[i] === 1 || (mask[i] === 1 && dist[i] < EDGE_THRESHOLD),
    w,
    h,
    MIN_DIST_THIN,
    R_THIN,
    thickPts,
  );

  return [...thickPts, ...thinPts];
}

/* -------- animation -------- */

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

  useEffect(() => {
    const pts = buildDots();
    offsetsRef.current = new Float32Array(pts.length * 2);
    dotsRef.current = new Array(pts.length);
    setHomes(pts);
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
      pointerRef.current.x = ((e.clientX - rect.left) * SIZE) / rect.width;
      pointerRef.current.y = ((e.clientY - rect.top) * SIZE) / rect.height;
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
          r={p.r}
          fill="#ffffff"
          opacity={0.2}
          style={{ pointerEvents: "none" }}
        />
      ))}
    </svg>
  );
}
