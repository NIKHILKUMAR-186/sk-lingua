export interface BookingTimelineEntry {
  id: string;
  booking_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MentorSessionRequest {
  id: string;
  booking_id: string;
  mentor_id: string;
  student_id: string;
  session_date: string;
  session_time: string;
  duration_mins: number;
  status: "pending" | "accepted" | "declined" | "expired";
  response_deadline: string;
  responded_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingAttention {
  counts: {
    awaitingMentor: number;
    mentorAssigned: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    expiringRequests: number;
  };
  attentionItems: Array<{
    level: "critical" | "warning" | "info";
    label: string;
    action: string;
  }>;
  expiringRequests: MentorSessionRequest[];
  upcomingConfirmed: any[];
  noMentorBookings: any[];
}

export interface MentorEligibility {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  headline: string | null;
  languages_taught: string[];
  years_experience: number;
  rating_avg: number;
  total_reviews: number;
  total_students: number;
  timezone: string | null;
  is_verified: boolean;
  active_sessions_today: number;
  active_sessions_this_week: number;
  eligibility_score: number;
  reasons: string[];
}