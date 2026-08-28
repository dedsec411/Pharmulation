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
      badges: {
        Row: {
          condition_type: string | null
          condition_value: number | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          compound_data: Json | null
          compound_type: string | null
          correct_answer_json: Json | null
          created_at: string
          difficulty: Database["public"]["Enums"]["case_difficulty"]
          drugs_required: string[] | null
          electronic_prescription_json: Json | null
          explanation: string | null
          formula_json: Json | null
          id: string
          mentor_tip: string | null
          mode: Database["public"]["Enums"]["case_mode"]
          patient_info_json: Json | null
          prescription_image_url: string | null
          requires_compounding: boolean
          shipment_json: Json | null
          title: string | null
        }
        Insert: {
          compound_data?: Json | null
          compound_type?: string | null
          correct_answer_json?: Json | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          drugs_required?: string[] | null
          electronic_prescription_json?: Json | null
          explanation?: string | null
          formula_json?: Json | null
          id?: string
          mentor_tip?: string | null
          mode: Database["public"]["Enums"]["case_mode"]
          patient_info_json?: Json | null
          prescription_image_url?: string | null
          requires_compounding?: boolean
          shipment_json?: Json | null
          title?: string | null
        }
        Update: {
          compound_data?: Json | null
          compound_type?: string | null
          correct_answer_json?: Json | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          drugs_required?: string[] | null
          electronic_prescription_json?: Json | null
          explanation?: string | null
          formula_json?: Json | null
          id?: string
          mentor_tip?: string | null
          mode?: Database["public"]["Enums"]["case_mode"]
          patient_info_json?: Json | null
          prescription_image_url?: string | null
          requires_compounding?: boolean
          shipment_json?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      case_templates: {
        Row: {
          base_scenario: Json
          created_at: string
          difficulty: Database["public"]["Enums"]["case_difficulty"]
          id: string
          mode: Database["public"]["Enums"]["case_mode"]
          template_name: string | null
          variation_rules: Json
        }
        Insert: {
          base_scenario: Json
          created_at?: string
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          id?: string
          mode: Database["public"]["Enums"]["case_mode"]
          template_name?: string | null
          variation_rules: Json
        }
        Update: {
          base_scenario?: Json
          created_at?: string
          difficulty?: Database["public"]["Enums"]["case_difficulty"]
          id?: string
          mode?: Database["public"]["Enums"]["case_mode"]
          template_name?: string | null
          variation_rules?: Json
        }
        Relationships: []
      }
      cpd_certificates: {
        Row: {
          certificate_url: string | null
          hours_earned: number
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          hours_earned: number
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          hours_earned?: number
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drug_brands: {
        Row: {
          brand: string
          created_at: string
          drug_id: string
          id: string
          manufacturer: string | null
          market: string
        }
        Insert: {
          brand: string
          created_at?: string
          drug_id: string
          id?: string
          manufacturer?: string | null
          market?: string
        }
        Update: {
          brand?: string
          created_at?: string
          drug_id?: string
          id?: string
          manufacturer?: string | null
          market?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_brands_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_bookmarks: {
        Row: {
          created_at: string
          drug_ref: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drug_ref: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drug_ref?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      drugs: {
        Row: {
          needs_review: boolean
          category: string | null
          contraindications: string[] | null
          created_at: string
          dosage: string | null
          drug_class: string | null
          generic_name: string | null
          id: string
          indications: string[] | null
          interactions: string[] | null
          name: string
          side_effects: string[] | null
        }
        Insert: {
          needs_review?: boolean
          category?: string | null
          contraindications?: string[] | null
          created_at?: string
          dosage?: string | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          indications?: string[] | null
          interactions?: string[] | null
          name: string
          side_effects?: string[] | null
        }
        Update: {
          needs_review?: boolean
          category?: string | null
          contraindications?: string[] | null
          created_at?: string
          dosage?: string | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          indications?: string[] | null
          interactions?: string[] | null
          name?: string
          side_effects?: string[] | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          alltime_score: number
          id: string
          mode: Database["public"]["Enums"]["case_mode"] | null
          updated_at: string
          user_id: string
          weekly_score: number
        }
        Insert: {
          alltime_score?: number
          id?: string
          mode?: Database["public"]["Enums"]["case_mode"] | null
          updated_at?: string
          user_id: string
          weekly_score?: number
        }
        Update: {
          alltime_score?: number
          id?: string
          mode?: Database["public"]["Enums"]["case_mode"] | null
          updated_at?: string
          user_id?: string
          weekly_score?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accuracy_rate: number
          avatar_url: string | null
          avg_time_per_case: number
          cpd_hours_earned: number
          created_at: string
          email: string | null
          full_name: string | null
          last_active: string | null
          level: number
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          streak_days: number
          total_cases_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          accuracy_rate?: number
          avatar_url?: string | null
          avg_time_per_case?: number
          cpd_hours_earned?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          last_active?: string | null
          level?: number
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number
          total_cases_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          accuracy_rate?: number
          avatar_url?: string | null
          avg_time_per_case?: number
          cpd_hours_earned?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          last_active?: string | null
          level?: number
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number
          total_cases_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      scores: {
        Row: {
          accuracy: number
          case_id: string | null
          completed_at: string
          errors_detail: Json
          errors_made: number
          id: string
          mode: Database["public"]["Enums"]["case_mode"]
          score: number
          time_taken: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          case_id?: string | null
          completed_at?: string
          errors_detail?: Json
          errors_made?: number
          id?: string
          mode: Database["public"]["Enums"]["case_mode"]
          score?: number
          time_taken?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          case_id?: string | null
          completed_at?: string
          errors_detail?: Json
          errors_made?: number
          id?: string
          mode?: Database["public"]["Enums"]["case_mode"]
          score?: number
          time_taken?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_seen_cases: {
        Row: {
          case_id: string | null
          generated_seed: string | null
          id: string
          last_seen_at: string
          mode: Database["public"]["Enums"]["case_mode"]
          template_id: string | null
          user_id: string
        }
        Insert: {
          case_id?: string | null
          generated_seed?: string | null
          id?: string
          last_seen_at?: string
          mode: Database["public"]["Enums"]["case_mode"]
          template_id?: string | null
          user_id: string
        }
        Update: {
          case_id?: string | null
          generated_seed?: string | null
          id?: string
          last_seen_at?: string
          mode?: Database["public"]["Enums"]["case_mode"]
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_seen_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_seen_cases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "case_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_badge_if_earned: { Args: { _badge_name: string }; Returns: boolean }
      get_profiles_safe: {
        Args: { ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          level: number
          role: Database["public"]["Enums"]["user_role"]
          streak_days: number
          user_id: string
          xp: number
        }[]
      }
      get_public_profiles: {
        Args: { limit_count?: number }
        Returns: {
          accuracy_rate: number
          avatar_url: string
          full_name: string
          level: number
          role: Database["public"]["Enums"]["user_role"]
          streak_days: number
          total_cases_completed: number
          user_id: string
          xp: number
        }[]
      }
      get_public_scores: {
        Args: {
          mode_in: Database["public"]["Enums"]["case_mode"]
          since?: string
        }
        Returns: {
          accuracy: number
          score: number
          user_id: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      case_difficulty: "easy" | "medium" | "hard"
      case_mode:
        | "rx"
        | "otc"
        | "hospital"
        | "oncology"
        | "cosmetic"
        | "emergency"
        | "industry"
        | "warehousing"
      user_role: "student" | "graduate" | "pharmd" | "admin"
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
      case_difficulty: ["easy", "medium", "hard"],
      case_mode: [
        "rx",
        "otc",
        "hospital",
        "oncology",
        "cosmetic",
        "emergency",
        "industry",
        "warehousing",
      ],
      user_role: ["student", "graduate", "pharmd", "admin"],
    },
  },
} as const
