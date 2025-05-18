export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_users: {
        Row: {
          access_token: string | null
          account_id: string
          created_at: string
          id: string
          is_admin: boolean | null
          refresh_token: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          access_token?: string | null
          account_id: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          refresh_token?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          refresh_token?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
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
      chore_statuses: {
        Row: {
          assignee: string | null
          chore_id: string
          last_updated_at: string
          status: string
          updated_by: string | null
        }
        Insert: {
          assignee?: string | null
          chore_id: string
          last_updated_at?: string
          status: string
          updated_by?: string | null
        }
        Update: {
          assignee?: string | null
          chore_id?: string
          last_updated_at?: string
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chore_statuses_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_statuses_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: true
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          account_id: string
          created_at: string
          icon: string | null
          id: string
          reward: number | null
          title: string
        }
        Insert: {
          account_id: string
          created_at?: string
          icon?: string | null
          id?: string
          reward?: number | null
          title: string
        }
        Update: {
          account_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          reward?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          account_id: string
          avatar: string | null
          color: string | null
          created_at: string
          dob: string | null
          id: string
          name: string
        }
        Insert: {
          account_id: string
          avatar?: string | null
          color?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          avatar?: string | null
          color?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          account_id: string
          account_name: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_used: boolean
          token: string
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_used?: boolean
          token?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      share_tokens: {
        Row: {
          access_token: string
          account_id: string
          created_at: string
          id: string
          refresh_token: string
          token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string
          id?: string
          refresh_token: string
          token?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
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
      current_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_share_token_by_token: {
        Args: { token_param: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      is_account_admin: {
        Args: { account_id: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { account_id: string }
        Returns: boolean
      }
      is_account_share_token: {
        Args: { account_id: string }
        Returns: boolean
      }
      is_valid_share_token: {
        Args: { account_id: string; token_header: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
