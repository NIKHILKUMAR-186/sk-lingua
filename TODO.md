# Google OAuth Redirect Loop Fix — Task Tracking

## Root Cause
`src/routes/_authenticated/route.tsx` `beforeLoad` polls `getUser()` for only 3000ms and
`throw redirect({ to: "/auth" })` if the session isn't ready yet. During Google OAuth the
session/exchange can legitimately take longer (especially for new users where profile/role
rows are also created), so the guard treats a valid in-progress auth as "logged out" and
bounces the user back to the login page, producing the redirect loop. `/auth` has no
authenticated-user guard, so the user sticks on login.

## Steps
- [x] 0. Trace full OAuth flow (google-button, auth, signup, callback, supabase client, guards, auth.ts, migrations)
- [x] 1. Add shared session-restoration + destination helpers to `src/lib/auth.ts`
- [x] 2. Fix `src/routes/_authenticated/route.tsx` — proper session-restoration wait (getSession first, ~9s fallback), no premature `/auth` redirect
- [x] 3. Fix `src/routes/auth.tsx` — add authenticated-user `beforeLoad` guard (role-aware redirect away from `/auth`)
- [x] 4. Fix `src/routes/mentor-signup.tsx` — add same session-aware guard
- [x] 5. Fix `src/routes/auth.callback.tsx` — idempotent upserts + defensive logging
- [x] 6. Type-check (`tsc`) and fix any route/type errors — only pre-existing `src/lib/validation.ts` errors remain (unrelated/out of scope)
