// Client-side image cropping helper. Given a normalized bounding box
// (0..1 coordinates, top-left origin), returns a cropped JPEG File that
// centers the box within a target aspect ratio, with padding around the box.

export type NormalizedBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CropOptions = {
  /** Extra padding applied around the bbox, as a fraction of bbox size. Default 0.12. */
  padding?: number;
  /** Target aspect ratio (width / height). Default 4/3. */
  aspect?: number;
  /** Max long-edge output size in pixels. Default 1600. */
  maxSize?: number;
  /** JPEG quality 0..1. Default 0.9. */
  quality?: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function cropImageToBox(
  file: File,
  bbox: NormalizedBBox,
  opts: CropOptions = {},
): Promise<File> {
  const padding = opts.padding ?? 0.12;
  const aspect = opts.aspect ?? 4 / 3;
  const maxSize = opts.maxSize ?? 1600;
  const quality = opts.quality ?? 0.9;

  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // Convert bbox to pixels
  let bx = bbox.x * W;
  let by = bbox.y * H;
  let bw = bbox.w * W;
  let bh = bbox.h * H;

  // Pad around the box
  const padX = bw * padding;
  const padY = bh * padding;
  bx -= padX;
  by -= padY;
  bw += padX * 2;
  bh += padY * 2;

  // Center of the (padded) product box
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  // Expand shorter dimension to match aspect ratio (crop around center)
  let cropW = bw;
  let cropH = bh;
  if (cropW / cropH > aspect) {
    cropH = cropW / aspect;
  } else {
    cropW = cropH * aspect;
  }

  // If the desired crop is larger than the image, shrink to fit while keeping aspect
  if (cropW > W) {
    cropW = W;
    cropH = cropW / aspect;
  }
  if (cropH > H) {
    cropH = H;
    cropW = cropH * aspect;
  }

  // Position crop centered on product, clamped inside image
  let sx = cx - cropW / 2;
  let sy = cy - cropH / 2;
  sx = clamp(sx, 0, W - cropW);
  sy = clamp(sy, 0, H - cropH);

  // Output size (cap the long edge)
  const scale = Math.min(1, maxSize / Math.max(cropW, cropH));
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
}

export function isValidBBox(b: unknown): b is NormalizedBBox {
  if (!b || typeof b !== "object") return false;
  const { x, y, w, h } = b as Record<string, unknown>;
  if ([x, y, w, h].some((v) => typeof v !== "number" || !Number.isFinite(v))) return false;
  const nx = x as number, ny = y as number, nw = w as number, nh = h as number;
  if (nw <= 0 || nh <= 0) return false;
  if (nx < 0 || ny < 0 || nx + nw > 1.0001 || ny + nh > 1.0001) return false;
  return true;
}
