---
name: full-stack-conventions
description: My personal conventions for TypeScript/Angular-style backend services, frontend-backend API contracts, and single-file prototype apps. Use whenever creating or editing a .service.ts file, wiring a frontend call to a backend route, defining an API response shape, diagnosing a broken/404 API endpoint, or building a quick standalone HTML prototype/demo app.
---

# Full-Stack Conventions

Apply these conventions whenever working on backend services, API routes, or
single-file prototype apps in my projects.

## 1. API route prefixes must be consistent within a service file

Before adding or editing any function in a `*.service.ts` file, first scan the
**entire file** for the route prefix pattern already used by every other
function in it (e.g. `/api/admin/<resource>/...`). New or edited functions
must reuse that exact prefix — never introduce a new or slightly-different
prefix for the same resource area, even if it "reads" more correctly.

If a mismatch is found (frontend calls a prefix the backend router doesn't
register, or vice versa), do not silently pick one side to trust. Report the
exact two prefixes side by side, state which file/line each comes from, and
propose the fix that aligns the frontend to the established convention in
that service file — only fall back to registering a new backend route if the
frontend prefix is the one that's actually correct per the codebase's
existing router structure.

## 2. Standard API response shape

All backend admin/API endpoints return a consistent, generic response
envelope: `ApiResponse<T>` (success flag, typed data payload, optional error
message). When adding a new endpoint:
- Reuse the existing `ApiResponse<T>` type — don't invent a new response
  shape or return a bare payload.
- Type the generic explicitly (e.g. `ApiResponse<StudentSearchResult[]>`),
  don't leave it as `any` or untyped.
- Every protected/admin route must include the same auth middleware pattern
  already used by sibling routes in that router file — check for it
  explicitly rather than assuming it's inherited.

## 3. Diagnosing broken endpoints

When a frontend call fails (404, wrong shape, etc.), diagnose in this order
before writing any fix:
1. Find the exact route string in the frontend `.service.ts` call.
2. Find the backend router file and list every registered route prefix for
   that resource area.
3. Compare against sibling functions in the same frontend service file to
   determine which prefix is the codebase's actual convention.
4. State the mismatch plainly, then propose one fix — don't offer multiple
   speculative fixes without first identifying the actual convention.

## 4. Quick prototype / standalone apps

When asked for a quick prototype, demo, or standalone tool (not a
production feature): default to a **single self-contained HTML file**
(inline CSS/JS, no build step) unless persistence beyond a page reload or
multi-page routing is explicitly required. Don't reach for a framework or
backend for something that's meant to be a fast, complete, ready-to-run
deliverable.

Font stack default for these prototypes (unless the task specifies
otherwise): Google Fonts — Fraunces (display/headers), IBM Plex Sans (body),
IBM Plex Mono (code/data), and the relevant Noto Sans variant for any
non-Latin script content (CJK, Arabic, Devanagari, etc.).

## 5. Persistence layers

When adding persistence to a prototype (e.g. `localStorage`), wrap it behind
a small adapter with a stable interface (e.g. `getState(id)`,
`saveState(id, state)`) rather than calling `localStorage` directly
throughout the app. This keeps a later swap to a real backend (Supabase,
custom API, etc.) a one-file change instead of a rewrite. Use stable,
content-independent IDs as keys — never the display text/label itself —
so edits to displayed content don't silently orphan stored state.
