# Lingua Platform Upgrade - TODO

## Phase 1: Database Migration
- [x] Create migration `20260728000000_platform_upgrade.sql`
- [x] Update `src/integrations/supabase/types.ts` with new columns

## Phase 2: Hooks
- [x] `src/hooks/use-gigs.ts` — Professional Gig System CRUD
- [x] `src/hooks/use-booking.ts` — Calendar, slot grouping, booking request
- [x] `src/hooks/use-reviews.ts` — Multi-category reviews & stats
- [x] `src/hooks/use-search.ts` — Advanced mentor search with filters

## Phase 3: Components
- [x] `empty-state.tsx` — Premium empty states with icon, title, action
- [x] `skeleton-loader.tsx` — Skeleton loader variants
- [x] `gig-card.tsx` — Premium Fiverr-style gig card
- [x] `gig-manager.tsx` — Mentor gig CRUD manager (create, edit, archive, delete)
- [x] `booking-calendar.tsx` — Calendar date picker with slot grouping
- [x] `booking-summary.tsx` — Booking review summary card
- [x] `review-stats.tsx` — Review statistics + distribution + star component
- [x] `search-filters.tsx` — Advanced search filter panel
- [x] `mentor-public-profile.tsx` — Premium mentor profile card
- [x] `notification-list.tsx` — Categorized notification list

## Phase 4: Route Updates
- [x] `student/mentor.$id.tsx` — Complete overhaul with premium profile → gig selection → calendar → slot picker → booking summary
- [x] `student/explore.tsx` — Advanced search: price slider, experience, languages, rating, verified, demo filter
- [x] `student/dashboard.tsx` — Modern widgets, skeleton loaders, empty states, quick actions
- [x] `student/resources.tsx` — Category tabs, search bar, bookmark/download, resource preview
- [x] `mentor/dashboard.tsx` — Revenue summary, top gig, quick stats, skeleton loaders
- [x] `mentor/profile.tsx` — Gig management tab with create/edit/archive/delete gigs
- [x] `mentor/calendar.tsx` — Tabbed (Pending/Upcoming/Past), gig names, animations
- [x] `notifications.tsx` — Replaced inline rendering with NotificationList component

## Phase 5: Booking Availability Fix
- [x] **Root cause identified**: `parseISO()` creates UTC midnight dates; `.getDay()` returns LOCAL weekday, causing ±1 day mismatch for UTC-negative timezones (Americas)
- [x] **Fix applied**: Replaced `parseISO()` → `dateFromString()` using `new Date(y, m-1, d)` for local midnight
- [x] **Debug logging added**: Console logs for mentorId, selectedDate, raw slots, day_of_week values, computed dayKey, slot filtering per row

## Build Verification
- [x] **Zero TypeScript errors** in `use-booking.ts`
- [x] Pre-existing errors (57 total) — All in untouched files only (session-workspace, use-analytics, use-availability, use-session-workspace, booking.ts, session-workspace.ts, router.tsx)
- [x] Database migration ready: `20260728000000_platform_upgrade.sql`
- [x] No hardcoded data — everything fetched from Supabase

## Notes for Debugging
- Open browser console → look for `🕐 [useAvailableSlots]` group
- Verify `mentorId` matches the URL param
- Verify `day_of_week` from DB matches computed `dayKey`
- If day_of_week says `"monday"` but computed key is `"tuesday"`, this is the UTC/local mismatch that `dateFromString` now fixes
