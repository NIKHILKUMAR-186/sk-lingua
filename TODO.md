# Mentor Approval Fix — Implementation Progress

## Steps

- [x] Plan approved by user
- [x] **Step 1**: Create SQL migration with atomic `approve_mentor_application` RPC
  - [x] Fix `hourly_rate` reference (remove from `app_data`, preserve existing `mentor_profiles.hourly_rate`)
  - [x] Single atomic RPC: validate admin, validate application, promote role, activate profile, audit log, notification
  - [x] Idempotent: safe "already approved" if duplicate
  - [x] Transaction safety: all-or-nothing
- [x] **Step 2**: Add `approveMentorApplication` helper in `mentorApplications.ts`
- [x] **Step 3**: Update frontend `$id.tsx` to use single RPC call
  - [x] Remove old broken two-step approval path (application status update + separate RPC)
  - [x] Call `approveMentorApplication(id, adminId)` for approval
  - [x] Handle `alreadyApproved` idempotency
  - [x] Show loading state, handle errors, refresh queries
- [x] **Step 4**: Verify the fix
  - [x] Remove old broken two-step approval path
  - [x] Clean up unused old `approve_mentor_role` function reference
  - [x] TypeScript check passes for modified files (only pre-existing errors in `validation.ts` remain)

## Dev-mode Rate Limit Toggle

- [x] Add env toggle to control rate limiting during development
  - [x] `.env`: `RATE_LIMIT_ENABLED=false` (server runtime) and `VITE_RATE_LIMIT_ENABLED=false` (Vite client build-time)
  - [x] `src/lib/rate-limit-config.ts` correctly parses `"true"`/`"false"` strings via `=== "true"`
  - [x] `shouldRateLimit()` / `RATE_LIMIT_ENABLED` is the single source of truth; set to `true` in production to enable
