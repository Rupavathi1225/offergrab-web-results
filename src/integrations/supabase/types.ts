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
      blogs: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_active: boolean
          slug: string
          status: string
          title: string
          total_words: number | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_active?: boolean
          slug: string
          status?: string
          title: string
          total_words?: number | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          status?: string
          title?: string
          total_words?: number | null
          updated_at?: string
        }
        Relationships: []
      }
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
      consultation_pages: {
        Row: {
          created_at: string
          cta_text: string | null
          destination_link: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          trust_line: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          destination_link: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          trust_line?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          destination_link?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          trust_line?: string | null
          updated_at?: string
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
      fallback_sequence_tracker: {
        Row: {
          current_index: number
          id: string
          updated_at: string
        }
        Insert: {
          current_index?: number
          id?: string
          updated_at?: string
        }
        Update: {
          current_index?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fallback_urls: {
        Row: {
          allowed_countries: string[] | null
          created_at: string
          id: string
          is_active: boolean
          sequence_order: number
          updated_at: string
          url: string
        }
        Insert: {
          allowed_countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          allowed_countries?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      landing_content: {
        Row: {
          active_theme: string
          created_at: string
          description: string
          headline: string
          id: string
          redirect_delay_seconds: number
          redirect_enabled: boolean
          site_name: string
          updated_at: string
          white_homepage_blogs: boolean
        }
        Insert: {
          active_theme?: string
          created_at?: string
          description?: string
          headline?: string
          id?: string
          redirect_delay_seconds?: number
          redirect_enabled?: boolean
          site_name?: string
          updated_at?: string
          white_homepage_blogs?: boolean
        }
        Update: {
          active_theme?: string
          created_at?: string
          description?: string
          headline?: string
          id?: string
          redirect_delay_seconds?: number
          redirect_enabled?: boolean
          site_name?: string
          updated_at?: string
          white_homepage_blogs?: boolean
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
          blog_id: string | null
          created_at: string
          id: string
          is_active: boolean
          serial_number: number
          target_wr: number
          title: string
          updated_at: string
        }
        Insert: {
          blog_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          serial_number?: number
          target_wr?: number
          title: string
          updated_at?: string
        }
        Update: {
          blog_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          serial_number?: number
          target_wr?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "related_searches_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
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
      sitelinks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          position: number
          title: string
          updated_at: string
          url: string
          web_result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          title: string
          updated_at?: string
          url: string
          web_result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          title?: string
          updated_at?: string
          url?: string
          web_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitelinks_web_result_id_fkey"
            columns: ["web_result_id"]
            isOneToOne: false
            referencedRelation: "web_results"
            referencedColumns: ["id"]
          },
        ]
      }
      web_result_update_history: {
        Row: {
          id: string
          new_title: string | null
          new_url: string | null
          old_title: string | null
          old_url: string | null
          updated_at: string
          updated_by: string | null
          web_result_id: string
        }
        Insert: {
          id?: string
          new_title?: string | null
          new_url?: string | null
          old_title?: string | null
          old_url?: string | null
          updated_at?: string
          updated_by?: string | null
          web_result_id: string
        }
        Update: {
          id?: string
          new_title?: string | null
          new_url?: string | null
          old_title?: string | null
          old_url?: string | null
          updated_at?: string
          updated_by?: string | null
          web_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_result_update_history_web_result_id_fkey"
            columns: ["web_result_id"]
            isOneToOne: false
            referencedRelation: "web_results"
            referencedColumns: ["id"]
          },
        ]
      }
      web_results: {
        Row: {
          allowed_countries: string[] | null
          blog_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          fallback_link: string | null
          id: string
          is_active: boolean
          is_sponsored: boolean
          link: string
          logo_url: string | null
          name: string
          related_search_id: string | null
          serial_number: number
          title: string
          updated_at: string
          wr_page: number
          wr_type: string
        }
        Insert: {
          allowed_countries?: string[] | null
          blog_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          fallback_link?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          link: string
          logo_url?: string | null
          name: string
          related_search_id?: string | null
          serial_number?: number
          title: string
          updated_at?: string
          wr_page?: number
          wr_type?: string
        }
        Update: {
          allowed_countries?: string[] | null
          blog_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          fallback_link?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean
          link?: string
          logo_url?: string | null
          name?: string
          related_search_id?: string | null
          serial_number?: number
          title?: string
          updated_at?: string
          wr_page?: number
          wr_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_results_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_results_related_search_id_fkey"
            columns: ["related_search_id"]
            isOneToOne: false
            referencedRelation: "related_searches"
            referencedColumns: ["id"]
          },
        ]
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
