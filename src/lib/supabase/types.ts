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
      accounts: {
        Row: {
          category: Database["public"]["Enums"]["account_category"]
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["account_category"]
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["account_category"]
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          amount: number
          created_at: string | null
          creditor_name: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          id: string
          is_paid: boolean | null
          paid_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creditor_name: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creditor_name?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      splits: {
        Row: {
          amount_owed: number
          debtor_name: string
          id: string
          is_paid: boolean | null
          paid_at: string | null
          transaction_id: string | null
        }
        Insert: {
          amount_owed: number
          debtor_name: string
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount_owed?: number
          debtor_name?: string
          id?: string
          is_paid?: boolean | null
          paid_at?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          id: string
          user_id: string
          account_id: string
          filename: string
          total_transactions: number
          confirmed_count: number
          rejected_count: number
          status: "pending" | "completed"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          filename: string
          total_transactions?: number
          confirmed_count?: number
          rejected_count?: number
          status?: "pending" | "completed"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          filename?: string
          total_transactions?: number
          confirmed_count?: number
          rejected_count?: number
          status?: "pending" | "completed"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          import_batch_id: string
          amount: number
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          transaction_date: string
          original_text: string | null
          confidence_score: number
          ai_provider: string
          status: "pending" | "confirmed" | "rejected"
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          import_batch_id: string
          amount: number
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          transaction_date: string
          original_text?: string | null
          confidence_score?: number
          ai_provider?: string
          status?: "pending" | "confirmed" | "rejected"
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          import_batch_id?: string
          amount?: number
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          transaction_date?: string
          original_text?: string | null
          confidence_score?: number
          ai_provider?: string
          status?: "pending" | "confirmed" | "rejected"
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          fee_lost: number | null
          id: string
          is_repayment: boolean | null
          is_transfer_to_third_party: boolean | null
          transaction_date: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          fee_lost?: number | null
          id?: string
          is_repayment?: boolean | null
          is_transfer_to_third_party?: boolean | null
          transaction_date?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          fee_lost?: number | null
          id?: string
          is_repayment?: boolean | null
          is_transfer_to_third_party?: boolean | null
          transaction_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      account_category: "bank" | "credit_card" | "third_party"
      currency_type: "CAD" | "TTD" | "USD"
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
      account_category: ["bank", "credit_card", "third_party"],
      currency_type: ["CAD", "TTD", "USD"],
    },
  },
} as const
