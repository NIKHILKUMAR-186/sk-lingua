export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      booking_history: {
        Row: {
          id: string;
          booking_id: string;
          actor_id: string;
          action: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          actor_id: string;
          action: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          actor_id?: string;
          action?: string;
          details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      booking_rules: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_holds: {
        Row: {
          id: string;
          mentor_id: string;
          student_id: string;
          scheduled_time: string;
          duration_mins: number;
          status: string;
          expires_at: string;
          created_at: string;
          released_at: string | null;
          booking_id: string | null;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          student_id: string;
          scheduled_time: string;
          duration_mins?: number;
          status?: string;
          expires_at?: string;
          created_at?: string;
          released_at?: string | null;
          booking_id?: string | null;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          student_id?: string;
          scheduled_time?: string;
          duration_mins?: number;
          status?: string;
          expires_at?: string;
          created_at?: string;
          released_at?: string | null;
          booking_id?: string | null;
        };
        Relationships: [];
      };
      availability_slots: {
        Row: {
          id: string;
          mentor_id: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          label: string | null;
          is_available: boolean;
          created_at: string;
          updated_at: string;
          timezone: string | null;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          label?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
          timezone?: string | null;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          day_of_week?: string;
          start_time?: string;
          end_time?: string;
          label?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gigs: {
        Row: {
          created_at: string;
          description: string | null;
          duration_mins: number;
          id: string;
          is_active: boolean;
          language: string;
          mentor_id: string;
          price: number;
          tags: string[];
          title: string;
          updated_at: string;
          cover_image: string | null;
          category: string | null;
          level: string | null;
          whats_included: Json;
          learning_outcomes: Json;
          prerequisites: string | null;
          homework_included: boolean;
          recording_included: boolean;
          certificate_included: boolean;
          featured: boolean;
          is_archived: boolean;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_mins?: number;
          id?: string;
          is_active?: boolean;
          language: string;
          mentor_id: string;
          price?: number;
          tags?: string[];
          title: string;
          updated_at?: string;
          cover_image?: string | null;
          category?: string | null;
          level?: string | null;
          whats_included?: Json;
          learning_outcomes?: Json;
          prerequisites?: string | null;
          homework_included?: boolean;
          recording_included?: boolean;
          certificate_included?: boolean;
          featured?: boolean;
          is_archived?: boolean;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_mins?: number;
          id?: string;
          is_active?: boolean;
          language?: string;
          mentor_id?: string;
          price?: number;
          tags?: string[];
          title?: string;
          updated_at?: string;
          cover_image?: string | null;
          category?: string | null;
          level?: string | null;
          whats_included?: Json;
          learning_outcomes?: Json;
          prerequisites?: string | null;
          homework_included?: boolean;
          recording_included?: boolean;
          certificate_included?: boolean;
          featured?: boolean;
          is_archived?: boolean;
        };
        Relationships: [];
      };
      mentor_profiles: {
        Row: {
          availability: Json;
          bio: string | null;
          certifications: string[];
          cover_url: string | null;
          created_at: string;
          education: string | null;
          headline: string | null;
          hourly_rate: number;
          is_active: boolean;
          languages_taught: string[];
          linkedin_url: string | null;
          rating_avg: number;
          teaching_style: string | null;
          timezone: string | null;
          total_reviews: number;
          updated_at: string;
          user_id: string;
          website_url: string | null;
          youtube_url: string | null;
          years_experience: number;
          availability_preview: string | null;
          about: string | null;
          experience: Json;
          education_json: Json;
          portfolio_images: Json;
          intro_video_url: string | null;
          demo_lesson_url: string | null;
          is_verified: boolean;
          verification_badges: Json;
          total_students: number;
          total_sessions: number;
          response_rate: number;
          completion_rate: number;
          joined_date: string;
          specializations: Json;
          achievements: Json;
          gallery_images: Json;
        };
        Insert: {
          availability?: Json;
          bio?: string | null;
          certifications?: string[];
          cover_url?: string | null;
          created_at?: string;
          education?: string | null;
          headline?: string | null;
          hourly_rate?: number;
          is_active?: boolean;
          languages_taught?: string[];
          linkedin_url?: string | null;
          rating_avg?: number;
          teaching_style?: string | null;
          timezone?: string | null;
          total_reviews?: number;
          updated_at?: string;
          user_id: string;
          website_url?: string | null;
          youtube_url?: string | null;
          years_experience?: number;
          availability_preview?: string | null;
          about?: string | null;
          experience?: Json;
          education_json?: Json;
          portfolio_images?: Json;
          intro_video_url?: string | null;
          demo_lesson_url?: string | null;
          is_verified?: boolean;
          verification_badges?: Json;
          total_students?: number;
          total_sessions?: number;
          response_rate?: number;
          completion_rate?: number;
          joined_date?: string;
          specializations?: Json;
          achievements?: Json;
          gallery_images?: Json;
        };
        Update: {
          availability?: Json;
          bio?: string | null;
          certifications?: string[];
          cover_url?: string | null;
          created_at?: string;
          education?: string | null;
          headline?: string | null;
          hourly_rate?: number;
          is_active?: boolean;
          languages_taught?: string[];
          linkedin_url?: string | null;
          rating_avg?: number;
          teaching_style?: string | null;
          timezone?: string | null;
          total_reviews?: number;
          updated_at?: string;
          user_id?: string;
          website_url?: string | null;
          youtube_url?: string | null;
          years_experience?: number;
          availability_preview?: string | null;
          about?: string | null;
          experience?: Json;
          education_json?: Json;
          portfolio_images?: Json;
          intro_video_url?: string | null;
          demo_lesson_url?: string | null;
          is_verified?: boolean;
          verification_badges?: Json;
          total_students?: number;
          total_sessions?: number;
          response_rate?: number;
          completion_rate?: number;
          joined_date?: string;
          specializations?: Json;
          achievements?: Json;
          gallery_images?: Json;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications: boolean;
          demo_updates: boolean;
          subscription_updates: boolean;
          account_updates: boolean;
          system_announcements: boolean;
          marketing_emails: boolean;
          sms_notifications: boolean;
          push_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications?: boolean;
          demo_updates?: boolean;
          subscription_updates?: boolean;
          account_updates?: boolean;
          system_announcements?: boolean;
          marketing_emails?: boolean;
          sms_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications?: boolean;
          demo_updates?: boolean;
          subscription_updates?: boolean;
          account_updates?: boolean;
          system_announcements?: boolean;
          marketing_emails?: boolean;
          sms_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          user_id: string;
          category: string | null;
          kind: string | null;
          related_id: string | null;
          metadata: Json | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          user_id: string;
          category?: string | null;
          kind?: string | null;
          related_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          user_id?: string;
          category?: string | null;
          kind?: string | null;
          related_id?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      mentor_applications: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          email: string;
          phone_number: string | null;
          native_language: string;
          education: string | null;
          degree: string | null;
          college: string | null;
          graduation_year: number | null;
          current_company: string | null;
          current_role: string | null;
          teaching_languages: string[];
          subjects: string[];
          availability: string[];
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          resume_path: string | null;
          resume_url: string | null;
          resume_file_name: string | null;
          resume_file_type: string | null;
          why_apply: string | null;
          why_good_mentor: string | null;
          teaching_methodology: string | null;
          experience: string | null;
          teaching_style: string | null;
          sample_lessons: string | null;
          status: string;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          phone_number?: string | null;
          native_language: string;
          education?: string | null;
          degree?: string | null;
          college?: string | null;
          graduation_year?: number | null;
          current_company?: string | null;
          current_role?: string | null;
          teaching_languages?: string[];
          subjects?: string[];
          availability?: string[];
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          resume_path?: string | null;
          resume_url?: string | null;
          resume_file_name?: string | null;
          resume_file_type?: string | null;
          why_apply?: string | null;
          why_good_mentor?: string | null;
          teaching_methodology?: string | null;
          experience?: string | null;
          teaching_style?: string | null;
          sample_lessons?: string | null;
          status?: string;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          full_name?: string;
          email?: string;
          phone_number?: string | null;
          native_language?: string;
          education?: string | null;
          degree?: string | null;
          college?: string | null;
          graduation_year?: number | null;
          current_company?: string | null;
          current_role?: string | null;
          teaching_languages?: string[];
          subjects?: string[];
          availability?: string[];
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          resume_path?: string | null;
          resume_url?: string | null;
          resume_file_name?: string | null;
          resume_file_type?: string | null;
          why_apply?: string | null;
          why_good_mentor?: string | null;
          teaching_methodology?: string | null;
          experience?: string | null;
          teaching_style?: string | null;
          sample_lessons?: string | null;
          status?: string;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          cover_url: string | null;
          state: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          github_url: string | null;
          id: string;
          interests: string | null;
          learning_goal: string | null;
          linkedin_url: string | null;
          native_language: string | null;
          onboarded: boolean;
          reference_no: number;
          target_language: string | null;
          current_level: string | null;
          timezone: string | null;
          updated_at: string;
          website_url: string | null;
          youtube_url: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          state?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          id: string;
          interests?: string | null;
          learning_goal?: string | null;
          linkedin_url?: string | null;
          native_language?: string | null;
          onboarded?: boolean;
          reference_no?: number;
          target_language?: string | null;
          current_level?: string | null;
          timezone?: string | null;
          updated_at?: string;
          website_url?: string | null;
          youtube_url?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          state?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          id?: string;
          interests?: string | null;
          learning_goal?: string | null;
          linkedin_url?: string | null;
          native_language?: string | null;
          onboarded?: boolean;
          reference_no?: number;
          target_language?: string | null;
          current_level?: string | null;
          timezone?: string | null;
          updated_at?: string;
          website_url?: string | null;
          youtube_url?: string | null;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          currency: string;
          billing_cycle: string;
          num_sessions: number;
          validity_days: number | null;
          features: Json;
          recommended: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price?: number;
          currency?: string;
          billing_cycle: string;
          num_sessions?: number;
          validity_days?: number | null;
          features?: Json;
          recommended?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          billing_cycle?: string;
          num_sessions?: number;
          validity_days?: number | null;
          features?: Json;
          recommended?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: string;
          current_session_slots: number;
          total_session_slots: number;
          used_session_slots: number;
          bonus_slots: number;
          price_at_purchase: number | null;
          currency_at_purchase: string | null;
          validity_days_at_purchase: number | null;
          payment_order_id: string | null;
          purchased_at: string;
          activated_at: string | null;
          expires_at: string | null;
          renewed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: string;
          current_session_slots: number;
          total_session_slots: number;
          used_session_slots?: number;
          bonus_slots?: number;
          price_at_purchase?: number | null;
          currency_at_purchase?: string | null;
          validity_days_at_purchase?: number | null;
          payment_order_id?: string | null;
          purchased_at?: string;
          activated_at?: string | null;
          expires_at?: string | null;
          renewed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: string;
          current_session_slots?: number;
          total_session_slots?: number;
          used_session_slots?: number;
          bonus_slots?: number;
          price_at_purchase?: number | null;
          currency_at_purchase?: string | null;
          validity_days_at_purchase?: number | null;
          payment_order_id?: string | null;
          purchased_at?: string;
          activated_at?: string | null;
          expires_at?: string | null;
          renewed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      demo_session_bookings: {
        Row: {
          id: string;
          user_id: string;
          booking_date: string;
          booking_time_start: string;
          booking_time_end: string;
          language: string;
          duration_mins: number;
          payment_status: string;
          booking_status: string;
          price: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_date: string;
          booking_time_start: string;
          booking_time_end: string;
          language: string;
          duration_mins?: number;
          payment_status?: string;
          booking_status?: string;
          price?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          booking_date?: string;
          booking_time_start?: string;
          booking_time_end?: string;
          language?: string;
          duration_mins?: number;
          payment_status?: string;
          booking_status?: string;
          price?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_orders: {
        Row: {
          id: string;
          user_id: string;
          order_type: string;
          related_id: string | null;
          amount: number;
          tax_amount: number;
          discount_amount: number;
          final_amount: number;
          currency: string;
          payment_method: string | null;
          payment_status: string;
          transaction_id: string | null;
          gateway: string | null;
          gateway_order_id: string | null;
          gateway_response: Json | null;
          billing_address: Json | null;
          customer_email: string | null;
          customer_phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_type: string;
          related_id?: string | null;
          amount: number;
          tax_amount?: number;
          discount_amount?: number;
          final_amount: number;
          currency?: string;
          payment_method?: string | null;
          payment_status?: string;
          transaction_id?: string | null;
          gateway?: string | null;
          gateway_order_id?: string | null;
          gateway_response?: Json | null;
          billing_address?: Json | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_type?: string;
          related_id?: string | null;
          amount?: number;
          tax_amount?: number;
          discount_amount?: number;
          final_amount?: number;
          currency?: string;
          payment_method?: string | null;
          payment_status?: string;
          transaction_id?: string | null;
          gateway?: string | null;
          gateway_order_id?: string | null;
          gateway_response?: Json | null;
          billing_address?: Json | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      payment_history: {
        Row: {
          id: string;
          user_id: string;
          payment_order_id: string;
          transaction_type: string;
          amount: number;
          status: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          payment_order_id: string;
          transaction_type: string;
          amount: number;
          status?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          payment_order_id?: string;
          transaction_type?: string;
          amount?: number;
          status?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscription_history: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          plan_id: string | null;
          event_type: string;
          old_slots_remaining: number | null;
          new_slots_remaining: number | null;
          old_plan_id: string | null;
          new_plan_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          plan_id?: string | null;
          event_type: string;
          old_slots_remaining?: number | null;
          new_slots_remaining?: number | null;
          old_plan_id?: string | null;
          new_plan_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          plan_id?: string | null;
          event_type?: string;
          old_slots_remaining?: number | null;
          new_slots_remaining?: number | null;
          old_plan_id?: string | null;
          new_plan_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      session_slots: {
        Row: {
          id: string;
          slot_date: string;
          slot_time_start: string;
          slot_time_end: string;
          capacity: number;
          booked_count: number;
          status: string;
          languages: string[];
          mentor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_date: string;
          slot_time_start: string;
          slot_time_end: string;
          capacity?: number;
          booked_count?: number;
          status?: string;
          languages?: string[];
          mentor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slot_date?: string;
          slot_time_start?: string;
          slot_time_end?: string;
          capacity?: number;
          booked_count?: number;
          status?: string;
          languages?: string[];
          mentor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      slot_bookings: {
        Row: {
          id: string;
          slot_id: string;
          user_id: string;
          booking_id: string | null;
          booking_type: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          user_id: string;
          booking_id?: string | null;
          booking_type: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slot_id?: string;
          user_id?: string;
          booking_id?: string | null;
          booking_type?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          file_name: string | null;
          file_size: number | null;
          file_type: string | null;
          id: string;
          is_public: boolean;
          language: string | null;
          mentor_id: string;
          resource_type: string;
          session_id: string | null;
          shared_with: string | null;
          storage_path: string | null;
          storage_url: string | null;
          student_id: string | null;
          thumbnail_url: string | null;
          title: string;
          url: string;
          visibility: string;
          category: string | null;
          is_bookmarked: boolean;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          is_public?: boolean;
          language?: string | null;
          mentor_id: string;
          resource_type?: string;
          session_id?: string | null;
          shared_with?: string | null;
          storage_path?: string | null;
          storage_url?: string | null;
          student_id?: string | null;
          thumbnail_url?: string | null;
          title: string;
          url: string;
          visibility?: string;
          category?: string | null;
          is_bookmarked?: boolean;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          is_public?: boolean;
          language?: string | null;
          mentor_id?: string;
          resource_type?: string;
          session_id?: string | null;
          shared_with?: string | null;
          storage_path?: string | null;
          storage_url?: string | null;
          student_id?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          url?: string;
          visibility?: string;
          category?: string | null;
          is_bookmarked?: boolean;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          session_id: string | null;
          mentor_id: string;
          student_id: string;
          rating: number;
          teaching_quality_rating: number | null;
          communication_rating: number | null;
          knowledge_rating: number | null;
          punctuality_rating: number | null;
          friendliness_rating: number | null;
          recommend: boolean | null;
          review_text: string | null;
          comment: string | null;
          attachment_url: string | null;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          mentor_id: string;
          student_id: string;
          rating: number;
          teaching_quality_rating?: number | null;
          communication_rating?: number | null;
          knowledge_rating?: number | null;
          punctuality_rating?: number | null;
          friendliness_rating?: number | null;
          recommend?: boolean | null;
          review_text?: string | null;
          comment?: string | null;
          attachment_url?: string | null;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          mentor_id?: string;
          student_id?: string;
          rating?: number;
          teaching_quality_rating?: number | null;
          communication_rating?: number | null;
          knowledge_rating?: number | null;
          punctuality_rating?: number | null;
          friendliness_rating?: number | null;
          recommend?: boolean | null;
          review_text?: string | null;
          comment?: string | null;
          attachment_url?: string | null;
          is_verified?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          duration_mins: number;
          gig_id: string | null;
          id: string;
          mentor_id: string;
          notes: string | null;
          scheduled_time: string;
          status: Database["public"]["Enums"]["session_status"];
          student_id: string;
          student_message: string | null;
          subscription_id: string | null;
          updated_at: string;
          video_call_link: string | null;
        };
        Insert: {
          created_at?: string;
          duration_mins?: number;
          gig_id?: string | null;
          id?: string;
          mentor_id: string;
          notes?: string | null;
          scheduled_time: string;
          status?: Database["public"]["Enums"]["session_status"];
          student_id: string;
          student_message?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          video_call_link?: string | null;
        };
        Update: {
          created_at?: string;
          duration_mins?: number;
          gig_id?: string | null;
          id?: string;
          mentor_id?: string;
          notes?: string | null;
          scheduled_time?: string;
          status?: Database["public"]["Enums"]["session_status"];
          student_id?: string;
          student_message?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          video_call_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_gig_id_fkey";
            columns: ["gig_id"];
            isOneToOne: false;
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
        ];
      };
      streak_points: {
        Row: {
          badges: string[];
          current_streak: number;
          last_active_date: string | null;
          longest_streak: number;
          total_points: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          badges?: string[];
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          total_points?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          badges?: string[];
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          total_points?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      homeworks: {
        Row: {
          id: string;
          session_id: string;
          mentor_id: string;
          title: string;
          description: string | null;
          deadline: string | null;
          difficulty: string | null;
          estimated_time_mins: number | null;
          attachments: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          mentor_id: string;
          title: string;
          description?: string | null;
          deadline?: string | null;
          difficulty?: string | null;
          estimated_time_mins?: number | null;
          attachments?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          mentor_id?: string;
          title?: string;
          description?: string | null;
          deadline?: string | null;
          difficulty?: string | null;
          estimated_time_mins?: number | null;
          attachments?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      homework_submissions: {
        Row: {
          id: string;
          homework_id: string;
          student_id: string;
          submission_text: string | null;
          attachments: Json;
          status: string;
          submitted_at: string | null;
          mentor_feedback: string | null;
          mentor_score: number | null;
          corrections: string | null;
          mentor_feedback_attachments: Json;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          homework_id: string;
          student_id: string;
          submission_text?: string | null;
          attachments?: Json;
          status?: string;
          submitted_at?: string | null;
          mentor_feedback?: string | null;
          mentor_score?: number | null;
          corrections?: string | null;
          mentor_feedback_attachments?: Json;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          homework_id?: string;
          student_id?: string;
          submission_text?: string | null;
          attachments?: Json;
          status?: string;
          submitted_at?: string | null;
          mentor_feedback?: string | null;
          mentor_score?: number | null;
          corrections?: string | null;
          mentor_feedback_attachments?: Json;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_notes: {
        Row: {
          id: string;
          session_id: string;
          note_type: string;
          title: string | null;
          body: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          note_type: string;
          title?: string | null;
          body?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          note_type?: string;
          title?: string | null;
          body?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_timeline: {
        Row: {
          id: string;
          session_id: string;
          event_type: string;
          title: string;
          detail: string | null;
          created_by: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: string;
          title: string;
          detail?: string | null;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_type?: string;
          title?: string;
          detail?: string | null;
          created_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_booking_atomic: {
        Args: {
          p_mentor_id: string;
          p_scheduled_start: string;
          p_duration_mins?: number;
          p_hold_id?: string;
        };
        Returns: Database["public"]["Tables"]["sessions"]["Row"];
      };
      create_slot_hold: {
        Args: {
          p_mentor_id: string;
          p_scheduled_start: string;
          p_duration_mins?: number;
          p_hold_minutes?: number;
        };
        Returns: Database["public"]["Tables"]["booking_holds"]["Row"];
      };
      release_slot_hold: {
        Args: {
          p_hold_id: string;
        };
        Returns: boolean;
      };
      cleanup_expired_holds: {
        Args: {};
        Returns: number;
      };
      get_booking_rule: {
        Args: {
          p_key: string;
        };
        Returns: string;
      };
      get_all_booking_rules: {
        Args: {};
        Returns: {
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        }[];
      };
      validate_hold_for_booking: {
        Args: {
          p_hold_id: string;
          p_student_id: string;
        };
        Returns: Database["public"]["Tables"]["booking_holds"]["Row"];
      };
      get_user_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "mentor" | "admin";
      session_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
        | "confirmed"
        | "in_progress"
        | "pending_admin_assignment"
        | "pending_mentor_response";
      homework_status: "Assigned" | "In Progress" | "Submitted" | "Reviewed" | "Completed" | "Late";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
        "confirmed",
        "in_progress",
        "pending_admin_assignment",
        "pending_mentor_response",
      ],
    },
  },
} as const;

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
  experience: Array<{
    title: string;
    organization: string;
    startYear: number;
    endYear?: number;
    description?: string;
  }>;
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
