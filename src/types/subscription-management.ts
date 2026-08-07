// Subscription Management Types

export interface SubscriptionSlotAdjustment {
  id: string;
  student_id: string;
  subscription_id: string;
  admin_id: string;
  action: SlotAdjustmentAction;
  old_remaining_slots: number;
  new_remaining_slots: number;
  old_bonus_slots: number;
  new_bonus_slots: number;
  reason: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SubscriptionUsageLog {
  id: string;
  student_id: string;
  subscription_id: string;
  session_id: string | null;
  action: UsageLogAction;
  slots_consumed: number;
  old_remaining_slots: number;
  new_remaining_slots: number;
  old_used_slots: number;
  new_used_slots: number;
  session_status: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type SlotAdjustmentAction = 
  | 'increase_slots'
  | 'decrease_slots'
  | 'add_bonus'
  | 'remove_bonus'
  | 'extend_expiry'
  | 'expire'
  | 'suspend'
  | 'reactivate'
  | 'replace';

export type UsageLogAction = 
  | 'session_completed'
  | 'session_cancelled'
  | 'session_rescheduled'
  | 'session_rejected'
  | 'technical_failure'
  | 'admin_compensation';

export interface SubscriptionSummary {
  subscription_id: string;
  plan_name: string;
  status: string;
  total_slots: number;
  used_slots: number;
  remaining_slots: number;
  bonus_slots: number;
  available_slots: number;
  expires_at: string | null;
  activated_at: string | null;
  days_until_expiry: number | null;
}

export interface StudentSubscriptionInfo {
  student_id: string;
  student_name: string;
  student_email: string;
  subscription_id: string;
  plan_name: string;
  status: string;
  total_slots: number;
  used_slots: number;
  remaining_slots: number;
  bonus_slots: number;
  available_slots: number;
  expires_at: string | null;
  activated_at: string | null;
  days_until_expiry: number | null;
  is_near_expiry: boolean;
  is_zero_slots: boolean;
}

export interface AdminSlotAdjustmentData {
  student_id: string;
  subscription_id: string;
  admin_id: string;
  action: SlotAdjustmentAction;
  slots_change: number;
  bonus_change: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionNotificationData {
  student_id: string;
  type: 'activated' | 'consumed' | 'low_slots' | 'expired' | 'bonus_added';
  slots_remaining?: number;
  threshold?: number;
  bonus_slots?: number;
}

// Helper type guards
export function isSlotAdjustmentAction(action: string): action is SlotAdjustmentAction {
  return [
    'increase_slots',
    'decrease_slots',
    'add_bonus',
    'remove_bonus',
    'extend_expiry',
    'expire',
    'suspend',
    'reactivate',
    'replace'
  ].includes(action);
}

export function isUsageLogAction(action: string): action is UsageLogAction {
  return [
    'session_completed',
    'session_cancelled',
    'session_rescheduled',
    'session_rejected',
    'technical_failure',
    'admin_compensation'
  ].includes(action);
}