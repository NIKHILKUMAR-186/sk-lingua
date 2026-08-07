# Demo Workflow Hardening Fix — Implementation Checklist

## Goal
Fix the `42P01: missing FROM-clause entry for table "new"` error in
`supabase/migrations/20260824000000_demo_workflow_hardening.sql` caused by invalid
`NEW`/`OLD` references in an RLS policy, while preserving production-grade security.

## Steps
- [x] Investigate root cause (RLS policies cannot reference NEW/OLD).
- [x] Design fix: rewrite policy + SECURITY DEFINER BEFORE UPDATE trigger.
- [x] **Edit migration section 4b** — replace invalid RLS policy with a valid
      column-only policy (student may only set `booking_status = 'cancelled'`).
- [x] **Add trigger function + trigger** in the migration to enforce admin-field
      immutability (students cannot modify admin_id, meeting_link, admin_notes,
      confirmed_at, completed_at, no_show_at, rescheduled_at) and restrict
      cancellation to pending/confirmed bookings.
- [x] Verify idempotency (DROP ... IF EXISTS / CREATE OR REPLACE).
- [x] Re-run the migration to confirm it executes cleanly.
