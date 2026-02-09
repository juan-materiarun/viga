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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          credentials: Json | null
          error: string | null
          goal: string | null
          id: string
          job_type: string
          progress: Json | null
          result: Json | null
          started_at: string | null
          status: string
          steps: Json | null
          suite_id: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          credentials?: Json | null
          error?: string | null
          goal?: string | null
          id?: string
          job_type: string
          progress?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          suite_id: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          credentials?: Json | null
          error?: string | null
          goal?: string | null
          id?: string
          job_type?: string
          progress?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          suite_id?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      journey_states: {
        Row: {
          created_at: string | null
          id: string
          key_elements: Json | null
          screen_type: string | null
          screenshot_url: string | null
          semantic_description: string | null
          state_hash: string
          suite_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_elements?: Json | null
          screen_type?: string | null
          screenshot_url?: string | null
          semantic_description?: string | null
          state_hash: string
          suite_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_elements?: Json | null
          screen_type?: string | null
          screenshot_url?: string | null
          semantic_description?: string | null
          state_hash?: string
          suite_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_states_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_transitions: {
        Row: {
          action_intent: string | null
          created_at: string | null
          effect_description: string | null
          exploration_count: number | null
          from_state_id: string | null
          id: string
          suite_id: string | null
          to_state_id: string | null
          was_explored: boolean | null
        }
        Insert: {
          action_intent?: string | null
          created_at?: string | null
          effect_description?: string | null
          exploration_count?: number | null
          from_state_id?: string | null
          id?: string
          suite_id?: string | null
          to_state_id?: string | null
          was_explored?: boolean | null
        }
        Update: {
          action_intent?: string | null
          created_at?: string | null
          effect_description?: string | null
          exploration_count?: number | null
          from_state_id?: string | null
          id?: string
          suite_id?: string | null
          to_state_id?: string | null
          was_explored?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_transitions_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "journey_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_transitions_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_transitions_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "journey_states"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          full_name: string | null
          groq_key: string | null
          id: string
          settings: Json | null
          vigas_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          full_name?: string | null
          groq_key?: string | null
          id: string
          settings?: Json | null
          vigas_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          full_name?: string | null
          groq_key?: string | null
          id?: string
          settings?: Json | null
          vigas_balance?: number | null
        }
        Relationships: []
      }
      test_case_steps: {
        Row: {
          action_type: string
          created_at: string | null
          expected_observation: string | null
          id: string
          intent: string
          journey_id: string
          locator_id: string | null
          original_action_id: string | null
          payload: string | null
          step_order: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          expected_observation?: string | null
          id?: string
          intent: string
          journey_id: string
          locator_id?: string | null
          original_action_id?: string | null
          payload?: string | null
          step_order: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          expected_observation?: string | null
          id?: string
          intent?: string
          journey_id?: string
          locator_id?: string | null
          original_action_id?: string | null
          payload?: string | null
          step_order?: number
        }
        Relationships: []
      }
      test_logs: {
        Row: {
          id: string
          level: string | null
          message: string | null
          suite_id: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          level?: string | null
          message?: string | null
          suite_id?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          level?: string | null
          message?: string | null
          suite_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_logs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_steps: {
        Row: {
          action_payload: string | null
          action_type: string | null
          created_at: string | null
          dna_html: string | null
          element_id: string | null
          error_message: string | null
          expected_result: string | null
          id: string
          parent_step_id: string | null
          screenshot_url: string | null
          selector: string | null
          status: string | null
          step_order: number | null
          suite_id: string | null
          title: string | null
          xpath: string | null
        }
        Insert: {
          action_payload?: string | null
          action_type?: string | null
          created_at?: string | null
          dna_html?: string | null
          element_id?: string | null
          error_message?: string | null
          expected_result?: string | null
          id?: string
          parent_step_id?: string | null
          screenshot_url?: string | null
          selector?: string | null
          status?: string | null
          step_order?: number | null
          suite_id?: string | null
          title?: string | null
          xpath?: string | null
        }
        Update: {
          action_payload?: string | null
          action_type?: string | null
          created_at?: string | null
          dna_html?: string | null
          element_id?: string | null
          error_message?: string | null
          expected_result?: string | null
          id?: string
          parent_step_id?: string | null
          screenshot_url?: string | null
          selector?: string | null
          status?: string | null
          step_order?: number | null
          suite_id?: string | null
          title?: string | null
          xpath?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "test_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_steps_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          avg_response_time: number | null
          base_url: string | null
          created_at: string | null
          critical_failures: number | null
          duration_ms: number | null
          id: string
          is_regression: boolean | null
          name: string
          narrative: string | null
          objective: string | null
          report_data: Json | null
          status: string | null
          system_context: string | null
          test_credentials: Json | null
          total_steps: number | null
          user_id: string | null
        }
        Insert: {
          avg_response_time?: number | null
          base_url?: string | null
          created_at?: string | null
          critical_failures?: number | null
          duration_ms?: number | null
          id?: string
          is_regression?: boolean | null
          name: string
          narrative?: string | null
          objective?: string | null
          report_data?: Json | null
          status?: string | null
          system_context?: string | null
          test_credentials?: Json | null
          total_steps?: number | null
          user_id?: string | null
        }
        Update: {
          avg_response_time?: number | null
          base_url?: string | null
          created_at?: string | null
          critical_failures?: number | null
          duration_ms?: number | null
          id?: string
          is_regression?: boolean | null
          name?: string
          narrative?: string | null
          objective?: string | null
          report_data?: Json | null
          status?: string | null
          system_context?: string | null
          test_credentials?: Json | null
          total_steps?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_test_step: {
        Args: { new_step: Json; suite_id_param: string }
        Returns: undefined
      }
      get_next_exploration_task: {
        Args: { p_suite_id: string }
        Returns: {
          action_intent: string
          element_index: number
          element_selector: string
          parent_url: string
          priority: number
          task_id: string
          url: string
        }[]
      }
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
