## Goal

After a portfolio photo is uploaded and the AI recognizes a piece, automatically zoom in on the product and crop the image so the item is centered — both in the modal preview and in the final saved photo (list / detail views).

## Approach

Extend the existing recognition server function to also return a normalized bounding box of the detected item, then crop the image client-side against that box before persisting it.

### 1. Recognizer returns a bounding box

`src/lib/portfolio-recognize.functions.ts`
- Extend the Gemini prompt to also emit `bbox: {x, y, w, h}` in normalized 0..1 image coordinates (top-left origin) tightly around the product.
- Add `bbox` to `RecognitionResult` (nullable). Validate: each field is a finite number in [0,1], `w`/`h` > 0, and box fits inside the image; otherwise return `bbox: null`.
- Keep everything else backward compatible (bbox is optional).

### 2. Client-side crop + re-upload

`src/components/portfolio/AddEditPortfolioModal.tsx` (`handleFile`)
- Order becomes: upload original → recognize → if `ok`, `confidence ≥ threshold`, and `bbox` present → crop the local `File` via a canvas helper and re-upload the cropped image, replacing `photo_url`.
- Padding: expand the bbox by ~12% on each side (clamped to image bounds) so the product is centered with breathing room rather than tight-cropped.
- Aspect ratio: pad the shorter side so the crop matches the preview's 4:3 frame, keeping the product centered.
- Max output ~1600px on the long edge, JPEG quality ~0.9, to keep files small.
- Show the existing "Recognizing…" overlay through the crop+re-upload step so the user sees a single continuous loading state; only swap `photo_url` once the cropped image is ready.
- If cropping or the second upload fails, silently keep the original photo (no user-facing error) and log to console.

### 3. New helper

`src/lib/image-crop.ts` (new)
- `cropImageToBox(file: File, bbox, opts): Promise<File>` — loads the file into an `Image`, draws the padded/aspect-adjusted region onto a canvas, exports a JPEG `File` with the same base name.

### 4. Edit mode & re-upload

- Only run auto-crop on fresh uploads inside the modal (we already have the `File`). Existing `initial.photo_url` is untouched.
- If the user removes the photo and uploads a new one, the flow re-runs.

## Out of scope

- No manual crop UI / re-crop control (can be added later if desired).
- No re-cropping of previously saved portfolio images.
- Watchlist `AddPieceModal` is unchanged unless you want the same behavior there — happy to extend it in a follow-up.

## Technical notes

- Gemini 2.5 Flash returns bounding boxes reliably when asked for normalized coordinates; we still guard with strict validation and treat missing/invalid bbox as "skip cropping".
- Cropping happens in the browser (canvas) — no extra server round-trip beyond the second `uploadPortfolioPhoto` call.
- `uploadPortfolioPhoto` is reused as-is; the cropped `File` overwrites `form.photo_url` with the new URL. The original uploaded blob is orphaned in storage (acceptable; can add cleanup later).
