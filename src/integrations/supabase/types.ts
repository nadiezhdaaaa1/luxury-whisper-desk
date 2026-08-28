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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_deletion_dispatches: {
        Row: {
          error_msg: string | null
          queued_at: string
          reconciled_at: string | null
          request_id: number
          status_code: number | null
        }
        Insert: {
          error_msg?: string | null
          queued_at?: string
          reconciled_at?: string | null
          request_id: number
          status_code?: number | null
        }
        Update: {
          error_msg?: string | null
          queued_at?: string
          reconciled_at?: string | null
          request_id?: number
          status_code?: number | null
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          delete_after: string
          executed_at: string | null
          last_error: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          delete_after: string
          executed_at?: string | null
          last_error?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          delete_after?: string
          executed_at?: string | null
          last_error?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_deletion_runs: {
        Row: {
          candidates: number
          executed: number
          failed: number
          id: string
          mode: string
          ran_at: string
          report: Json
        }
        Insert: {
          candidates?: number
          executed?: number
          failed?: number
          id?: string
          mode: string
          ran_at?: string
          report?: Json
        }
        Update: {
          candidates?: number
          executed?: number
          failed?: number
          id?: string
          mode?: string
          ran_at?: string
          report?: Json
        }
        Relationships: []
      }
      brands: {
        Row: {
          category: string
          created_at: string
          name: string
          slug: string
          tier: string
        }
        Insert: {
          category: string
          created_at?: string
          name: string
          slug: string
          tier: string
        }
        Update: {
          category?: string
          created_at?: string
          name?: string
          slug?: string
          tier?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string | null
          message: string
          name: string | null
          topic: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          message: string
          name?: string | null
          topic: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          message?: string
          name?: string | null
          topic?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      models: {
        Row: {
          brand_slug: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          brand_slug: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          brand_slug?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_slug_fkey"
            columns: ["brand_slug"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["slug"]
          },
        ]
      }
      muted_alert_sources: {
        Row: {
          created_at: string
          hostname: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          source: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          allow_price_rise: boolean
          created_at: string
          min_move: number
          plan_updates: boolean
          price_alerts: boolean
          product_news: boolean
          quiet_days: string
          quiet_from: string
          quiet_hours_enabled: boolean
          quiet_on_end: string
          quiet_to: string
          rhythm: string
          security_alerts: boolean
          timezone: string
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          allow_price_rise?: boolean
          created_at?: string
          min_move?: number
          plan_updates?: boolean
          price_alerts?: boolean
          product_news?: boolean
          quiet_days?: string
          quiet_from?: string
          quiet_hours_enabled?: boolean
          quiet_on_end?: string
          quiet_to?: string
          rhythm?: string
          security_alerts?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          allow_price_rise?: boolean
          created_at?: string
          min_move?: number
          plan_updates?: boolean
          price_alerts?: boolean
          product_news?: boolean
          quiet_days?: string
          quiet_from?: string
          quiet_hours_enabled?: boolean
          quiet_on_end?: string
          quiet_to?: string
          rhythm?: string
          security_alerts?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          alert_above_enabled: boolean
          alert_above_price: number | null
          alert_below_enabled: boolean
          alert_below_price: number | null
          brand: string
          category: Database["public"]["Enums"]["category_kind"]
          created_at: string
          currency: string
          id: string
          model: string | null
          notes: string | null
          photo_path: string | null
          photo_url: string | null
          purchase_price: number | null
          purchase_year: number | null
          signal_every_move: boolean
          target_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_above_enabled?: boolean
          alert_above_price?: number | null
          alert_below_enabled?: boolean
          alert_below_price?: number | null
          brand: string
          category: Database["public"]["Enums"]["category_kind"]
          created_at?: string
          currency?: string
          id?: string
          model?: string | null
          notes?: string | null
          photo_path?: string | null
          photo_url?: string | null
          purchase_price?: number | null
          purchase_year?: number | null
          signal_every_move?: boolean
          target_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_above_enabled?: boolean
          alert_above_price?: number | null
          alert_below_enabled?: boolean
          alert_below_price?: number | null
          brand?: string
          category?: Database["public"]["Enums"]["category_kind"]
          created_at?: string
          currency?: string
          id?: string
          model?: string | null
          notes?: string | null
          photo_path?: string | null
          photo_url?: string | null
          purchase_price?: number | null
          purchase_year?: number | null
          signal_every_move?: boolean
          target_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_removals: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["category_kind"] | null
          had_target_price: boolean
          held_days: number | null
          id: string
          note: string | null
          reason: string | null
          removed_at: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          category?: Database["public"]["Enums"]["category_kind"] | null
          had_target_price?: boolean
          held_days?: number | null
          id?: string
          note?: string | null
          reason?: string | null
          removed_at?: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["category_kind"] | null
          had_target_price?: boolean
          held_days?: number | null
          id?: string
          note?: string | null
          reason?: string | null
          removed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          body: string
          category: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          body: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          published?: boolean
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          body?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_until: string | null
          avatar_url: string | null
          billing_period: string | null
          billing_status: string
          brands: string[]
          categories: Database["public"]["Enums"]["category_kind"][]
          created_at: string
          display_name: string | null
          email: string
          id: string
          onboarding_completed: boolean
          past_due_since: string | null
          plan: Database["public"]["Enums"]["plan_kind"]
          quiz_completed: boolean
          role: Database["public"]["Enums"]["user_role_kind"] | null
          segments: Database["public"]["Enums"]["segment_kind"][]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          access_until?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          billing_status?: string
          brands?: string[]
          categories?: Database["public"]["Enums"]["category_kind"][]
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          onboarding_completed?: boolean
          past_due_since?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          quiz_completed?: boolean
          role?: Database["public"]["Enums"]["user_role_kind"] | null
          segments?: Database["public"]["Enums"]["segment_kind"][]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          access_until?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          billing_status?: string
          brands?: string[]
          categories?: Database["public"]["Enums"]["category_kind"][]
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          onboarding_completed?: boolean
          past_due_since?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          quiz_completed?: boolean
          role?: Database["public"]["Enums"]["user_role_kind"] | null
          segments?: Database["public"]["Enums"]["segment_kind"][]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          body: string
          brand_name: string
          brand_slug: string
          category: string
          created_at: string
          id: string
          is_sample: boolean
          model: string | null
          recommended_action: string | null
          segment: string | null
          signal_date: string
          source_url: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          brand_name: string
          brand_slug: string
          category: string
          created_at?: string
          id: string
          is_sample?: boolean
          model?: string | null
          recommended_action?: string | null
          segment?: string | null
          signal_date: string
          source_url?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          brand_name?: string
          brand_slug?: string
          category?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          model?: string | null
          recommended_action?: string | null
          segment?: string | null
          signal_date?: string
          source_url?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          event_id: string
          payload: Json
          received_at: string
          session_minted_at: string | null
          type: string
        }
        Insert: {
          event_id: string
          payload: Json
          received_at?: string
          session_minted_at?: string | null
          type: string
        }
        Update: {
          event_id?: string
          payload?: Json
          received_at?: string
          session_minted_at?: string | null
          type?: string
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
      watchlist: {
        Row: {
          brand: string
          category: Database["public"]["Enums"]["category_kind"]
          created_at: string
          currency: string
          id: string
          is_active: boolean
          model: string | null
          target_price: number | null
          type: Database["public"]["Enums"]["watchlist_item_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          brand: string
          category: Database["public"]["Enums"]["category_kind"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          model?: string | null
          target_price?: number | null
          type: Database["public"]["Enums"]["watchlist_item_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          category?: Database["public"]["Enums"]["category_kind"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          model?: string | null
          target_price?: number | null
          type?: Database["public"]["Enums"]["watchlist_item_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      account_deletion_health: {
        Row: {
          hours_since_dispatch: number | null
          hours_since_handler_run: number | null
          hours_since_non_2xx: number | null
          last_dispatch_at: string | null
          last_non_2xx_at: string | null
          last_successful_handler_run_at: string | null
          state: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reconcile_account_deletion_dispatches: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin"
      category_kind: "watches" | "jewelry" | "bags" | "fashion"
      plan_kind: "free" | "pro"
      segment_kind: "luxury_invest" | "mid_market" | "mass_market"
      user_role_kind: "collector" | "reseller" | "buyer"
      watchlist_item_kind: "brand" | "piece"
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
      app_role: ["admin"],
      category_kind: ["watches", "jewelry", "bags", "fashion"],
      plan_kind: ["free", "pro"],
      segment_kind: ["luxury_invest", "mid_market", "mass_market"],
      user_role_kind: ["collector", "reseller", "buyer"],
      watchlist_item_kind: ["brand", "piece"],
    },
  },
} as const
