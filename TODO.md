# Demo Admin Workflow — Implementation Status

## ✅ Completed

### 1. Database Migration (`supabase/migrations/20260823000000_demo_admin_workflow.sql`)
- Added columns: `admin_id`, `meeting_link`, `admin_notes`, `cancelled_at`, `no_show_at`, `rescheduled_at`
- `has_used_demo_session()` function for backend one-lifetime-demo enforcement
- `prevent_duplicate_demo_booking()` trigger (rejects duplicate inserts)
- Normalized old mentor-based statuses → `pending_admin_confirmation`
- RLS: admins manage all, students read own / create own / update own
- Realtime publication, indexes, grants

### 2. `src/lib/demo-bookings.ts` — Full Rewrite
- `bookDemoSession()`: creates with `pending_admin_confirmation`, one-lifetime check (frontend + backend)
- `hasUsedDemoSession()`: unified check
- `getAdminDemoBookings()`: all bookings for admin
- `getAdminPendingDemoBookings()`: pending + confirmed for admin queue
- `confirmDemoBooking()`: admin sets date/time/meeting_link/notes, notifies student
- `rescheduleDemoBooking()`: admin reschedules, notifies student
- `cancelDemoBooking()`: admin cancels, notifies student
- `completeDemoSession()`: admin marks completed, notifies student
- `markDemoNoShow()`: admin marks no-show, notifies student
- `createDemoWorkspace()`: creates workspace linked to admin (not mentor)
- `getUpcomingDemoBooking()`: uses new statuses only
- CONSUMED_DEMO_STATUSES: `pending_admin_confirmation`, `confirmed`, `completed`, `no_show`

### 3. `src/lib/demo-notifications.ts` — Full Rewrite
- `sendDemoNotification()`: matches schema (`title`/`body`/`category`/`kind`/`related_id`/`link`/`read`)
- Student notifications: submitted, confirmed, rescheduled, cancelled, completed, no-show, reminder, subscription available
- Admin notifications: new booking, upcoming demo, today's demo
- No mentor notifications

### 4. `src/lib/payments.ts` — Updated
- `bookDemoSession()` delegates to `demo-bookings.ts`
- `getUpcomingDemoBooking()` uses new statuses (`pending_admin_confirmation`, `confirmed`)
- `cancelDemoBooking()` includes `cancelled_at` timestamp
- `getUserDemoBookings()` orders by `created_at` instead of `booking_date`

### 5. `src/hooks/use-demo-bookings.ts` — Full Rewrite
- `useAdminDemoBookings()`: realtime + refetchInterval fallback
- `useAdminPendingDemoBookings()`: realtime + refetchInterval fallback
- `useHasUsedDemoSession()`: one-lifetime eligibility hook
- Admin mutations: `useConfirmDemoBooking`, `useRescheduleDemoBooking`, `useCompleteDemoBooking`, `useMarkDemoNoShow`, `useCancelDemoBooking`
- Studio mutations: `useBookDemoSession`, `useCancelDemoBooking`, `useSubmitDemoFeedback`
- All mutations invalidate correct query keys

### 6. `src/routes/_authenticated/admin/demo-queue.tsx` — Full Rewrite
- Admin-conducted workflow: Confirm, Reschedule, Complete, Mark No-Show, Cancel
- Status tabs: pending_admin_confirmation, confirmed, completed, cancelled, no_show
- Student info: name, email, phone, level, timezone, native language, learning goal
- Booking details: date, time, language, notes, meeting link, payment status, created_at
- Dialogs for confirm (with meeting link + admin notes), reschedule, complete, no-show
- No mentor references, no mentor assignment

### 7. `src/components/demo-cta-card.tsx` — Updated
- Removed `Users` icon and mentor references
- Updated benefits: "Live video session", "Personalized learning plan", "Expert guidance", "Language assessment"
- Updated status badges: "Pending Confirmation", "Confirmed", "Completed"
- Updated text: "Our team is confirming your demo slot"

### 8. `src/modules/subscriptions/components/demo-booking-form.tsx` — Updated
- "Conducted by: Our expert team" instead of mentor assignment

### 9. `src/modules/subscriptions/components/demo-info-page.tsx` — Updated
- "Expert Team" instead of "Expert Mentors"
- "Expert assessment" instead of "Mentor assessment"
- FAQs updated to refer to "team" / "experts" instead of "mentors"
- CTA text: "Pick a time that works for you and we'll take it from there"

### 10. `src/routes/_authenticated/student/demo-session.tsx` — Updated
- Hero text: "Get a personalized 1-on-1 language assessment with our expert team"
- Confirmation: "Our team will confirm your slot and share the meeting link shortly"
- Sidebar: "Expert Assessment" instead of "Expert Mentors"

### 11. `src/routes/_authenticated/student/demo-conversion.tsx` — Updated
- "Book regular sessions with our expert mentors" (paid mentors, not demo)

### 12. `src/routes/_authenticated/student/dashboard.tsx` — Updated
- Uses `useHasUsedDemoSession` hook for demo eligibility
- `demoUsed` flag: only shows DemoCtaCard if student has NOT used their demo
- `demoCompleted` uses `booking_status === "completed"` from upcoming demo

## 🧪 TypeScript Verification
- `npx tsc --noEmit` → **0 errors** in any modified demo files
- All pre-existing errors in OTHER files (analytics, mentor-applications, notifications, etc.)

## ✅ Production Hardening (`20260824000000_demo_workflow_hardening.sql`)
- Concurrency-safe one-lifetime-demo via `CREATE UNIQUE INDEX ... WHERE booking_status IN (pending_admin_confirmation, confirmed, completed, no_show)` — prevents two-tab double-booking
- Hardened trigger (friendly error message layer; index is authoritative)
- Correct legacy data migration (pending_assignment→pending_admin_confirmation; mentor_assigned/pending_mentor_response/assigned/accepted→confirmed)
- Hardened student UPDATE RLS: only allows transition to `cancelled` from pending/confirmed; blocks tampering with admin fields/timestamps
- Explicit mentor deny policy on demo bookings
- Hardened related demo tables (workspaces, assignment history, resources) for admin-conducted model
- Defensive notifications schema guard + unread index
- Realtime publication + grants (idempotent)

## 🧹 Demo copy fixes (mentor → expert team)
- `demo-cta-card.tsx`: "expert mentor" → "expert team"
- `demo-booking-form.tsx`: "Your mentor will teach" → "Your session will be conducted"; "with your mentor" → "with our expert team"

## ⏳ Not Yet Required (Future)
- [ ] `src/modules/demo/` — module folder is empty; not currently used
- [ ] `src/modules/student-booking/` — module folder is empty; not currently used
- [ ] `src/lib/booking.ts` / `src/hooks/use-booking.ts` — not used in demo flow
- [ ] Schedule/CRON job for demo reminders (future enhancement)
