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
      clicks: {
        Row: {
          click_type: string
          clicked_at: string
          id: string
          item_id: string | null
          item_name: string | null
          lid: number | null
          original_link: string | null
          page: string | null
          session_id: string
          time_spent: number | null
        }
        Insert: {
          click_type: string
          clicked_at?: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          lid?: number | null
          original_link?: string | null
          page?: string | null
          session_id: string
          time_spent?: number | null
        }
        Update: {
          click_type?: string
          clicked_at?: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          lid?: number | null
          original_link?: string | null
          page?: string | null
          session_id?: string
          time_spent?: number | null
        }
        Relationships: []
      }
      email_captures: {
        Row: {
          captured_at: string
          email: string
          id: string
          ip_address: string | null
          prelanding_id: string | null
          session_id: string | null
        }
        Insert: {
          captured_at?: string
          email: string
          id?: string
          ip_address?: string | null
          prelanding_id?: string | null
          session_id?: string | null
        }
        Update: {
          captured_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          prelanding_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_captures_prelanding_id_fkey"
            columns: ["prelanding_id"]
            isOneToOne: false
            referencedRelation: "prelandings"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_content: {
        Row: {
          created_at: string
          description: string
          headline: string
          id: string
          site_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          headline?: string
          id?: string
          site_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          headline?: string
          id?: string
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      prelandings: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          created_at: string
          cta_button_text: string | null
          description: string | null
          email_placeholder: string | null
          headline: string
          id: string
          is_active: boolean
          logo_url: string | null
          main_image_url: string | null
          updated_at: string
          web_result_id: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string
          cta_button_text?: string | null
          description?: string | null
          email_placeholder?: string | null
          headline: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          main_image_url?: string | null
          updated_at?: string
          web_result_id?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string
          cta_button_text?: string | null
          description?: string | null
          email_placeholder?: string | null
          headline?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          main_image_url?: string | null
          updated_at?: string
          web_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prelandings_web_result_id_fkey"
            columns: ["web_result_id"]
            isOneToOne: false
            referencedRelation: "web_results"
            referencedColumns: ["id"]
          },
        ]
      }
      related_searches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          serial_number: number
          target_wr: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          serial_number?: number
          target_wr?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          serial_number?: number
          target_wr?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          country: string | null
          country_code: string | null
          device: string | null
          first_seen: string
          id: string
          ip_address: string | null
          last_active: string
          page_views: number
          session_id: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          device?: string | null
          first_seen?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          page_views?: number
          session_id: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          device?: string | null
          first_seen?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          page_views?: number
          session_id?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      web_results: {
        Row: {
          allowed_countries: string[] | null
          created_at: string
          description: string | null
          fallback_link: string | null
          id: string
          is_active: boolean
          is_sponsored: boolean
          link: string
          logo_url: string | null
          name: string
          serial_number: number
          title: string
          updated_at: string
          wr_page: number
        }
        Insert: {
          allowed_countries?: string[] | null
          created_at?: string
          description?: string | null
          fallback_link?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          link: string
          logo_url?: string | null
          name: string
          serial_number?: number
          title: string
          updated_at?: string
          wr_page?: number
        }
        Update: {
          allowed_countries?: string[] | null
          created_at?: string
          description?: string | null
          fallback_link?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          link?: string
          logo_url?: string | null
          name?: string
          serial_number?: number
          title?: string
          updated_at?: string
          wr_page?: number
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
