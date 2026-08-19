// Client-side image helpers for the portfolio photo upload path.

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
