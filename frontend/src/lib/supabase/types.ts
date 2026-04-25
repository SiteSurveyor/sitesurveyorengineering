export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      asset_calibrations: {
        Row: {
          asset_id: string;
          calibration_date: string;
          calibration_status: Database["public"]["Enums"]["calibration_status"];
          certificate_number: string | null;
          certificate_path: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          next_calibration_date: string | null;
          notes: string | null;
          provider_name: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          asset_id: string;
          calibration_date: string;
          calibration_status?: Database["public"]["Enums"]["calibration_status"];
          certificate_number?: string | null;
          certificate_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          next_calibration_date?: string | null;
          notes?: string | null;
          provider_name?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          asset_id?: string;
          calibration_date?: string;
          calibration_status?: Database["public"]["Enums"]["calibration_status"];
          certificate_number?: string | null;
          certificate_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          next_calibration_date?: string | null;
          notes?: string | null;
          provider_name?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asset_calibrations_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "asset_calibrations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      asset_maintenance_events: {
        Row: {
          asset_id: string;
          cost: number;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          provider_name: string | null;
          serviced_on: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          asset_id: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          provider_name?: string | null;
          serviced_on: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          asset_id?: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          provider_name?: string | null;
          serviced_on?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_events_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "asset_maintenance_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          archived_at: string | null;
          asset_code: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          current_value: number | null;
          id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          make: string | null;
          metadata: Json;
          model: string | null;
          name: string;
          purchase_cost: number | null;
          purchase_date: string | null;
          serial_number: string | null;
          status: Database["public"]["Enums"]["asset_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          asset_code?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_value?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          make?: string | null;
          metadata?: Json;
          model?: string | null;
          name: string;
          purchase_cost?: number | null;
          purchase_date?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          asset_code?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_value?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          make?: string | null;
          metadata?: Json;
          model?: string | null;
          name?: string;
          purchase_cost?: number | null;
          purchase_date?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          bucket_name: string;
          created_at: string;
          entity_id: string;
          entity_table: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
          visibility: Database["public"]["Enums"]["attachment_visibility"];
          workspace_id: string;
        };
        Insert: {
          bucket_name: string;
          created_at?: string;
          entity_id: string;
          entity_table: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
          visibility?: Database["public"]["Enums"]["attachment_visibility"];
          workspace_id: string;
        };
        Update: {
          bucket_name?: string;
          created_at?: string;
          entity_id?: string;
          entity_table?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
          visibility?: Database["public"]["Enums"]["attachment_visibility"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          archived_at: string | null;
          contact_type: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          full_name: string;
          id: string;
          last_contact_at: string | null;
          notes: string | null;
          organization_id: string | null;
          phone: string | null;
          title: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          contact_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          last_contact_at?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          contact_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          last_contact_at?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          line_number: number;
          qty: number;
          rate: number;
          unit: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          line_number?: number;
          qty?: number;
          rate?: number;
          unit?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          line_number?: number;
          qty?: number;
          rate?: number;
          unit?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          due_date: string | null;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string | null;
          organization_id: string | null;
          paid_at: string | null;
          project_id: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          tax_total: number;
          total: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          due_date?: string | null;
          id?: string;
          invoice_number: string;
          issue_date?: string;
          notes?: string | null;
          organization_id?: string | null;
          paid_at?: string | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax_total?: number;
          total?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string;
          issue_date?: string;
          notes?: string | null;
          organization_id?: string | null;
          paid_at?: string | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax_total?: number;
          total?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      job_assignment_assets: {
        Row: {
          asset_id: string;
          assignment_id: string;
          created_at: string;
          id: string;
          workspace_id: string;
        };
        Insert: {
          asset_id: string;
          assignment_id: string;
          created_at?: string;
          id?: string;
          workspace_id: string;
        };
        Update: {
          asset_id?: string;
          assignment_id?: string;
          created_at?: string;
          id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_assignment_assets_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignment_assets_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "job_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignment_assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      job_assignment_members: {
        Row: {
          assignment_id: string;
          assignment_role: string | null;
          created_at: string;
          id: string;
          workspace_id: string;
          workspace_member_id: string;
        };
        Insert: {
          assignment_id: string;
          assignment_role?: string | null;
          created_at?: string;
          id?: string;
          workspace_id: string;
          workspace_member_id: string;
        };
        Update: {
          assignment_id?: string;
          assignment_role?: string | null;
          created_at?: string;
          id?: string;
          workspace_id?: string;
          workspace_member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_assignment_members_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "job_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignment_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignment_members_workspace_member_id_fkey";
            columns: ["workspace_member_id"];
            isOneToOne: false;
            referencedRelation: "workspace_members";
            referencedColumns: ["id"];
          },
        ];
      };
      job_assignments: {
        Row: {
          assignment_date: string;
          created_at: string;
          created_by: string | null;
          id: string;
          job_id: string | null;
          notes: string | null;
          project_id: string | null;
          status: Database["public"]["Enums"]["assignment_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assignment_date: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id?: string | null;
          notes?: string | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assignment_date?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id?: string | null;
          notes?: string | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      job_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_time: string | null;
          event_date: string;
          event_type: string;
          id: string;
          job_id: string | null;
          location: string | null;
          notes: string | null;
          project_id: string | null;
          start_time: string | null;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string | null;
          event_date: string;
          event_type?: string;
          id?: string;
          job_id?: string | null;
          location?: string | null;
          notes?: string | null;
          project_id?: string | null;
          start_time?: string | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string | null;
          event_date?: string;
          event_type?: string;
          id?: string;
          job_id?: string | null;
          location?: string | null;
          notes?: string | null;
          project_id?: string | null;
          start_time?: string | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          job_type: string | null;
          location: string | null;
          project_id: string | null;
          scheduled_end: string | null;
          scheduled_start: string | null;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          project_id?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          project_id?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_listings: {
        Row: {
          condition: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          location: string;
          name: string;
          price: number;
          seller: string;
          specs: string[] | null;
          type: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          condition: string;
          created_at?: string;
          currency: string;
          description?: string | null;
          id?: string;
          location: string;
          name: string;
          price: number;
          seller: string;
          specs?: string[] | null;
          type: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          condition?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          location?: string;
          name?: string;
          price?: number;
          seller?: string;
          specs?: string[] | null;
          type?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          read_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          title: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          title: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          title?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          archived_at: string | null;
          city: string | null;
          country_code: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          organization_type: Database["public"]["Enums"]["organization_type"];
          phone: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          organization_type?: Database["public"]["Enums"]["organization_type"];
          phone?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          organization_type?: Database["public"]["Enums"]["organization_type"];
          phone?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_id: string;
          notes: string | null;
          paid_on: string;
          payment_method: string | null;
          reference: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id: string;
          notes?: string | null;
          paid_on?: string;
          payment_method?: string | null;
          reference?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id?: string;
          notes?: string | null;
          paid_on?: string;
          payment_method?: string | null;
          reference?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          default_workspace_id: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          onboarding_complete: boolean;
          phone: string | null;
          promo_code: string | null;
          professional_title: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          default_workspace_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          onboarding_complete?: boolean;
          phone?: string | null;
          promo_code?: string | null;
          professional_title?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          default_workspace_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          onboarding_complete?: boolean;
          phone?: string | null;
          promo_code?: string | null;
          professional_title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey";
            columns: ["default_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      professionals: {
        Row: {
          availability: string;
          bio: string | null;
          certifications: string[] | null;
          created_at: string;
          currency: string;
          discipline: string;
          experience: string;
          id: string;
          location: string;
          name: string;
          rate: number;
          rate_per: string;
          rating: number | null;
          reviews: number | null;
          skills: string[] | null;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          availability: string;
          bio?: string | null;
          certifications?: string[] | null;
          created_at?: string;
          currency: string;
          discipline: string;
          experience: string;
          id?: string;
          location: string;
          name: string;
          rate: number;
          rate_per: string;
          rating?: number | null;
          reviews?: number | null;
          skills?: string[] | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          availability?: string;
          bio?: string | null;
          certifications?: string[] | null;
          created_at?: string;
          currency?: string;
          discipline?: string;
          experience?: string;
          id?: string;
          location?: string;
          name?: string;
          rate?: number;
          rate_per?: string;
          rating?: number | null;
          reviews?: number | null;
          skills?: string[] | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      project_activities: {
        Row: {
          activity_type: string;
          content: string;
          created_at: string;
          id: string;
          project_id: string;
          user_id: string | null;
        };
        Insert: {
          activity_type?: string;
          content: string;
          created_at?: string;
          id?: string;
          project_id: string;
          user_id?: string | null;
        };
        Update: {
          activity_type?: string;
          content?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_activities_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_contacts: {
        Row: {
          contact_id: string;
          created_at: string;
          id: string;
          project_id: string;
          relation: string | null;
          workspace_id: string;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          id?: string;
          project_id: string;
          relation?: string | null;
          workspace_id: string;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          relation?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_contacts_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          created_at: string;
          id: string;
          project_id: string;
          role: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          project_id: string;
          role?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          project_id?: string;
          role?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          archived_at: string | null;
          code: string | null;
          created_at: string;
          created_by: string | null;
          datum: string | null;
          description: string | null;
          ends_on: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          phase: string | null;
          points: number;
          progress: number;
          starts_on: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          datum?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          phase?: string | null;
          points?: number;
          progress?: number;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          datum?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          phase?: string | null;
          points?: number;
          progress?: number;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          line_number: number;
          qty: number;
          quote_id: string;
          rate: number;
          unit: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          line_number?: number;
          qty?: number;
          quote_id: string;
          rate?: number;
          unit?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          line_number?: number;
          qty?: number;
          quote_id?: string;
          rate?: number;
          unit?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          accepted_at: string | null;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          expires_on: string | null;
          id: string;
          issue_date: string;
          notes: string | null;
          organization_id: string | null;
          project_id: string | null;
          quote_number: string;
          status: Database["public"]["Enums"]["quote_status"];
          subtotal: number;
          tax_total: number;
          total: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          expires_on?: string | null;
          id?: string;
          issue_date?: string;
          notes?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          quote_number: string;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal?: number;
          tax_total?: number;
          total?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          expires_on?: string | null;
          id?: string;
          issue_date?: string;
          notes?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          quote_number?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal?: number;
          tax_total?: number;
          total?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invitation_token: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["workspace_member_role"];
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invitation_token?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invitation_token?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          invited_at: string | null;
          joined_at: string | null;
          role: Database["public"]["Enums"]["workspace_member_role"];
          status: Database["public"]["Enums"]["workspace_member_status"];
          title: string | null;
          updated_at: string;
          user_id: string;
          work_email: string | null;
          work_phone: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          status?: Database["public"]["Enums"]["workspace_member_status"];
          title?: string | null;
          updated_at?: string;
          user_id: string;
          work_email?: string | null;
          work_phone?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          status?: Database["public"]["Enums"]["workspace_member_status"];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          work_email?: string | null;
          work_phone?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_settings: {
        Row: {
          country_code: string;
          created_at: string;
          default_currency: string;
          settings: Json;
          timezone: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          country_code?: string;
          created_at?: string;
          default_currency?: string;
          settings?: Json;
          timezone?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          default_currency?: string;
          settings?: Json;
          timezone?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          archived_at: string | null;
          billing_email: string | null;
          country_code: string;
          created_at: string;
          currency_code: string;
          id: string;
          name: string;
          owner_user_id: string;
          slug: string | null;
          timezone: string;
          type: Database["public"]["Enums"]["workspace_type"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          billing_email?: string | null;
          country_code?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          name: string;
          owner_user_id: string;
          slug?: string | null;
          timezone?: string;
          type: Database["public"]["Enums"]["workspace_type"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          billing_email?: string | null;
          country_code?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          name?: string;
          owner_user_id?: string;
          slug?: string | null;
          timezone?: string;
          type?: Database["public"]["Enums"]["workspace_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_workspace_invitation: {
        Args: { target_invitation_token: string };
        Returns: string;
      };
      can_manage_assets: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_business_operations: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_business_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_documents: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_finance: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_operations: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_sales: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_manage_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      create_business_workspace: {
        Args: { workspace_name: string; workspace_slug?: string };
        Returns: string;
      };
      has_workspace_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["workspace_member_role"][];
          target_workspace_id: string;
        };
        Returns: boolean;
      };
      is_business_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      path_first_segment_uuid: { Args: { path: string }; Returns: string };
      set_default_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      shares_workspace_with_profile: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      asset_kind: "instrument" | "vehicle" | "equipment" | "other";
      asset_status: "available" | "deployed" | "maintenance" | "retired";
      assignment_status:
        | "draft"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      attachment_visibility: "private" | "workspace" | "public";
      calibration_status: "scheduled" | "passed" | "failed" | "expired";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
      job_status:
        | "planned"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled";
      notification_status: "unread" | "read" | "archived";
      organization_type:
        | "client"
        | "vendor"
        | "government"
        | "partner"
        | "lead"
        | "subcontractor";
      project_status: "draft" | "active" | "completed" | "on_hold" | "archived";
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired";
      workspace_member_role:
        | "owner"
        | "admin"
        | "ops_manager"
        | "finance"
        | "sales"
        | "technician"
        | "viewer";
      workspace_member_status: "active" | "invited" | "suspended";
      workspace_type: "personal" | "business";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      asset_kind: ["instrument", "vehicle", "equipment", "other"],
      asset_status: ["available", "deployed", "maintenance", "retired"],
      assignment_status: [
        "draft",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      attachment_visibility: ["private", "workspace", "public"],
      calibration_status: ["scheduled", "passed", "failed", "expired"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      job_status: [
        "planned",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      notification_status: ["unread", "read", "archived"],
      organization_type: [
        "client",
        "vendor",
        "government",
        "partner",
        "lead",
        "subcontractor",
      ],
      project_status: ["draft", "active", "completed", "on_hold", "archived"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      workspace_member_role: [
        "owner",
        "admin",
        "ops_manager",
        "finance",
        "sales",
        "technician",
        "viewer",
      ],
      workspace_member_status: ["active", "invited", "suspended"],
      workspace_type: ["personal", "business"],
    },
  },
} as const;
