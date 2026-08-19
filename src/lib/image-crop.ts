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
  const nx = x as number,
    ny = y as number,
    nw = w as number,
    nh = h as number;
  if (nw <= 0 || nh <= 0) return false;
  if (nx < 0 || ny < 0 || nx + nw > 1.0001 || ny + nh > 1.0001) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Upload resize
//
// Every photo that reaches the `portfolio-photos` bucket goes through here
// first, so what lands in storage is already bounded. The bucket's own
// file_size_limit / allowed_mime_types are the backstop for a direct API
// upload that skips this path.
//
// HEIC: iPhone photos are frequently image/heic or image/heif. Canvas cannot
// decode those in Chrome or Firefox (only Safari), so they are rejected up
// front with a specific message rather than failing opaquely at drawImage.
// ---------------------------------------------------------------------------

/** Input types we attempt to decode. Anything else is refused before decode. */
export const ACCEPTED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** Long-edge cap of the re-encoded upload, in pixels. */
export const UPLOAD_MAX_EDGE = 1600;
/** JPEG quality of the re-encoded upload. */
export const UPLOAD_QUALITY = 0.82;

export class ImagePrepareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePrepareError";
  }
}

function looksHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  return /\.(heic|heif)$/i.test(file.name || "");
}

/**
 * Re-encode `file` to a bounded JPEG. Throws ImagePrepareError with a
 * user-facing message on any failure — callers must NOT fall back to the
 * original file, or the bucket ceiling and this bound are both defeated.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (looksHeic(file)) {
    throw new ImagePrepareError(
      "This looks like an iPhone HEIC photo, which this browser can't read. " +
        "On iPhone: Settings › Camera › Formats › Most Compatible, or share the photo " +
        "as JPEG, then try again.",
    );
  }
  const type = (file.type || "").toLowerCase();
  if (!(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(type)) {
    throw new ImagePrepareError("Unsupported image format. Please use JPEG, PNG, WebP or AVIF.");
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new ImagePrepareError(
      "This image couldn't be read by your browser. Try saving it as a JPEG and uploading again.",
    );
  }

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H) {
    throw new ImagePrepareError("This image couldn't be read by your browser (no dimensions).");
  }

  const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(W, H));
  const outW = Math.max(1, Math.round(W * scale));
  const outH = Math.max(1, Math.round(H * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImagePrepareError("Your browser couldn't process this image.");
  ctx.drawImage(img, 0, 0, outW, outH);

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", UPLOAD_QUALITY);
  });
  if (!blob || blob.size === 0) {
    throw new ImagePrepareError("Your browser couldn't process this image.");
  }

  const baseName = (file.name.replace(/\.[^.]+$/, "") || "photo").slice(0, 60);
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
