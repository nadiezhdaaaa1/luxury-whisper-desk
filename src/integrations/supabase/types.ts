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
      profiles: {
        Row: {
          avatar_url: string | null
          brands: string[]
          categories: Database["public"]["Enums"]["category_kind"][]
          created_at: string
          display_name: string | null
          email: string
          id: string
          onboarding_completed: boolean
          plan: Database["public"]["Enums"]["plan_kind"]
          quiz_completed: boolean
          role: Database["public"]["Enums"]["user_role_kind"] | null
          segments: Database["public"]["Enums"]["segment_kind"][]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brands?: string[]
          categories?: Database["public"]["Enums"]["category_kind"][]
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          onboarding_completed?: boolean
          plan?: Database["public"]["Enums"]["plan_kind"]
          quiz_completed?: boolean
          role?: Database["public"]["Enums"]["user_role_kind"] | null
          segments?: Database["public"]["Enums"]["segment_kind"][]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brands?: string[]
          categories?: Database["public"]["Enums"]["category_kind"][]
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          onboarding_completed?: boolean
          plan?: Database["public"]["Enums"]["plan_kind"]
          quiz_completed?: boolean
          role?: Database["public"]["Enums"]["user_role_kind"] | null
          segments?: Database["public"]["Enums"]["segment_kind"][]
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      category_kind: ["watches", "jewelry", "bags", "fashion"],
      plan_kind: ["free", "pro"],
      segment_kind: ["luxury_invest", "mid_market", "mass_market"],
      user_role_kind: ["collector", "reseller", "buyer"],
      watchlist_item_kind: ["brand", "piece"],
    },
  },
} as const
