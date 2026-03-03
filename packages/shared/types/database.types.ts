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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_progress: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          status: Database["public"]["Enums"]["application_status"]
          status_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          status: Database["public"]["Enums"]["application_status"]
          status_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          status?: Database["public"]["Enums"]["application_status"]
          status_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_progress_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          created_at: string
          current_status: Database["public"]["Enums"]["application_status"]
          id: string
          job_posting_id: string
          notes: string | null
          recruiter_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["application_status"]
          id?: string
          job_posting_id: string
          notes?: string | null
          recruiter_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["application_status"]
          id?: string
          job_posting_id?: string
          notes?: string | null
          recruiter_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_interviews: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string
          id: string
          interview_date: string
          interviewer_id: string | null
          notes: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by: string
          id?: string
          interview_date: string
          interviewer_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string
          id?: string
          interview_date?: string
          interviewer_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ca_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_interviews_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          assigned_to: string | null
          created_at: string
          date_of_birth: string | null
          department_name: string | null
          desired_industry: string[] | null
          desired_job_type: string[] | null
          desired_work_location: string | null
          entry_channel: string | null
          faculty_name: string | null
          first_name: string
          first_name_kana: string
          gender: string | null
          graduation_year: number | null
          id: string
          jobtv_id: string | null
          last_name: string
          last_name_kana: string
          line_user_id: string | null
          major_field: string | null
          notes: string | null
          phone: string | null
          referrer: string | null
          school_name: string | null
          school_type: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_name?: string | null
          desired_industry?: string[] | null
          desired_job_type?: string[] | null
          desired_work_location?: string | null
          entry_channel?: string | null
          faculty_name?: string | null
          first_name: string
          first_name_kana: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          jobtv_id?: string | null
          last_name: string
          last_name_kana: string
          line_user_id?: string | null
          major_field?: string | null
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          school_name?: string | null
          school_type?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_name?: string | null
          desired_industry?: string[] | null
          desired_job_type?: string[] | null
          desired_work_location?: string | null
          entry_channel?: string | null
          faculty_name?: string | null
          first_name?: string
          first_name_kana?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          jobtv_id?: string | null
          last_name?: string
          last_name_kana?: string
          line_user_id?: string | null
          major_field?: string | null
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          school_name?: string | null
          school_type?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_templates: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          template_text: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          template_text: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          template_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          company_info: string | null
          created_at: string
          employees: string | null
          established: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          prefecture: string | null
          representative: string | null
          status: Database["public"]["Enums"]["company_status"] | null
          thumbnail_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          company_info?: string | null
          created_at?: string
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          prefecture?: string | null
          representative?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          thumbnail_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          company_info?: string | null
          created_at?: string
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          prefecture?: string | null
          representative?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          thumbnail_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      companies_draft: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          company_id: string
          company_info: string | null
          created_at: string
          draft_status: string
          employees: string | null
          established: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          prefecture: string | null
          production_company_id: string | null
          rejected_at: string | null
          representative: string | null
          submitted_at: string | null
          thumbnail_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          company_id: string
          company_info?: string | null
          created_at?: string
          draft_status?: string
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          prefecture?: string | null
          production_company_id?: string | null
          rejected_at?: string | null
          representative?: string | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          company_id?: string
          company_info?: string | null
          created_at?: string
          draft_status?: string
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          prefecture?: string | null
          production_company_id?: string | null
          rejected_at?: string | null
          representative?: string | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_draft_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_draft_production_company_id_fkey"
            columns: ["production_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pages: {
        Row: {
          benefits: string[] | null
          company_id: string
          company_videos: Json | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          documentary_videos: Json | null
          id: string
          main_video_url: string | null
          short_videos: Json | null
          sns_instagram_url: string | null
          sns_tiktok_url: string | null
          sns_x_url: string | null
          sns_youtube_url: string | null
          status: Database["public"]["Enums"]["company_page_status"]
          tagline: string | null
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          company_id: string
          company_videos?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          documentary_videos?: Json | null
          id?: string
          main_video_url?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          status?: Database["public"]["Enums"]["company_page_status"]
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          company_id?: string
          company_videos?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          documentary_videos?: Json | null
          id?: string
          main_video_url?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          status?: Database["public"]["Enums"]["company_page_status"]
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pages_draft: {
        Row: {
          approved_at: string | null
          benefits: string[] | null
          company_id: string
          company_videos: Json | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          documentary_videos: Json | null
          draft_status: Database["public"]["Enums"]["draft_status"]
          id: string
          main_video_url: string | null
          production_page_id: string | null
          rejected_at: string | null
          short_videos: Json | null
          sns_instagram_url: string | null
          sns_tiktok_url: string | null
          sns_x_url: string | null
          sns_youtube_url: string | null
          submitted_at: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          benefits?: string[] | null
          company_id: string
          company_videos?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documentary_videos?: Json | null
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          main_video_url?: string | null
          production_page_id?: string | null
          rejected_at?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          submitted_at?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          benefits?: string[] | null
          company_id?: string
          company_videos?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documentary_videos?: Json | null
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          main_video_url?: string | null
          production_page_id?: string | null
          rejected_at?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          submitted_at?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pages_draft_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pages_draft_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pages_draft_production_page_id_fkey"
            columns: ["production_page_id"]
            isOneToOne: false
            referencedRelation: "company_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          sendgrid_message_id: string | null
          slack_notified: boolean
          status: string
          subject: string
          template_name: string
          variables_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          sendgrid_message_id?: string | null
          slack_notified?: boolean
          status: string
          subject: string
          template_name: string
          variables_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          sendgrid_message_id?: string | null
          slack_notified?: boolean
          status?: string
          subject?: string
          template_name?: string
          variables_snapshot?: Json | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      event_companies: {
        Row: {
          company_id: string
          created_at: string | null
          event_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          event_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_companies_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_matching_sessions: {
        Row: {
          candidate_weight: number
          company_weight: number
          created_at: string | null
          event_id: string
          id: string
          session_count: number
          special_interviews: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          candidate_weight?: number
          company_weight?: number
          created_at?: string | null
          event_id: string
          id?: string
          session_count: number
          special_interviews?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          candidate_weight?: number
          company_weight?: number
          created_at?: string | null
          event_id?: string
          id?: string
          session_count?: number
          special_interviews?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ratings_candidate_to_company: {
        Row: {
          candidate_id: string
          comment: string | null
          company_id: string
          created_at: string | null
          event_id: string
          id: string
          rating: number
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          company_id: string
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          comment?: string | null
          company_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_candidate_to_company_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_candidate_to_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_candidate_to_company_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ratings_recruiter_to_candidate: {
        Row: {
          candidate_id: string
          comment: string | null
          communication_rating: number | null
          company_id: string
          cooperation_rating: number | null
          created_at: string | null
          creative_rating: number | null
          evaluator_name: string | null
          event_id: string
          id: string
          initiative_rating: number | null
          logic_rating: number | null
          memo: string | null
          overall_rating: number | null
          recruiter_id: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          communication_rating?: number | null
          company_id: string
          cooperation_rating?: number | null
          created_at?: string | null
          creative_rating?: number | null
          evaluator_name?: string | null
          event_id: string
          id?: string
          initiative_rating?: number | null
          logic_rating?: number | null
          memo?: string | null
          overall_rating?: number | null
          recruiter_id?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          comment?: string | null
          communication_rating?: number | null
          company_id?: string
          cooperation_rating?: number | null
          created_at?: string | null
          creative_rating?: number | null
          evaluator_name?: string | null
          event_id?: string
          id?: string
          initiative_rating?: number | null
          logic_rating?: number | null
          memo?: string | null
          overall_rating?: number | null
          recruiter_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_recruiter_to_candidate_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_recruiter_to_candidate_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_recruiter_to_candidate_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_recruiter_to_candidate_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reservations: {
        Row: {
          attended: boolean
          candidate_id: string
          created_at: string | null
          event_id: string
          id: string
          referrer: string | null
          seat_number: string | null
          status: string
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          attended?: boolean
          candidate_id: string
          created_at?: string | null
          event_id: string
          id?: string
          referrer?: string | null
          seat_number?: string | null
          status?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          attended?: boolean
          candidate_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          referrer?: string | null
          seat_number?: string | null
          status?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reservations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_special_interviews: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string | null
          event_id: string
          id: string
          session_number: number
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string | null
          event_id: string
          id?: string
          session_number: number
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          session_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_special_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_special_interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_special_interviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_time: string
          event_date: string
          event_type_id: string | null
          id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_time: string
          event_date: string
          event_type_id?: string | null
          id?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          event_date?: string
          event_type_id?: string | null
          id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "master_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          available_statuses: Database["public"]["Enums"]["application_status"][]
          benefits: string | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number | null
          employment_type: string | null
          graduation_year: number
          id: string
          location: string | null
          location_detail: string | null
          prefecture: string | null
          requirements: string | null
          selection_process: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          benefits?: string | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number | null
          employment_type?: string | null
          graduation_year: number
          id?: string
          location?: string | null
          location_detail?: string | null
          prefecture?: string | null
          requirements?: string | null
          selection_process?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          benefits?: string | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number | null
          employment_type?: string | null
          graduation_year?: number
          id?: string
          location?: string | null
          location_detail?: string | null
          prefecture?: string | null
          requirements?: string | null
          selection_process?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings_draft: {
        Row: {
          approved_at: string | null
          available_statuses: Database["public"]["Enums"]["application_status"][]
          benefits: string | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number | null
          draft_status: string
          employment_type: string | null
          graduation_year: number
          id: string
          location_detail: string | null
          prefecture: string | null
          production_job_id: string | null
          rejected_at: string | null
          requirements: string | null
          selection_process: string | null
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          benefits?: string | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number | null
          draft_status?: string
          employment_type?: string | null
          graduation_year: number
          id?: string
          location_detail?: string | null
          prefecture?: string | null
          production_job_id?: string | null
          rejected_at?: string | null
          requirements?: string | null
          selection_process?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          benefits?: string | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number | null
          draft_status?: string
          employment_type?: string | null
          graduation_year?: number
          id?: string
          location_detail?: string | null
          prefecture?: string | null
          production_job_id?: string | null
          rejected_at?: string | null
          requirements?: string | null
          selection_process?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_draft_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_draft_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_draft_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      master_areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_event_types: {
        Row: {
          area: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          target_graduation_year: number | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          target_graduation_year?: number | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_graduation_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_event_types_area_fkey"
            columns: ["area"]
            isOneToOne: false
            referencedRelation: "master_areas"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "master_event_types_target_graduation_year_fkey"
            columns: ["target_graduation_year"]
            isOneToOne: false
            referencedRelation: "master_graduation_years"
            referencedColumns: ["year"]
          },
        ]
      }
      master_graduation_years: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      matching_results: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string | null
          id: string
          is_special_interview: boolean
          matching_session_id: string
          session_number: number
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string | null
          id?: string
          is_special_interview?: boolean
          matching_session_id: string
          session_number: number
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_special_interview?: boolean
          matching_session_id?: string
          session_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "matching_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_results_matching_session_id_fkey"
            columns: ["matching_session_id"]
            isOneToOne: false
            referencedRelation: "event_matching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          target_company_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          target_company_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          target_company_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_call_list_items: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          list_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          list_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          list_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_call_list_items_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_call_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "phone_call_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_call_lists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_call_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_call_lists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_calls: {
        Row: {
          call_date: string
          call_type: string
          caller_id: string | null
          candidate_id: string
          created_at: string
          created_by: string
          duration: number | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          call_date: string
          call_type?: string
          caller_id?: string | null
          candidate_id: string
          created_at?: string
          created_by: string
          duration?: number | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          call_date?: string
          call_type?: string
          caller_id?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string
          duration?: number | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_calls_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_calls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_calls_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          candidate_id: string | null
          company_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string | null
          first_name_kana: string | null
          id: string
          last_name: string | null
          last_name_kana: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          id: string
          last_name?: string | null
          last_name_kana?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          id?: string
          last_name?: string | null
          last_name_kana?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      session_dates: {
        Row: {
          capacity: number | null
          created_at: string
          end_time: string
          event_date: string
          id: string
          session_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          end_time: string
          event_date: string
          id?: string
          session_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          end_time?: string
          event_date?: string
          id?: string
          session_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_dates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_dates_draft: {
        Row: {
          capacity: number | null
          created_at: string
          end_time: string
          event_date: string
          id: string
          session_draft_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          end_time: string
          event_date: string
          id?: string
          session_draft_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          end_time?: string
          event_date?: string
          id?: string
          session_draft_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_dates_draft_session_draft_id_fkey"
            columns: ["session_draft_id"]
            isOneToOne: false
            referencedRelation: "sessions_draft"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reservations: {
        Row: {
          attended: boolean
          candidate_id: string
          created_at: string
          id: string
          session_date_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attended?: boolean
          candidate_id: string
          created_at?: string
          id?: string
          session_date_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attended?: boolean
          candidate_id?: string
          created_at?: string
          id?: string
          session_date_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reservations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reservations_session_date_id_fkey"
            columns: ["session_date_id"]
            isOneToOne: false
            referencedRelation: "session_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string
          display_order: number | null
          graduation_year: number | null
          id: string
          location_detail: string | null
          location_type: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description: string
          display_order?: number | null
          graduation_year?: number | null
          id?: string
          location_detail?: string | null
          location_type?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          display_order?: number | null
          graduation_year?: number | null
          id?: string
          location_detail?: string | null
          location_type?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_draft: {
        Row: {
          approved_at: string | null
          capacity: number | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string
          display_order: number | null
          draft_status: string
          graduation_year: number | null
          id: string
          location_detail: string | null
          location_type: string | null
          production_session_id: string | null
          rejected_at: string | null
          submitted_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          capacity?: number | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description: string
          display_order?: number | null
          draft_status?: string
          graduation_year?: number | null
          id?: string
          location_detail?: string | null
          location_type?: string | null
          production_session_id?: string | null
          rejected_at?: string | null
          submitted_at?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          capacity?: number | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          display_order?: number | null
          draft_status?: string
          graduation_year?: number | null
          id?: string
          location_detail?: string | null
          location_type?: string | null
          production_session_id?: string | null
          rejected_at?: string | null
          submitted_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_draft_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_draft_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_draft_production_session_id_fkey"
            columns: ["production_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      top_page_featured_videos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          kind: string
          video_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          kind: string
          video_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_page_featured_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          auto_thumbnail_url: string | null
          category: Database["public"]["Enums"]["video_category"]
          company_id: string
          created_at: string
          display_order: number
          id: string
          source_url: string | null
          status: Database["public"]["Enums"]["company_page_status"]
          streaming_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          auto_thumbnail_url?: string | null
          category: Database["public"]["Enums"]["video_category"]
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["company_page_status"]
          streaming_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          auto_thumbnail_url?: string | null
          category?: Database["public"]["Enums"]["video_category"]
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["company_page_status"]
          streaming_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      videos_draft: {
        Row: {
          approved_at: string | null
          aspect_ratio: string | null
          auto_thumbnail_url: string | null
          category: Database["public"]["Enums"]["video_category"]
          company_id: string
          conversion_status: string | null
          created_at: string
          created_by: string | null
          display_order: number
          draft_status: Database["public"]["Enums"]["draft_status"]
          id: string
          mediaconvert_job_id: string | null
          production_video_id: string | null
          rejected_at: string | null
          streaming_url: string | null
          submitted_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          approved_at?: string | null
          aspect_ratio?: string | null
          auto_thumbnail_url?: string | null
          category: Database["public"]["Enums"]["video_category"]
          company_id: string
          conversion_status?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          mediaconvert_job_id?: string | null
          production_video_id?: string | null
          rejected_at?: string | null
          streaming_url?: string | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          approved_at?: string | null
          aspect_ratio?: string | null
          auto_thumbnail_url?: string | null
          category?: Database["public"]["Enums"]["video_category"]
          company_id?: string
          conversion_status?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          draft_status?: Database["public"]["Enums"]["draft_status"]
          id?: string
          mediaconvert_job_id?: string | null
          production_video_id?: string | null
          rejected_at?: string | null
          streaming_url?: string | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_draft_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_draft_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_draft_production_video_id_fkey"
            columns: ["production_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_candidate_attended_event: {
        Args: { p_candidate_id: string; p_event_id: string }
        Returns: boolean
      }
      check_candidate_in_company_event: {
        Args: { p_candidate_id: string; p_company_id: string }
        Returns: boolean
      }
      check_company_in_event: {
        Args: { p_company_id: string; p_event_id: string }
        Returns: boolean
      }
      create_candidate_and_link_profile: {
        Args: { payload: Json }
        Returns: string
      }
      get_company_reservation_count_for_dates: {
        Args: { p_session_date_ids: string[] }
        Returns: number
      }
      get_company_session_reservations: {
        Args: { p_limit?: number; p_session_id?: string }
        Returns: {
          attended: boolean
          candidate_id: string
          created_at: string
          email: string
          end_time: string
          event_date: string
          first_name: string
          first_name_kana: string
          gender: string
          graduation_year: number
          id: string
          last_name: string
          last_name_kana: string
          phone: string
          school_name: string
          session_date_id: string
          session_id: string
          session_title: string
          start_time: string
          status: string
          updated_at: string
        }[]
      }
      get_public_session_date_reservation_counts: {
        Args: { session_date_ids: string[] }
        Returns: {
          reservation_count: number
          session_date_id: string
        }[]
      }
      session_date_belongs_to_current_user_company: {
        Args: { p_session_date_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "applied"
        | "document_screening"
        | "first_interview"
        | "second_interview"
        | "final_interview"
        | "offer"
        | "rejected"
        | "withdrawn"
      company_page_status: "active" | "closed"
      company_status: "active" | "closed"
      draft_status: "draft" | "submitted" | "approved" | "rejected"
      job_status: "active" | "closed"
      session_status: "active" | "closed"
      user_role: "admin" | "recruiter" | "candidate"
      video_category: "main" | "short" | "documentary"
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
      application_status: [
        "applied",
        "document_screening",
        "first_interview",
        "second_interview",
        "final_interview",
        "offer",
        "rejected",
        "withdrawn",
      ],
      company_page_status: ["active", "closed"],
      company_status: ["active", "closed"],
      draft_status: ["draft", "submitted", "approved", "rejected"],
      job_status: ["active", "closed"],
      session_status: ["active", "closed"],
      user_role: ["admin", "recruiter", "candidate"],
      video_category: ["main", "short", "documentary"],
    },
  },
} as const
