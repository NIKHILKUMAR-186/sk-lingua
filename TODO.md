# TODO — Fix Mentor Application Submission + Resume Preview

## Plan Steps

### 1. Fix Save Draft (Errors 1 & 2) — DONE
- [x] Rewrite `upsertMyApplication` in `src/lib/mentorApplications.ts` to:
  - Fetch existing application by `user_id`.
  - If exists → UPDATE.
  - If not → INSERT.
  - Filter payload to valid DB columns only (no undefined/computed/UI-only fields).
  - Never rely on `onConflict: "user_id"`.

### 2. Fix Resume Preview (Errors 3 & 4) — DONE
- [x] Add `createSignedUrlForPath(path)` helper using `supabase.storage.createSignedUrl` directly.
- [x] Rewrite `resolveResumeUrl` to use the helper (remove `/api/signed-url` fetch).
- [x] Update `src/components/resume-preview.tsx` to call `createSignedUrl` directly.
- [x] Ensure HTML is never parsed as JSON (removed all `/api/signed-url` fetches).

### 3. Fix Submission Flow — DONE
- [x] Store and use `resume_path` throughout (not public URL).
- [x] Improve error messages in `mentor-application-form.tsx` (surface real backend reason).
- [x] Update `use-mentor-application.tsx` `replaceResume` to store `resume_path` as primary.

### 4. DB Migration — DONE
- [x] Create `supabase/migrations/20260831200000_fix_mentor_resume_storage_rls.sql`:
  - Fix `mentor-resumes` owner-read policy to use `foldername[2]`.
  - Add admin-read policy for the private bucket.
- [x] Create `supabase/migrations/20260831210000_add_mentor_applications_state.sql`:
  - Add missing `state` column (was causing 400 on draft save).
- [x] TypeScript clean for all edited files.

## Verification
- [x] Save Draft works (no 400) — via fetch-then-insert/update + column filtering + `state` column.
- [x] Resume Upload works — via `supabase.storage` upload to private bucket.
- [x] Signed URL works (no 404) — via `supabase.storage.createSignedUrl` client-side.
- [x] Resume Preview works — via `createSignedUrlForPath`.
- [x] Submit Application works.
- [x] No HTML parsed as JSON — removed `/api/signed-url` dependency entirely.
