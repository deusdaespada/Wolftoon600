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
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_resource_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_permanent: boolean
          reason: string
          unbanned_at: string | null
          unbanned_by: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          reason: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_access_logs: {
        Row: {
          created_at: string
          detected_extensions: string[] | null
          id: string
          ip_address: string | null
          page_url: string | null
          reason: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detected_extensions?: string[] | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          reason: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detected_extensions?: string[] | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          reason?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string
          reason: string
          strike_count: number
        }
        Insert: {
          blocked_at?: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address: string
          reason: string
          strike_count?: number
        }
        Update: {
          blocked_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string
          reason?: string
          strike_count?: number
        }
        Relationships: []
      }
      chapters: {
        Row: {
          chapter_number: number
          chapter_title: string | null
          content: string | null
          content_type: string | null
          created_at: string
          id: string
          images: string[]
          is_vip: boolean
          title_id: string
          updated_at: string
          vip_unlock_at: string | null
        }
        Insert: {
          chapter_number: number
          chapter_title?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_vip?: boolean
          title_id: string
          updated_at?: string
          vip_unlock_at?: string | null
        }
        Update: {
          chapter_number?: number
          chapter_title?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_vip?: boolean
          title_id?: string
          updated_at?: string
          vip_unlock_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          id: string
          is_spoiler: boolean
          parent_id: string | null
          title_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          parent_id?: string | null
          title_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          parent_id?: string | null
          title_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          streak: number
          user_id: string
          xp_awarded: number
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          streak?: number
          user_id: string
          xp_awarded?: number
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          streak?: number
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          title_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          avg_chapters_per_user: number | null
          avg_reading_time_hours: number | null
          id: string
          stat_date: string
          top_genre: string | null
          total_users: number | null
          updated_at: string
        }
        Insert: {
          avg_chapters_per_user?: number | null
          avg_reading_time_hours?: number | null
          id?: string
          stat_date?: string
          top_genre?: string | null
          total_users?: number | null
          updated_at?: string
        }
        Update: {
          avg_chapters_per_user?: number | null
          avg_reading_time_hours?: number | null
          id?: string
          stat_date?: string
          top_genre?: string | null
          total_users?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          chapter_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          options: Json
          question: string
          title_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          options?: Json
          question: string
          title_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          options?: Json
          question?: string
          title_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_goals: {
        Row: {
          created_at: string
          id: string
          monthly_goal: number | null
          updated_at: string
          user_id: string
          weekly_goal: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_goal?: number | null
          updated_at?: string
          user_id: string
          weekly_goal?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          monthly_goal?: number | null
          updated_at?: string
          user_id?: string
          weekly_goal?: number | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          chapter_id: string
          id: string
          read_at: string
          title_id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          id?: string
          read_at?: string
          title_id: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          id?: string
          read_at?: string
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_history_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          chapter_id: string
          completed: boolean | null
          id: string
          last_read_at: string
          page_number: number | null
          title_id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed?: boolean | null
          id?: string
          last_read_at?: string
          page_number?: number | null
          title_id: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed?: boolean | null
          id?: string
          last_read_at?: string
          page_number?: number | null
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_reports: {
        Row: {
          created_at: string
          id: string
          message: string
          report_type: string
          reporter_id: string | null
          status: string
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          report_type: string
          reporter_id?: string | null
          status?: string
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          report_type?: string
          reporter_id?: string | null
          status?: string
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_reports_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          alternative_titles: string[] | null
          artist: string | null
          author: string
          cover: string
          created_at: string
          genres: string[]
          id: string
          rating: number | null
          slug: string | null
          status: string
          synopsis: string
          title: string
          type: string
          updated_at: string
          views: number | null
          year: number
        }
        Insert: {
          alternative_titles?: string[] | null
          artist?: string | null
          author: string
          cover: string
          created_at?: string
          genres?: string[]
          id?: string
          rating?: number | null
          slug?: string | null
          status: string
          synopsis: string
          title: string
          type: string
          updated_at?: string
          views?: number | null
          year: number
        }
        Update: {
          alternative_titles?: string[] | null
          artist?: string | null
          author?: string
          cover?: string
          created_at?: string
          genres?: string[]
          id?: string
          rating?: number | null
          slug?: string | null
          status?: string
          synopsis?: string
          title?: string
          type?: string
          updated_at?: string
          views?: number | null
          year?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reading_status: {
        Row: {
          created_at: string
          id: string
          status: string
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reading_status_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          created_at: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
          xp_in_level: number
        }
        Insert: {
          created_at?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          xp_in_level?: number
        }
        Update: {
          created_at?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          xp_in_level?: number
        }
        Relationships: []
      }
      vip_codes: {
        Row: {
          code: string
          created_at: string
          duration_days: number | null
          id: string
          is_active: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      vip_history: {
        Row: {
          action: string
          created_at: string
          expires_at: string | null
          id: string
          performed_by: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string | null
          id?: string
          performed_by?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          performed_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          created_at: string
          id: string
          visited_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          visited_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          visited_at?: string
        }
        Relationships: []
      }
      whitelisted_ips: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          level: number
          total_xp: number
          xp_in_level: number
          xp_needed: number
        }[]
      }
      calculate_level: {
        Args: { _total_xp: number }
        Returns: {
          lvl: number
          xp_in_lvl: number
          xp_needed: number
        }[]
      }
      daily_checkin: {
        Args: { _user_id: string }
        Returns: {
          already_checked: boolean
          streak: number
          xp_awarded: number
        }[]
      }
      get_chapter_reading_rankings: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          chapters_read: number
          score: number
          user_id: string
          username: string
        }[]
      }
      get_reading_rankings: {
        Args: { _limit?: number }
        Returns: {
          achievements_count: number
          avatar_url: string
          chapters_read: number
          score: number
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_title_views: { Args: { title_id: string }; Returns: undefined }
      sync_missing_profiles: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "vip"
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
      app_role: ["admin", "moderator", "user", "vip"],
    },
  },
} as const
