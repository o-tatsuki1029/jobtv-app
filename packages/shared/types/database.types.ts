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
          desired_industry: string | null
          desired_job_type: string | null
          email: string
          entry_channel: string | null
          first_name: string
          first_name_kana: string
          gender: string | null
          graduation_year: number | null
          id: string
          jobtv_id: string | null
          last_name: string
          last_name_kana: string
          major_field: string | null
          notes: string | null
          phone: string | null
          referrer: string | null
          residence_location: string | null
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
          desired_industry?: string | null
          desired_job_type?: string | null
          email: string
          entry_channel?: string | null
          first_name: string
          first_name_kana: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          jobtv_id?: string | null
          last_name: string
          last_name_kana: string
          major_field?: string | null
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          residence_location?: string | null
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
          desired_industry?: string | null
          desired_job_type?: string | null
          email?: string
          entry_channel?: string | null
          first_name?: string
          first_name_kana?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          jobtv_id?: string | null
          last_name?: string
          last_name_kana?: string
          major_field?: string | null
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          residence_location?: string | null
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
          address: string | null
          benefits: string[] | null
          capital: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          documentary_videos: Json | null
          employees: string | null
          established: string | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          main_video_url: string | null
          name: string
          notes: string | null
          representative: string | null
          short_videos: Json | null
          sns_instagram_url: string | null
          sns_tiktok_url: string | null
          sns_x_url: string | null
          sns_youtube_url: string | null
          tagline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          benefits?: string[] | null
          capital?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          documentary_videos?: Json | null
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          main_video_url?: string | null
          name: string
          notes?: string | null
          representative?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          benefits?: string[] | null
          capital?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          documentary_videos?: Json | null
          employees?: string | null
          established?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          main_video_url?: string | null
          name?: string
          notes?: string | null
          representative?: string | null
          short_videos?: Json | null
          sns_instagram_url?: string | null
          sns_tiktok_url?: string | null
          sns_x_url?: string | null
          sns_youtube_url?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
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
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          graduation_year: number
          id: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          graduation_year: number
          id?: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          available_statuses?: Database["public"]["Enums"]["application_status"][]
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          graduation_year?: number
          id?: string
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
            referencedRelation: "matching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_sessions: {
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
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          first_name_kana: string | null
          full_name: string | null
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
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
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
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
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
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings_candidate_to_company: {
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
      ratings_recruiter_to_candidate: {
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
      job_status: "active" | "closed"
      user_role: "admin" | "recruiter"
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
      job_status: ["active", "closed"],
      user_role: ["admin", "recruiter"],
    },
  },
} as const
