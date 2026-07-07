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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_name: string
          currency: string
          default_tax: number
          id: boolean
          logo_data_url: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string
          currency?: string
          default_tax?: number
          id?: boolean
          logo_data_url?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          currency?: string
          default_tax?: number
          id?: boolean
          logo_data_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          archived: boolean
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived?: boolean
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived?: boolean
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          amount_paid: number
          attachments: Json
          cheques: Json | null
          created_at: string
          currency: string
          customer_id: string
          customer_name: string
          deal_date: string
          deal_status: Database["public"]["Enums"]["deal_status"]
          discount: number
          edit_request: Json | null
          expected_payment_date: string | null
          finance_notes: Json
          id: string
          immediate_amount: number | null
          lines: Json
          notes: string | null
          payment_info: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: string | null
          reference: string
          salesman_id: string
          salesman_name: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          attachments?: Json
          cheques?: Json | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_name: string
          deal_date?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          discount?: number
          edit_request?: Json | null
          expected_payment_date?: string | null
          finance_notes?: Json
          id?: string
          immediate_amount?: number | null
          lines?: Json
          notes?: string | null
          payment_info?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: string | null
          reference: string
          salesman_id: string
          salesman_name: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          attachments?: Json
          cheques?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_name?: string
          deal_date?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          discount?: number
          edit_request?: Json | null
          expected_payment_date?: string | null
          finance_notes?: Json
          id?: string
          immediate_amount?: number | null
          lines?: Json
          notes?: string | null
          payment_info?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: string | null
          reference?: string
          salesman_id?: string
          salesman_name?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          actor_id: string
          actor_name: string
          batch_number: string | null
          created_at: string
          deal_id: string | null
          deal_reference: string | null
          expiry_date: string | null
          id: string
          lot_number: string | null
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          product_id: string
          product_name: string
          purchase_order_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_changed: number
          reason: string | null
          sales_order_id: string | null
          supplier_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          actor_id: string
          actor_name: string
          batch_number?: string | null
          created_at?: string
          deal_id?: string | null
          deal_reference?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          product_id: string
          product_name: string
          purchase_order_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_changed: number
          reason?: string | null
          sales_order_id?: string | null
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          actor_id?: string
          actor_name?: string
          batch_number?: string | null
          created_at?: string
          deal_id?: string | null
          deal_reference?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          product_id?: string
          product_name?: string
          purchase_order_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_changed?: number
          reason?: string | null
          sales_order_id?: string | null
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived: boolean
          average_cost: number | null
          batch_number: string | null
          category: string
          created_at: string
          default_price: number
          description: string | null
          expiry_date: string | null
          id: string
          lot_number: string | null
          minimum_stock_level: number
          name: string
          sku: string
          stock_quantity: number
          supplier_id: string | null
          unit: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          archived?: boolean
          average_cost?: number | null
          batch_number?: string | null
          category?: string
          created_at?: string
          default_price?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          minimum_stock_level?: number
          name: string
          sku: string
          stock_quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          archived?: boolean
          average_cost?: number | null
          batch_number?: string | null
          category?: string
          created_at?: string
          default_price?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          minimum_stock_level?: number
          name?: string
          sku?: string
          stock_quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          department: string | null
          email: string
          id: string
          must_change_password: boolean
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string | null
          email: string
          id: string
          must_change_password?: boolean
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
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
      adjust_inventory: {
        Args: {
          p_movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_product_id: string
          p_quantity_after: number
          p_reason?: string
        }
        Returns: string
      }
      create_app_user: {
        Args: {
          p_active?: boolean
          p_department?: string
          p_email: string
          p_name: string
          p_password: string
          p_phone?: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      create_deal_with_inventory: {
        Args: { p_deal: Json; p_override_stock?: boolean }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_finance: { Args: never; Returns: boolean }
      request_deal_edit: { Args: { p_deal_id: string }; Returns: undefined }
      update_app_user: {
        Args: {
          p_active?: boolean
          p_department?: string
          p_email: string
          p_name: string
          p_password: string
          p_phone?: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      update_deal_with_inventory: {
        Args: { p_deal: Json; p_override_stock?: boolean }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "finance" | "salesman"
      deal_status: "pending" | "approved" | "rejected" | "delivered"
      inventory_movement_type:
        | "increase"
        | "decrease"
        | "correction"
        | "sale"
        | "override-sale"
      payment_status: "unpaid" | "partial" | "paid"
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
      app_role: ["admin", "finance", "salesman"],
      deal_status: ["pending", "approved", "rejected", "delivered"],
      inventory_movement_type: [
        "increase",
        "decrease",
        "correction",
        "sale",
        "override-sale",
      ],
      payment_status: ["unpaid", "partial", "paid"],
    },
  },
} as const
