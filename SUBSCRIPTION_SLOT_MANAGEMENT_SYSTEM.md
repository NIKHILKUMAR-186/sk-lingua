# Subscription Slot Management System

## Enterprise Architecture Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Core Features](#core-features)
4. [API Reference](#api-reference)
5. [Frontend Components](#frontend-components)
6. [RLS Policies](#rls-policies)
7. [Usage Examples](#usage-examples)
8. [Testing Guide](#testing-guide)

---

## Overview

The Subscription Slot Management System is a comprehensive enterprise solution for managing student learning session subscriptions. It provides complete control over slot allocation, consumption tracking, and administrative management.

### Key Principles

- **Slots decrease ONLY after session completion** - Cancelled, rescheduled, or no-show sessions do not consume slots
- **Backend validation is mandatory** - Frontend validation alone is not sufficient
- **Complete audit trail** - Every adjustment is logged with full history
- **Bonus sessions support** - Admins can grant bonus sessions that behave exactly like regular sessions
- **Real-time updates** - Using TanStack Query + Supabase Realtime

### Business Rules

1. Students can ONLY book regular sessions with an ACTIVE subscription
2. Demo sessions remain independent and are NOT affected by subscription status
3. Slots are consumed only when session status changes to "completed"
4. Students can NEVER edit their own slots
5. Negative slot counts are prevented
6. Every admin adjustment creates an audit log

---

## Database Schema

### 1. Enhanced `student_subscriptions` Table

```sql
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS bonus_slots integer NOT NULL DEFAULT 0;
```

**Fields:**
- `bonus_slots` - Bonus sessions granted by admin (not part of original plan)

### 2. `subscription_slot_adjustments` Table

Tracks EVERY manual adjustment made by admins.

```sql
CREATE TABLE public.subscription_slot_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'increase_slots', 'decrease_slots', 'add_bonus', 'remove_bonus', 'extend_expiry', 'expire', 'suspend', 'reactivate', 'replace'
  old_remaining_slots integer NOT NULL,
  new_remaining_slots integer NOT NULL,
  old_bonus_slots integer NOT NULL,
  new_bonus_slots integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_slot_adjustments_student` on (student_id, created_at DESC)
- `idx_slot_adjustments_subscription` on (subscription_id, created_at DESC)
- `idx_slot_adjustments_admin` on (admin_id, created_at DESC)

### 3. `subscription_usage_logs` Table

Tracks automatic slot consumption from completed sessions.

```sql
CREATE TABLE public.subscription_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'session_completed', 'session_cancelled', 'session_rescheduled', 'session_rejected', 'technical_failure', 'admin_compensation'
  slots_consumed integer NOT NULL DEFAULT 0,
  old_remaining_slots integer NOT NULL,
  new_remaining_slots integer NOT NULL,
  old_used_slots integer NOT NULL,
  new_used_slots integer NOT NULL,
  session_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_usage_logs_student` on (student_id, created_at DESC)
- `idx_usage_logs_subscription` on (subscription_id, created_at DESC)
- `idx_usage_logs_session` on (session_id) WHERE session_id IS NOT NULL

---

## Core Features

### 1. Subscription Activation

When payment is successful:

```typescript
// Creates subscription with:
{
  plan_id: "plan-uuid",
  student_id: "user-uuid",
  total_slots: 22,
  remaining_slots: 22,
  used_slots: 0,
  bonus_slots: 0,
  status: "active",
  expires_at: "2026-08-31T00:00:00Z"
}
```

### 2. Slot Consumption Rule

Slots decrease ONLY when session status changes to "completed":

```sql
-- Trigger automatically handles this
CREATE TRIGGER trg_log_session_completion
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION log_session_completion();
```

**Events that do NOT consume slots:**
- Session cancelled
- Session rescheduled
- Session rejected
- Technical failure
- No-show

### 3. Booking Validation

Before any regular session booking, the system validates:

1. Active subscription exists
2. remaining_slots + bonus_slots > 0
3. Subscription not expired

```typescript
const validation = await validateBookingEligibility(
  userId,
  scheduledTime,
  durationMins,
  mentorId
);

if (!validation.canBook) {
  return {
    success: false,
    error: validation.reason // "No active subscription" | "Subscription expired" | "No slots remaining"
  };
}
```

### 4. Admin Slot Management

Admins can perform the following actions:

- **Increase Slots** - Add more regular sessions
- **Decrease Slots** - Remove regular sessions
- **Add Bonus Sessions** - Grant bonus sessions
- **Remove Bonus Sessions** - Revoke bonus sessions
- **Extend Expiry** - Extend subscription validity
- **Expire Subscription** - Manually expire subscription
- **Suspend Subscription** - Temporarily suspend
- **Reactivate Subscription** - Reactivate suspended subscription
- **Replace Plan** - Change to a different plan

Every action creates an audit record:

```typescript
{
  action: "add_bonus",
  old_remaining_slots: 5,
  new_remaining_slots: 5,
  old_bonus_slots: 0,
  new_bonus_slots: 3,
  reason: "Referral reward",
  metadata: { referral_code: "XYZ123" }
}
```

### 5. Bonus Sessions

Bonus sessions behave exactly like regular sessions:

```typescript
// Total available = remaining_slots + bonus_slots
const totalAvailable = subscription.current_session_slots + subscription.bonus_slots;

// Both are consumed equally
if (totalAvailable <= 0) {
  return { canBook: false, reason: "No slots remaining" };
}
```

### 6. Notifications

**Student Notifications:**
- Subscription Activated
- Session Consumed
- Only 5 Sessions Remaining
- Only 2 Sessions Remaining
- Subscription Expired
- Bonus Sessions Added

**Admin Notifications:**
- Subscription Purchased
- Subscription Expired
- Student Used Last Session
- Manual Slot Adjustment Completed

---

## API Reference

### Database Functions

#### `check_subscription_can_book(p_user_id uuid)`

Checks if a user can book a session.

**Returns:**
```typescript
{
  can_book: boolean,
  reason: text,
  slots_remaining: integer,
  subscription_status: text,
  is_expired: boolean
}
```

#### `create_slot_adjustment(...)`

Creates an audit record for manual slot adjustments.

**Parameters:**
- `p_student_id` - Student UUID
- `p_subscription_id` - Subscription UUID
- `p_admin_id` - Admin UUID
- `p_action` - Action type
- `p_old_remaining_slots` - Previous remaining slots
- `p_new_remaining_slots` - New remaining slots
- `p_old_bonus_slots` - Previous bonus slots
- `p_new_bonus_slots` - New bonus slots
- `p_reason` - Reason for adjustment
- `p_metadata` - Additional context (optional)

#### `create_usage_log(...)`

Creates an audit record for automatic slot consumption.

**Parameters:**
- `p_student_id` - Student UUID
- `p_subscription_id` - Subscription UUID
- `p_session_id` - Session UUID
- `p_action` - Action type
- `p_slots_consumed` - Number of slots consumed
- `p_old_remaining_slots` - Previous remaining slots
- `p_new_remaining_slots` - New remaining slots
- `p_old_used_slots` - Previous used slots
- `p_new_used_slots` - New used slots
- `p_session_status` - Session status
- `p_metadata` - Additional context (optional)

#### `get_subscription_summary(p_user_id uuid)`

Get detailed subscription summary for a specific user.

**Returns:**
```typescript
{
  subscription_id: uuid,
  plan_name: text,
  status: text,
  total_slots: integer,
  used_slots: integer,
  remaining_slots: integer,
  bonus_slots: integer,
  available_slots: integer,
  expires_at: timestamptz,
  activated_at: timestamptz,
  days_until_expiry: integer
}
```

#### `get_all_student_subscriptions()`

Get all active student subscriptions with stats (admin only).

**Returns:**
```typescript
[{
  student_id: uuid,
  student_name: text,
  student_email: text,
  subscription_id: uuid,
  plan_name: text,
  status: text,
  total_slots: integer,
  used_slots: integer,
  remaining_slots: integer,
  bonus_slots: integer,
  available_slots: integer,
  expires_at: timestamptz,
  activated_at: timestamptz,
  days_until_expiry: integer,
  is_near_expiry: boolean,
  is_zero_slots: boolean
}]
```

### TypeScript Services

#### Admin Subscription Service

**Location:** `src/modules/admin/subscription-management/services/admin-subscription.service.ts`

```typescript
// Get all students with subscriptions
getAllStudentSubscriptions(): Promise<StudentSubscriptionInfo[]>

// Get subscription summary for a student
getStudentSubscriptionSummary(userId: string): Promise<SubscriptionSummary | null>

// Adjust student slots (main function for all admin adjustments)
adjustStudentSlots(data: AdminSlotAdjustmentData): Promise<SubscriptionSlotAdjustment>

// Get adjustment history for a student
getStudentAdjustmentHistory(studentId: string, limit?: number): Promise<SubscriptionSlotAdjustment[]>

// Get usage logs for a student
getStudentUsageLogs(studentId: string, limit?: number): Promise<SubscriptionUsageLog[]>

// Get all recent adjustments
getAllRecentAdjustments(limit?: number): Promise<SubscriptionSlotAdjustment[]>

// Get dashboard statistics
getAdminDashboardStats(): Promise<DashboardStats>

// Extend subscription expiry
extendSubscriptionExpiry(
  subscriptionId: string,
  daysToAdd: number,
  adminId: string,
  reason: string
): Promise<SubscriptionSlotAdjustment>

// Replace subscription plan
replaceSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string,
  adminId: string,
  reason: string
): Promise<SubscriptionSlotAdjustment>
```

#### Subscription Library

**Location:** `src/lib/subscriptions.ts`

```typescript
// Check if user can book session (includes bonus slots)
canBookSession(userId: string): Promise<{
  canBook: boolean;
  reason?: string;
  slotsRemaining?: number;
}>

// Add bonus slots (admin function)
addBonusSlots(userId: string, bonusSlots: number, reason: string): Promise<StudentSubscription>

// Remove bonus slots (admin function)
removeBonusSlots(userId: string, bonusSlotsToRemove: number, reason: string): Promise<StudentSubscription>

// Deduct slot when session completes
deductSubscriptionSlot(userId: string, slots?: number): Promise<boolean>
```

#### Booking Validation

**Location:** `src/lib/booking-validation.ts`

```typescript
// Comprehensive booking validation
validateBookingEligibility(
  userId: string,
  scheduledTime: string,
  durationMins: number,
  mentorId: string
): Promise<BookingValidationResult>

// Book session with slot deduction
bookSessionWithSlotDeduction(
  userId: string,
  bookingData: {...}
): Promise<{ success: boolean; bookingId?: string; error?: string }>

// Complete session with slot deduction
completeSessionWithSlotDeduction(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }>

// Cancel session (no slot deduction)
cancelSessionWithSlotRelease(
  bookingId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }>
```

#### Notification Service

**Location:** `src/lib/subscription-notifications.ts`

```typescript
// Send subscription notification to student
sendSubscriptionNotification(payload: SubscriptionNotificationPayload): Promise<void>

// Send admin notification
sendAdminSubscriptionNotification(
  adminId: string,
  type: 'purchased' | 'expired' | 'last_session_used' | 'manual_adjustment',
  studentName: string,
  metadata?: Record<string, any>
): Promise<void>

// Check and send low slots notification
checkAndSendLowSlotsNotification(
  userId: string,
  slotsRemaining: number,
  threshold?: number
): Promise<void>

// Notify all admins
notifyAllAdmins(
  type: 'purchased' | 'expired' | 'last_session_used' | 'manual_adjustment',
  studentName: string,
  metadata?: Record<string, any>
): Promise<void>
```

---

## Frontend Components

### Admin Subscription Management Page

**Location:** `src/routes/_authenticated/admin/subscription-management.tsx`

**Route:** `/admin/subscription-management`

**Features:**
- Overview dashboard with statistics
- Student subscription list with management actions
- All adjustments history
- Detailed adjustment dialog with multiple action types
- Usage logs viewer

**Tabs:**
1. **Overview** - Stats cards and recent adjustments
2. **Students** - Table of all student subscriptions
3. **Adjustments** - All recent adjustments across all students

### Student Subscription Card

**Location:** `src/components/subscription-slot-card.tsx`

**Features:**
- Displays current plan name
- Progress bar showing slot usage
- Remaining/used/total slots
- Bonus sessions display
- Expiry date
- Status badge
- Action buttons (Book Session / Renew Plan / View Plans)
- Low slots warning

### React Query Hooks

**Location:** `src/modules/admin/subscription-management/hooks/use-admin-subscription.ts`

```typescript
// Get all student subscriptions
useAllStudentSubscriptions(): UseQueryResult<StudentSubscriptionInfo[]>

// Get student subscription summary
useStudentSubscriptionSummary(studentId: string | null): UseQueryResult<SubscriptionSummary | null>

// Adjust student slots
useAdjustStudentSlots(): UseMutationResult<SubscriptionSlotAdjustment, Error, AdminSlotAdjustmentData>

// Get adjustment history
useStudentAdjustmentHistory(studentId: string | null): UseQueryResult<SubscriptionSlotAdjustment[]>

// Get usage logs
useStudentUsageLogs(studentId: string | null): UseQueryResult<SubscriptionUsageLog[]>

// Get all recent adjustments
useAllRecentAdjustments(limit?: number): UseQueryResult<SubscriptionSlotAdjustment[]>

// Get dashboard stats
useAdminDashboardStats(): UseQueryResult<DashboardStats>

// Extend subscription expiry
useExtendSubscriptionExpiry(): UseMutationResult<SubscriptionSlotAdjustment, Error, {...}>

// Replace subscription plan
useReplaceSubscriptionPlan(): UseMutationResult<SubscriptionSlotAdjustment, Error, {...}>
```

---

## RLS Policies

### `subscription_slot_adjustments` Table

```sql
-- Students can read their own adjustment history
CREATE POLICY "Slot adjustments student read own" ON public.subscription_slot_adjustments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Admins can manage all adjustments
CREATE POLICY "Slot adjustments admin manage" ON public.subscription_slot_adjustments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### `subscription_usage_logs` Table

```sql
-- Students can read their own usage logs
CREATE POLICY "Usage logs student read own" ON public.subscription_usage_logs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Admins can read all usage logs
CREATE POLICY "Usage logs admin read" ON public.subscription_usage_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs
CREATE POLICY "Usage logs service insert" ON public.subscription_usage_logs
  FOR INSERT TO service_role
  WITH CHECK (true);
```

### `student_subscriptions` Table (Enhanced)

```sql
-- Students can only see their own
CREATE POLICY "student_subscriptions_user" ON public.student_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Admins can manage all subscriptions
CREATE POLICY "subscriptions_admin_all" ON public.student_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

---

## Usage Examples

### Example 1: Student Purchases Subscription

```typescript
// 1. Student completes payment
const subscription = await purchaseSubscription(
  userId,
  planId,
  paymentOrderId
);

// Result:
{
  id: "sub-uuid",
  user_id: "user-uuid",
  plan_id: "plan-uuid",
  status: "active",
  current_session_slots: 22,
  total_session_slots: 22,
  used_session_slots: 0,
  bonus_slots: 0,
  expires_at: "2026-08-31T00:00:00Z"
}

// 2. Notification sent to student
await sendSubscriptionNotification({
  student_id: userId,
  type: "activated",
  slots_remaining: 22
});

// 3. Notification sent to admins
await notifyAllAdmins("purchased", studentName);
```

### Example 2: Student Books Session

```typescript
// 1. Validate booking eligibility
const validation = await validateBookingEligibility(
  userId,
  scheduledTime,
  durationMins,
  mentorId
);

// Result: { canBook: true, slotsRemaining: 22 }

// 2. Book capacity slot
const slotBooked = await bookSlot(scheduledTime, durationMins);

// 3. Create booking (NO slot deduction yet)
const booking = await supabase
  .from("sessions")
  .insert({
    student_id: userId,
    mentor_id: mentorId,
    scheduled_time: scheduledTime,
    duration_mins: durationMins,
    status: "pending"
  });

// Slots remain at 22
```

### Example 3: Session Completes (Slot Consumption)

```typescript
// 1. Mentor/Admin marks session as completed
await supabase
  .from("sessions")
  .update({ status: "completed" })
  .eq("id", bookingId);

// 2. Trigger fires automatically:
//    - Deducts 1 slot from current_session_slots
//    - Increments used_session_slots by 1
//    - Creates usage log

// Result:
{
  current_session_slots: 21,  // 22 - 1
  used_session_slots: 1       // 0 + 1
}

// 3. Usage log created:
{
  action: "session_completed",
  slots_consumed: 1,
  old_remaining_slots: 22,
  new_remaining_slots: 21,
  old_used_slots: 0,
  new_used_slots: 1
}

// 4. Notification sent to student
await sendSubscriptionNotification({
  student_id: userId,
  type: "consumed",
  slots_remaining: 21
});
```

### Example 4: Session Cancels (No Slot Consumption)

```typescript
// 1. Student cancels session
await cancelSessionWithSlotRelease(bookingId, userId);

// 2. Booking status changes to "cancelled"
// 3. Capacity slot is released
// 4. NO subscription slots are deducted

// Slots remain at 22
```

### Example 5: Admin Adds Bonus Sessions

```typescript
// 1. Admin adds 3 bonus sessions
await adjustStudentSlots({
  student_id: userId,
  subscription_id: subscriptionId,
  admin_id: adminId,
  action: "add_bonus",
  slots_change: 0,
  bonus_change: 3,
  reason: "Referral reward"
});

// 2. Adjustment record created:
{
  action: "add_bonus",
  old_remaining_slots: 5,
  new_remaining_slots: 5,
  old_bonus_slots: 0,
  new_bonus_slots: 3,
  reason: "Referral reward"
}

// 3. Subscription updated:
{
  current_session_slots: 5,
  bonus_slots: 3,
  total_available: 8  // 5 + 3
}

// 4. Notification sent to student
await sendSubscriptionNotification({
  student_id: userId,
  type: "bonus_added",
  slots_remaining: 8,
  bonus_slots: 3
});
```

### Example 6: Student Uses All Sessions

```typescript
// After using all 22 sessions:
{
  current_session_slots: 0,
  used_session_slots: 22,
  bonus_slots: 0,
  total_available: 0
}

// Booking validation fails:
const validation = await canBookSession(userId);
// { canBook: false, reason: "No slots remaining" }

// Admin notification sent:
await notifyAllAdmins("last_session_used", studentName);
```

### Example 7: Admin Extends Expiry

```typescript
// 1. Admin extends subscription by 30 days
await extendSubscriptionExpiry(
  subscriptionId,
  30, // days
  adminId,
  "Goodwill extension"
);

// 2. Adjustment record created with metadata:
{
  action: "extend_expiry",
  reason: "Goodwill extension",
  metadata: {
    old_expiry: "2026-08-31T00:00:00Z",
    new_expiry: "2026-09-30T00:00:00Z",
    days_added: 30
  }
}
```

---

## Testing Guide

### 1. Test Subscription Purchase Flow

```typescript
// Test: Student purchases subscription
const subscription = await purchaseSubscription(userId, planId, orderId);

// Verify:
// - subscription.status === "active"
// - subscription.current_session_slots === plan.num_sessions
// - subscription.used_session_slots === 0
// - subscription.bonus_slots === 0
// - Notification sent to student
// - Notification sent to admins
```

### 2. Test Booking Validation

```typescript
// Test: Student without subscription tries to book
const noSubUser = "user-without-subscription";
const validation = await canBookSession(noSubUser);
// Expected: { canBook: false, reason: "No active subscription" }

// Test: Student with expired subscription
const expiredUser = "user-with-expired-subscription";
const validation = await canBookSession(expiredUser);
// Expected: { canBook: false, reason: "Subscription expired" }

// Test: Student with zero slots
const zeroSlotsUser = "user-with-zero-slots";
const validation = await canBookSession(zeroSlotsUser);
// Expected: { canBook: false, reason: "No slots remaining" }

// Test: Student with bonus slots
const bonusUser = "user-with-bonus-slots";
const validation = await canBookSession(bonusUser);
// Expected: { canBook: true, slotsRemaining: 8 } // 5 regular + 3 bonus
```

### 3. Test Slot Consumption

```typescript
// Test: Session completion consumes slot
const initialSlots = await getRemainingSlots(userId); // 22

// Complete session
await completeSessionWithSlotDeduction(userId, bookingId);

const afterSlots = await getRemainingSlots(userId); // 21
const usedSlots = await getUsedSlots(userId); // 1

// Verify usage log created
const logs = await getStudentUsageLogs(userId);
// logs[0].action === "session_completed"
// logs[0].slots_consumed === 1

// Test: Session cancellation does NOT consume slot
await cancelSessionWithSlotRelease(bookingId, userId);

const afterCancelSlots = await getRemainingSlots(userId); // Still 21
```

### 4. Test Admin Adjustments

```typescript
// Test: Add bonus slots
await adjustStudentSlots({
  student_id: userId,
  subscription_id: subscriptionId,
  admin_id: adminId,
  action: "add_bonus",
  slots_change: 0,
  bonus_change: 3,
  reason: "Referral reward"
});

const sub = await getStudentSubscription(userId);
// sub.bonus_slots === 3

// Verify adjustment record created
const adjustments = await getStudentAdjustmentHistory(userId);
// adjustments[0].action === "add_bonus"
// adjustments[0].new_bonus_slots === 3

// Test: Decrease slots
await adjustStudentSlots({
  student_id: userId,
  subscription_id: subscriptionId,
  admin_id: adminId,
  action: "decrease_slots",
  slots_change: 2,
  bonus_change: 0,
  reason: "Duplicate compensation"
});

const sub = await getStudentSubscription(userId);
// sub.current_session_slots decreased by 2
```

### 5. Test Bonus Sessions

```typescript
// Setup: Student has 5 regular slots + 3 bonus slots
// Total available: 8

// Book 5 regular sessions
for (let i = 0; i < 5; i++) {
  await completeSessionWithSlotDeduction(userId, bookingId);
}

// Verify: Regular slots at 0, bonus slots still at 3
const sub = await getStudentSubscription(userId);
// sub.current_session_slots === 0
// sub.bonus_slots === 3

// Can still book using bonus slots
const validation = await canBookSession(userId);
// validation.canBook === true
// validation.slotsRemaining === 3

// Book 3 bonus sessions
for (let i = 0; i < 3; i++) {
  await completeSessionWithSlotDeduction(userId, bookingId);
}

// Now cannot book
const validation = await canBookSession(userId);
// validation.canBook === false
// validation.reason === "No slots remaining"
```

### 6. Test Notifications

```typescript
// Test: Low slots notification
await checkAndSendLowSlotsNotification(userId, 3, 5);
// Notification sent if:
// - slotsRemaining (3) <= threshold (5)
// - No notification sent in last 24 hours

// Test: Admin notifications
await notifyAllAdmins("purchased", "John Doe");
// All admins receive notification

// Verify in database
const { data } = await supabase
  .from("notifications")
  .select("*")
  .eq("metadata->>type", "purchased");
// data.length > 0
```

### 7. Test End-to-End Flow

```typescript
// 1. Student purchases subscription
const subscription = await purchaseSubscription(userId, planId, orderId);
// Slots: 22/22

// 2. Student books session
const booking = await bookSessionWithSlotDeduction(userId, bookingData);
// Slots: 22/22 (not consumed yet)

// 3. Session completes
await completeSessionWithSlotDeduction(userId, booking.bookingId);
// Slots: 21/22 (1 consumed)

// 4. Admin adds bonus
await adjustStudentSlots({
  action: "add_bonus",
  bonus_change: 3,
  reason: "Referral"
});
// Slots: 21/22 + 3 bonus = 24 available

// 5. Student uses remaining sessions
// ... (use 21 more sessions)
// Slots: 0/22 + 3 bonus = 3 available

// 6. Student uses bonus sessions
// ... (use 3 more sessions)
// Slots: 0/22 + 0 bonus = 0 available

// 7. Booking disabled
const validation = await canBookSession(userId);
// validation.canBook === false

// 8. Student renews subscription
const renewed = await renewSubscription(userId, newPlanId, orderId);
// Slots: 22/22 (fresh start)
```

---

## Migration Guide

### Applying the Migration

```bash
# Apply the migration
supabase migration up

# Or using Supabase CLI
npx supabase db push
```

### Verification Queries

```sql
-- Verify bonus_slots column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'student_subscriptions'
  AND column_name = 'bonus_slots';

-- Verify new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'subscription_slot_adjustments',
    'subscription_usage_logs'
  );

-- Verify functions exist
SELECT proname
FROM pg_proc
WHERE proname IN (
  'create_slot_adjustment',
  'create_usage_log',
  'check_subscription_can_book',
  'get_subscription_summary',
  'get_all_student_subscriptions'
);

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_log_session_completion';
```

---

## Performance Considerations

### Indexes

All critical queries are indexed:
- Student lookups: `idx_slot_adjustments_student`, `idx_usage_logs_student`
- Subscription lookups: `idx_slot_adjustments_subscription`, `idx_usage_logs_subscription`
- Admin queries: `idx_slot_adjustments_admin`
- Session lookups: `idx_usage_logs_session`

### Query Optimization

- Use database functions for complex queries (`get_all_student_subscriptions`)
- Leverage TanStack Query caching (staleTime: 30s - 5min)
- Realtime subscriptions for live updates
- Pagination for large datasets (limit/offset)

### Realtime

Enabled tables:
- `subscription_slot_adjustments`
- `subscription_usage_logs`
- `booking_capacity`

---

## Security Considerations

### RLS Policies

- Students can ONLY read their own data
- Students can NEVER modify slots
- Admins have full control via role-based policies
- Service role has elevated permissions for triggers/functions

### Input Validation

- All admin actions require reason (non-empty)
- Slot values are clamped to prevent negatives: `GREATEST(value, 0)`
- Subscription status validated before any slot operations
- UUID references validated with foreign keys

### Audit Trail

- Every admin action is logged with:
  - Admin ID
  - Old values
  - New values
  - Reason
  - Timestamp
  - Metadata

---

## Troubleshooting

### Common Issues

**Issue:** Slots not decreasing after session completion

**Solution:** Check if trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trg_log_session_completion';
```

**Issue:** Admin cannot adjust slots

**Solution:** Verify admin role:
```sql
SELECT * FROM user_roles WHERE user_id = 'admin-uuid' AND role = 'admin';
```

**Issue:** Notifications not sending

**Solution:** Check notifications table schema has required columns:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'notifications'
  AND column_name IN ('title', 'body', 'kind', 'category', 'metadata');
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review migration file: `supabase/migrations/20260826000000_subscription_management_enhancement.sql`
3. Check service files in `src/modules/admin/subscription-management/`
4. Review type definitions in `src/types/subscription-management.ts`

---

## Changelog

### Version 1.0.0 (2026-08-26)
- Initial enterprise architecture implementation
- Bonus slots support
- Complete audit trail
- Admin management UI
- Notification system
- Automatic slot consumption on session completion
- Enhanced booking validation