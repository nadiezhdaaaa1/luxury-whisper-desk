# Portfolio photos: make deletion real, stop orphans, stop 1-year expiry

## Investigation findings

**1. Storage RLS — good news.** The bucket policies were created in the same migration as `portfolio_items` (`20260708145532_...sql`). All four exist on `storage.objects`, each scoped to `bucket_id = 'portfolio-photos' AND (storage.foldername(name))[1] = auth.uid()::text`:

- SELECT "Users can view own portfolio photos"
- INSERT "Users can upload own portfolio photos"
- UPDATE "Users can update own portfolio photos"
- DELETE "Users can delete own portfolio photos"

So a client-side `.remove()` on the user's own folder will succeed. No new storage policy is needed — this is not a cosmetic fix. Bucket is private, which is why signed URLs are used at all.

**2. Backfill is feasible.** Live data: 9 portfolio rows, 6 with a photo, and all 6 parse — every `photo_url` matches
`https://<project>.supabase.co/storage/v1/object/sign/portfolio-photos/<uid>/<uuid>.<ext>?token=...`.
Path is the substring between `/object/sign/portfolio-photos/` and `?`. Zero unparseable rows today; the backfill will leave `photo_path` NULL for anything that doesn't match, and delete code must tolerate NULL (delete the row, skip storage).

**3. Orphan sources — all five confirmed, plus more.** Current bucket state: **77 objects but only 6 referenced by a row**, across 5 user folders. So ~71 orphans already exist — the leak is real and dominant, driven mainly by auto-crop (every recognized upload leaves the original behind) plus abandoned modals.

Confirmed: single delete (`portfolio.tsx:288`), bulk delete (`:402`, currently N parallel calls), auto-crop double-upload (`AddEditPortfolioModal.tsx:146→189`), X-to-clear (`:273`), cancel-after-upload, edit-and-swap-photo.

Additions you didn't list:
- **Failed submit after upload** — validation error or insert failure leaves the uploaded object behind even though the modal stays open and the user may then upload again.
- **Account deletion** — `portfolio_items` cascades from `auth.users`, but storage objects are not cascaded. GDPR Art. 17 gap wider than the remove dialog.
- **`ImportantSignalCard.tsx:168`** also renders `photo_url` directly, so it inherits the expiry bug and must move to the sign-on-read path too.

**4. Signed-URL expiry — confirmed.** `createSignedUrl(path, 60*60*24*365)` writes a URL that hard-expires one year after upload; oldest object is 2026-07-08, so the first breakages land July 2027. Storing the path and signing on read fixes it and is the same change that enables deletion.

## Risks I'd flag

- **Two-system atomicity.** Storage delete and row delete can't be transactional. Storage-first is right (never strand an unrecoverable path), but it means a rare state where the photo is gone and the row remains showing a broken image. Mitigation: after a storage failure we still delete the row and null out `photo_path`; the object becomes a known orphan for the sweep rather than a broken card.
- **Backfill regex on live data** — read-only derivation, no destructive step, safe. But it must be tolerant, not `NOT NULL`.
- **The one-off sweep is the risky part**, not the code fix: 71 candidate objects, and "unreferenced" is only true at a moment in time. Anything uploaded mid-modal by a live user looks like an orphan. Guard with an age cutoff (older than 24h) and run it as a reviewed one-off, not a recurring job.
- Signing on read adds a network round trip per photo; batch with `createSignedUrls(paths[])` per page load and cache in the query result.

## Plan

### 1. Migration
- `ALTER TABLE public.portfolio_items ADD COLUMN photo_path text;` (nullable, no default).
- Backfill in the same migration:
  `UPDATE public.portfolio_items SET photo_path = split_part(substring(photo_url from '/object/sign/portfolio-photos/(.*)$'), '?', 1) WHERE photo_url LIKE '%/object/sign/portfolio-photos/%' AND photo_path IS NULL;`
- No new grants or policies needed (column on an existing granted table; storage DELETE policy already present).
- Regenerate types.

### 2. Thread the path through
- `PortfolioRow` and `PortfolioInput` gain `photo_path: string | null`.
- `FormState` gains `photo_path`; `handleFile` keeps `res.path` alongside `res.url`; `initial` hydration copies `initial.photo_path`.
- `insertPortfolioItem` / `updatePortfolioItem` write it.

### 3. Deletion — storage first
- `deletePortfolioItem(id)`: select `photo_path` → if present, `storage.remove([path])` → then delete the row. Return `{ photoRemoved: boolean }`.
- On storage failure: still delete the row, return `photoRemoved: false`. UI shows an honest toast — `Piece removed. The photo couldn't be deleted right now; we'll clear it shortly.` — never blocking removal, never claiming success. Log for the sweep.
- Bulk: new `deletePortfolioItems(ids)` — select all paths, one `.remove(paths)`, one `.delete().in('id', ids)`. Replaces the N-call `Promise.all`.

### 4. Close the four other orphan sources
Add `deletePortfolioPhoto(path)` helper in `src/lib/portfolio.ts` and call it, best-effort (never blocking the user):
- **Auto-crop**: after the cropped upload succeeds, remove the original path.
- **X-to-clear**: remove the current path if it was uploaded in this session and isn't the row's persisted path.
- **Modal cancel/close**: track paths uploaded during this modal session in a ref; on close without submit, remove any not persisted on the row.
- **Edit + swap**: on successful update, remove the previous `photo_path` when it changed.
Rule throughout: only remove a path that is not the currently persisted value on an existing row.

### 5. Sign on read
- `fetchPortfolio` collects `photo_path`s and issues one `createSignedUrls(paths, 3600)`, attaching a transient `photo_signed_url` to each row (not persisted).
- `PortfolioCard` and `ImportantSignalCard` render the signed URL, falling back to legacy `photo_url` while any row still lacks a path.
- Stop persisting long-lived signed URLs: keep writing `photo_url` for backwards compatibility during the transition, but `photo_path` becomes the source of truth.

### 6. One-off orphan sweep (separate, reviewed step)
Identify with a read-only query joining `storage.objects` (bucket `portfolio-photos`) against `portfolio_items.photo_path`, filtered to `created_at < now() - interval '24 hours'`. Review the count, then delete via a service-role admin call. Run only after step 1's backfill, so referenced objects are correctly recognised. Not automated.

### 7. Copy and UI
Dialog copy stays exactly as-is — the promise becomes true. Only new UI is the honest partial-failure toast, using existing sonner patterns per docs/DESIGN_SYSTEM.md.

### Not in this plan (flagging the gap)
Deleting a user's storage objects on account deletion needs a server-side path (admin client) and is a separate change; say the word and I'll fold it in.
