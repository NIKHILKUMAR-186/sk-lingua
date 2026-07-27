export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_history: {
        Row: {
          id: string
          booking_id: string
          actor_id: string
          action: string
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          actor_id: string
          action: string
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          actor_id?: string
          action?: string
          details?: string | null
          created_at?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          id: string
          mentor_id: string
          day_of_week: string
          start_time: string
          end_time: string
          label: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          day_of_week: string
          start_time: string
          end_time: string
          label?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mentor_id?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          label?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gigs: {
        Row: {
          created_at: string
          description: string | null
          duration_mins: number
          id: string
          is_active: boolean
          language: string
          mentor_id: string
          price: number
          tags: string[]
          title: string
          updated_at: string
          cover_image: string | null
          category: string | null
          level: string | null
          whats_included: Json
          learning_outcomes: Json
          prerequisites: string | null
          homework_included: boolean
          recording_included: boolean
          certificate_included: boolean
          featured: boolean
          is_archived: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_mins?: number
          id?: string
          is_active?: boolean
          language: string
          mentor_id: string
          price?: number
          tags?: string[]
          title: string
          updated_at?: string
          cover_image?: string | null
          category?: string | null
          level?: string | null
          whats_included?: Json
          learning_outcomes?: Json
          prerequisites?: string | null
          homework_included?: boolean
          recording_included?: boolean
          certificate_included?: boolean
          featured?: boolean
          is_archived?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_mins?: number
          id?: string
          is_active?: boolean
          language?: string
          mentor_id?: string
          price?: number
          tags?: string[]
          title?: string
          updated_at?: string
          cover_image?: string | null
          category?: string | null
          level?: string | null
          whats_included?: Json
          learning_outcomes?: Json
          prerequisites?: string | null
          homework_included?: boolean
          recording_included?: boolean
          certificate_included?: boolean
          featured?: boolean
          is_archived?: boolean
        }
        Relationships: []
      }
      mentor_profiles: {
        Row: {
          availability: Json
          bio: string | null
          certifications: string[]
          cover_url: string | null
          created_at: string
          education: string | null
          headline: string | null
          hourly_rate: number
          is_active: boolean
          languages_taught: string[]
          linkedin_url: string | null
          rating_avg: number
          teaching_style: string | null
          timezone: string | null
          total_reviews: number
          updated_at: string
          user_id: string
          website_url: string | null
          youtube_url: string | null
          years_experience: number
          availability_preview: string | null
          about: string | null
          experience: Json
          education_json: Json
          portfolio_images: Json
          intro_video_url: string | null
          demo_lesson_url: string | null
          is_verified: boolean
          verification_badges: Json
          total_students: number
          total_sessions: number
          response_rate: number
          completion_rate: number
          joined_date: string
          specializations: Json
          achievements: Json
          gallery_images: Json
        }
        Insert: {
          availability?: Json
          bio?: string | null
          certifications?: string[]
          cover_url?: string | null
          created_at?: string
          education?: string | null
          headline?: string | null
          hourly_rate?: number
          is_active?: boolean
          languages_taught?: string[]
          linkedin_url?: string | null
          rating_avg?: number
          teaching_style?: string | null
          timezone?: string | null
          total_reviews?: number
          updated_at?: string
          user_id: string
          website_url?: string | null
          youtube_url?: string | null
          years_experience?: number
          availability_preview?: string | null
          about?: string | null
          experience?: Json
          education_json?: Json
          portfolio_images?: Json
          intro_video_url?: string | null
          demo_lesson_url?: string | null
          is_verified?: boolean
          verification_badges?: Json
          total_students?: number
          total_sessions?: number
          response_rate?: number
          completion_rate?: number
          joined_date?: string
          specializations?: Json
          achievements?: Json
          gallery_images?: Json
        }
        Update: {
          availability?: Json
          bio?: string | null
          certifications?: string[]
          cover_url?: string | null
          created_at?: string
          education?: string | null
          headline?: string | null
          hourly_rate?: number
          is_active?: boolean
          languages_taught?: string[]
          linkedin_url?: string | null
          rating_avg?: number
          teaching_style?: string | null
          timezone?: string | null
          total_reviews?: number
          updated_at?: string
          user_id?: string
          website_url?: string | null
          youtube_url?: string | null
          years_experience?: number
          availability_preview?: string | null
          about?: string | null
          experience?: Json
          education_json?: Json
          portfolio_images?: Json
          intro_video_url?: string | null
          demo_lesson_url?: string | null
          is_verified?: boolean
          verification_badges?: Json
          total_students?: number
          total_sessions?: number
          response_rate?: number
          completion_rate?: number
          joined_date?: string
          specializations?: Json
          achievements?: Json
          gallery_images?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
          category: string | null
          kind: string | null
          related_id: string | null
          metadata: Json | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
          category?: string | null
          kind?: string | null
          related_id?: string | null
          metadata?: Json | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
          category?: string | null
          kind?: string | null
          related_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          state: string | null
          created_at: string
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          interests: string | null
          learning_goal: string | null
          linkedin_url: string | null
          native_language: string | null
          onboarded: boolean
          target_language: string | null
          current_level: string | null
          timezone: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          state?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id: string
          interests?: string | null
          learning_goal?: string | null
          linkedin_url?: string | null
          native_language?: string | null
          onboarded?: boolean
          target_language?: string | null
          current_level?: string | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          state?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          interests?: string | null
          learning_goal?: string | null
          linkedin_url?: string | null
          native_language?: string | null
          onboarded?: boolean
          target_language?: string | null
          current_level?: string | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean
          language: string | null
          mentor_id: string
          resource_type: string
          session_id: string | null
          shared_with: string | null
          storage_path: string | null
          storage_url: string | null
          student_id: string | null
          thumbnail_url: string | null
          title: string
          url: string
          visibility: string
          category: string | null
          is_bookmarked: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          language?: string | null
          mentor_id: string
          resource_type?: string
          session_id?: string | null
          shared_with?: string | null
          storage_path?: string | null
          storage_url?: string | null
          student_id?: string | null
          thumbnail_url?: string | null
          title: string
          url: string
          visibility?: string
          category?: string | null
          is_bookmarked?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          language?: string | null
          mentor_id?: string
          resource_type?: string
          session_id?: string | null
          shared_with?: string | null
          storage_path?: string | null
          storage_url?: string | null
          student_id?: string | null
          thumbnail_url?: string | null
          title?: string
          url?: string
          visibility?: string
          category?: string | null
          is_bookmarked?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          mentor_id: string
          rating: number
          session_id: string | null
          student_id: string
          clarity_rating: number | null
          engagement_rating: number | null
          expertise_rating: number | null
          punctuality_rating: number | null
          is_verified: boolean
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          mentor_id: string
          rating: number
          session_id?: string | null
          student_id: string
          clarity_rating?: number | null
          engagement_rating?: number | null
          expertise_rating?: number | null
          punctuality_rating?: number | null
          is_verified?: boolean
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          mentor_id?: string
          rating?: number
          session_id?: string | null
          student_id?: string
          clarity_rating?: number | null
          engagement_rating?: number | null
          expertise_rating?: number | null
          punctuality_rating?: number | null
          is_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          duration_mins: number
          gig_id: string | null
          id: string
          mentor_id: string
          notes: string | null
          scheduled_time: string
          status: Database["public"]["Enums"]["session_status"]
          student_id: string
          student_message: string | null
          updated_at: string
          video_call_link: string | null
        }
        Insert: {
          created_at?: string
          duration_mins?: number
          gig_id?: string | null
          id?: string
          mentor_id: string
          notes?: string | null
          scheduled_time: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id: string
          student_message?: string | null
          updated_at?: string
          video_call_link?: string | null
        }
        Update: {
          created_at?: string
          duration_mins?: number
          gig_id?: string | null
          id?: string
          mentor_id?: string
          notes?: string | null
          scheduled_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id?: string
          student_message?: string | null
          updated_at?: string
          video_call_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_points: {
        Row: {
          badges: string[]
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[]
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[]
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "mentor" | "admin"
      session_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "mentor", "admin"],
      session_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

// Helper types for the new columns
export type GigWithEnhancements = Tables<"gigs"> & {
  cover_image: string | null;
  category: string | null;
  level: string | null;
  whats_included: string[];
  learning_outcomes: string[];
  prerequisites: string | null;
  homework_included: boolean;
  recording_included: boolean;
  certificate_included: boolean;
  featured: boolean;
  is_archived: boolean;
};

export type MentorProfileWithEnhancements = Tables<"mentor_profiles"> & {
  about: string | null;
  experience: Array<{ title: string; organization: string; startYear: number; endYear?: number; description?: string }>;
  education_json: Array<{ degree: string; institution: string; year: number }>;
  portfolio_images: string[];
  intro_video_url: string | null;
  demo_lesson_url: string | null;
  is_verified: boolean;
  verification_badges: string[];
  total_students: number;
  total_sessions: number;
  response_rate: number;
  completion_rate: number;
  joined_date: string;
  specializations: string[];
  achievements: string[];
  gallery_images: string[];
};

export type ReviewWithEnhancements = Tables<"reviews"> & {
  clarity_rating: number | null;
  engagement_rating: number | null;
  expertise_rating: number | null;
  punctuality_rating: number | null;
  is_verified: boolean;
};

export type ResourceWithEnhancements = Tables<"resources"> & {
  category: string | null;
  is_bookmarked: boolean;
};

export type NotificationWithEnhancements = Tables<"notifications"> & {
  category: string | null;
  kind: string | null;
  related_id: string | null;
  metadata: Record<string, unknown> | null;
};

