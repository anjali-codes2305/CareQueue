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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      consultation_metrics: {
        Row: {
          created_at: string
          department_id: string
          doctor_id: string
          duration_minutes: number | null
          id: string
          token_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          token_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_metrics_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          designation: string
          email: string
          emp_id: string
          full_name: string
          id: string
          is_available: boolean
          must_change_password: boolean
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          designation: string
          email: string
          emp_id: string
          full_name: string
          id?: string
          is_available?: boolean
          must_change_password?: boolean
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          designation?: string
          email?: string
          emp_id?: string
          full_name?: string
          id?: string
          is_available?: boolean
          must_change_password?: boolean
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          username?: string
        }
        Relationships: []
      }
      patient_records: {
        Row: {
          appointment_date: string
          consultation_duration: number | null
          created_at: string
          created_by: string
          department_id: string | null
          doctor_id: string
          doctor_name: string | null
          estimated_wait_minutes: number | null
          id: string
          patient_name: string
          phone: string
          purpose: string
          queue_position: number | null
          severity_score: number | null
          status: string
          temp_password: string | null
          temp_username: string | null
          token_id: string | null
          token_number: number | null
        }
        Insert: {
          appointment_date: string
          consultation_duration?: number | null
          created_at?: string
          created_by: string
          department_id?: string | null
          doctor_id: string
          doctor_name?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          patient_name: string
          phone: string
          purpose: string
          queue_position?: number | null
          severity_score?: number | null
          status?: string
          temp_password?: string | null
          temp_username?: string | null
          token_id?: string | null
          token_number?: number | null
        }
        Update: {
          appointment_date?: string
          consultation_duration?: number | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          doctor_id?: string
          doctor_name?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          patient_name?: string
          phone?: string
          purpose?: string
          queue_position?: number | null
          severity_score?: number | null
          status?: string
          temp_password?: string | null
          temp_username?: string | null
          token_id?: string | null
          token_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_records_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_requests: {
        Row: {
          created_at: string
          id: string
          nurse_id: string | null
          nurse_notes: string | null
          patient_id: string
          reason: string | null
          reviewed_at: string | null
          severity_score: number | null
          status: Database["public"]["Enums"]["priority_status"]
          symptoms: Json | null
          token_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nurse_id?: string | null
          nurse_notes?: string | null
          patient_id: string
          reason?: string | null
          reviewed_at?: string | null
          severity_score?: number | null
          status?: Database["public"]["Enums"]["priority_status"]
          symptoms?: Json | null
          token_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nurse_id?: string | null
          nurse_notes?: string | null
          patient_id?: string
          reason?: string | null
          reviewed_at?: string | null
          severity_score?: number | null
          status?: Database["public"]["Enums"]["priority_status"]
          symptoms?: Json | null
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_requests_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          arrival_time: string
          consultation_end: string | null
          consultation_start: string | null
          created_at: string
          department_id: string
          doctor_id: string | null
          id: string
          patient_id: string
          position: number | null
          priority_score: number | null
          queue_type: Database["public"]["Enums"]["queue_type"]
          severity_score: number | null
          status: Database["public"]["Enums"]["token_status"]
          token_number: number
          updated_at: string
        }
        Insert: {
          arrival_time?: string
          consultation_end?: string | null
          consultation_start?: string | null
          created_at?: string
          department_id: string
          doctor_id?: string | null
          id?: string
          patient_id: string
          position?: number | null
          priority_score?: number | null
          queue_type?: Database["public"]["Enums"]["queue_type"]
          severity_score?: number | null
          status?: Database["public"]["Enums"]["token_status"]
          token_number?: number
          updated_at?: string
        }
        Update: {
          arrival_time?: string
          consultation_end?: string | null
          consultation_start?: string | null
          created_at?: string
          department_id?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string
          position?: number | null
          priority_score?: number | null
          queue_type?: Database["public"]["Enums"]["queue_type"]
          severity_score?: number | null
          status?: Database["public"]["Enums"]["token_status"]
          token_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "nurse" | "doctor" | "admin" | "receptionist"
      notification_type:
        | "token_created"
        | "queue_update"
        | "turn_near"
        | "priority_decision"
        | "doctor_calling"
        | "emergency_alert"
        | "doctor_delay"
      priority_status: "pending" | "approved" | "rejected"
      queue_type: "normal" | "priority"
      token_status: "waiting" | "in_consultation" | "completed" | "cancelled"
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
      app_role: ["patient", "nurse", "doctor", "admin", "receptionist"],
      notification_type: [
        "token_created",
        "queue_update",
        "turn_near",
        "priority_decision",
        "doctor_calling",
        "emergency_alert",
        "doctor_delay",
      ],
      priority_status: ["pending", "approved", "rejected"],
      queue_type: ["normal", "priority"],
      token_status: ["waiting", "in_consultation", "completed", "cancelled"],
    },
  },
} as const
