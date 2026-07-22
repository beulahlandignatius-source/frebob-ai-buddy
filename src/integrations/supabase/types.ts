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
      ai_extractions: {
        Row: {
          approved_record_id: string | null
          business_id: string
          confidence: string
          created_at: string
          id: string
          latency_ms: number | null
          missing_fields: string[]
          model: string | null
          needs_review: boolean
          payload: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source_input_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_record_id?: string | null
          business_id: string
          confidence?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          missing_fields?: string[]
          model?: string | null
          needs_review?: boolean
          payload: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_input_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_record_id?: string | null
          business_id?: string
          confidence?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          missing_fields?: string[]
          model?: string | null
          needs_review?: boolean
          payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_input_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extractions_source_input_id_fkey"
            columns: ["source_input_id"]
            isOneToOne: false
            referencedRelation: "source_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_record_items: {
        Row: {
          approved_record_id: string
          business_id: string
          created_at: string
          id: string
          line_total: number | null
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number | null
          variant: string | null
        }
        Insert: {
          approved_record_id: string
          business_id: string
          created_at?: string
          id?: string
          line_total?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price?: number | null
          variant?: string | null
        }
        Update: {
          approved_record_id?: string
          business_id?: string
          created_at?: string
          id?: string
          line_total?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_record_items_approved_record_id_fkey"
            columns: ["approved_record_id"]
            isOneToOne: false
            referencedRelation: "approved_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_record_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_record_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_records: {
        Row: {
          approved_at: string
          approved_by: string | null
          approved_by_label: string | null
          business_id: string
          conversation_id: string | null
          created_at: string
          data: Json
          id: string
          reference: string
          source_text: string | null
          source_type: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          approved_by_label?: string | null
          business_id: string
          conversation_id?: string | null
          created_at?: string
          data: Json
          id?: string
          reference: string
          source_text?: string | null
          source_type: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          approved_by_label?: string | null
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          reference?: string
          source_text?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_records_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_queries: {
        Row: {
          answer: string | null
          business_id: string
          created_at: string
          error: string | null
          evidence: Json
          id: string
          language: string | null
          latency_ms: number | null
          question: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          business_id: string
          created_at?: string
          error?: string | null
          evidence?: Json
          id?: string
          language?: string | null
          latency_ms?: number | null
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          business_id?: string
          created_at?: string
          error?: string | null
          evidence?: Json
          id?: string
          language?: string | null
          latency_ms?: number | null
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_queries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_cache: {
        Row: {
          audio_base64: string
          business_id: string | null
          created_at: string
          duration_seconds: number | null
          expires_at: string
          id: string
          language_code: string
          response_format: string
          source_record_id: string | null
          source_type: string | null
          text_hash: string
          user_id: string
          voice_name: string
        }
        Insert: {
          audio_base64: string
          business_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          language_code: string
          response_format?: string
          source_record_id?: string | null
          source_type?: string | null
          text_hash: string
          user_id: string
          voice_name: string
        }
        Update: {
          audio_base64?: string
          business_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          language_code?: string
          response_format?: string
          source_record_id?: string | null
          source_type?: string | null
          text_hash?: string
          user_id?: string
          voice_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_cache_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["business_member_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["business_member_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["business_member_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          email: string | null
          id: string
          initial_inventory: string | null
          initial_products: string | null
          location: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          settings: Json
          setup_completed: boolean
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          initial_inventory?: string | null
          initial_products?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          settings?: Json
          setup_completed?: boolean
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          initial_inventory?: string | null
          initial_products?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          settings?: Json
          setup_completed?: boolean
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          approved_record_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          draft: Json | null
          edited: Json | null
          file_name: string | null
          id: string
          language: string
          processing_mode: string | null
          source_type: string
          status: string
          text: string
          updated_at: string
        }
        Insert: {
          approved_record_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          draft?: Json | null
          edited?: Json | null
          file_name?: string | null
          id?: string
          language?: string
          processing_mode?: string | null
          source_type: string
          status?: string
          text: string
          updated_at?: string
        }
        Update: {
          approved_record_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          draft?: Json | null
          edited?: Json | null
          file_name?: string | null
          id?: string
          language?: string
          processing_mode?: string | null
          source_type?: string
          status?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_reviews: {
        Row: {
          business_id: string
          created_at: string
          group_key: string
          id: string
          merged_customer_ids: string[] | null
          primary_customer_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          snapshot: Json | null
          status: string
          undo_expires_at: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          group_key: string
          id?: string
          merged_customer_ids?: string[] | null
          primary_customer_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot?: Json | null
          status?: string
          undo_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          group_key?: string
          id?: string
          merged_customer_ids?: string[] | null
          primary_customer_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot?: Json | null
          status?: string
          undo_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_reviews_primary_customer_id_fkey"
            columns: ["primary_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          approved_record_id: string | null
          business_id: string
          created_at: string
          extraction_id: string | null
          id: string
          inventory_event_id: string | null
          kind: string
          order_id: string | null
          payment_id: string | null
          source_input_id: string | null
        }
        Insert: {
          approved_record_id?: string | null
          business_id: string
          created_at?: string
          extraction_id?: string | null
          id?: string
          inventory_event_id?: string | null
          kind: string
          order_id?: string | null
          payment_id?: string | null
          source_input_id?: string | null
        }
        Update: {
          approved_record_id?: string | null
          business_id?: string
          created_at?: string
          extraction_id?: string | null
          id?: string
          inventory_event_id?: string | null
          kind?: string
          order_id?: string | null
          payment_id?: string | null
          source_input_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_approved_record_id_fkey"
            columns: ["approved_record_id"]
            isOneToOne: false
            referencedRelation: "approved_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "ai_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_inventory_event_id_fkey"
            columns: ["inventory_event_id"]
            isOneToOne: false
            referencedRelation: "inventory_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_source_input_id_fkey"
            columns: ["source_input_id"]
            isOneToOne: false
            referencedRelation: "source_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          created_by_label: string | null
          event_type: string
          id: string
          note: string | null
          product_id: string | null
          product_name: string
          quantity_delta: number
          source_id: string | null
          source_type: string
          unit_cost: number | null
          variant: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          created_by_label?: string | null
          event_type: string
          id?: string
          note?: string | null
          product_id?: string | null
          product_name: string
          quantity_delta: number
          source_id?: string | null
          source_type: string
          unit_cost?: number | null
          variant?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          created_by_label?: string | null
          event_type?: string
          id?: string
          note?: string | null
          product_id?: string | null
          product_name?: string
          quantity_delta?: number
          source_id?: string | null
          source_type?: string
          unit_cost?: number | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string
          category: string
          created_at: string
          dedupe_key: string | null
          id: string
          metadata: Json
          read_at: string | null
          related_id: string | null
          related_type: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          business_id: string
          category: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          business_id?: string
          category?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          business_id: string
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          variant: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price?: number
          variant?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_overrides: {
        Row: {
          business_id: string
          cancelled_at: string | null
          id: string
          order_reference: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          id?: string
          order_reference: string
          status: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          id?: string
          order_reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          approved_record_id: string | null
          balance: number
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_mode: string | null
          id: string
          notes: string | null
          payment_status: string
          reference: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          approved_record_id?: string | null
          balance?: number
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_mode?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          reference: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          approved_record_id?: string | null
          balance?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_mode?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          reference?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_record_id_fkey"
            columns: ["approved_record_id"]
            isOneToOne: false
            referencedRelation: "approved_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          date: string
          id: string
          method: string
          notes: string | null
          order_id: string | null
          order_reference: string
          recorded_by: string | null
          recorded_by_label: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          date?: string
          id?: string
          method: string
          notes?: string | null
          order_id?: string | null
          order_reference: string
          recorded_by?: string | null
          recorded_by_label?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string | null
          order_id?: string | null
          order_reference?: string
          recorded_by?: string | null
          recorded_by_label?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          available_stock: number
          business_id: string
          cost_price: number | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          quality_tier: string | null
          reorder_level: number | null
          reserved_stock: number
          selling_price: number | null
          sku: string | null
          unit_price: number | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          attributes?: Json
          available_stock?: number
          business_id: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          quality_tier?: string | null
          reorder_level?: number | null
          reserved_stock?: number
          selling_price?: number | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          attributes?: Json
          available_stock?: number
          business_id?: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          quality_tier?: string | null
          reorder_level?: number | null
          reserved_stock?: number
          selling_price?: number | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_response_language: string | null
          audio_enabled: boolean
          audio_playback_speed: number
          business_category: string | null
          business_setup_completed: boolean
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          preferred_language: string | null
          preferred_voice: string | null
          updated_at: string
        }
        Insert: {
          ai_response_language?: string | null
          audio_enabled?: boolean
          audio_playback_speed?: number
          business_category?: string | null
          business_setup_completed?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_language?: string | null
          preferred_voice?: string | null
          updated_at?: string
        }
        Update: {
          ai_response_language?: string | null
          audio_enabled?: boolean
          audio_playback_speed?: number
          business_category?: string | null
          business_setup_completed?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_language?: string | null
          preferred_voice?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_conversions: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          details: Json
          id: string
          scan_id: string
          target_id: string
          target_reference: string | null
          target_type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          details?: Json
          id?: string
          scan_id: string
          target_id: string
          target_reference?: string | null
          target_type: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          details?: Json
          id?: string
          scan_id?: string
          target_id?: string
          target_reference?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_conversions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_conversions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          document_type: string | null
          edited: Json | null
          extraction: Json | null
          id: string
          language: string | null
          pages: Json
          review_notes: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          edited?: Json | null
          extraction?: Json | null
          id?: string
          language?: string | null
          pages?: Json
          review_notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          edited?: Json | null
          extraction?: Json | null
          id?: string
          language?: string | null
          pages?: Json
          review_notes?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit: {
        Row: {
          actor_id: string
          business_id: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          section: string
          setting_key: string
        }
        Insert: {
          actor_id: string
          business_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          section: string
          setting_key: string
        }
        Update: {
          actor_id?: string
          business_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          section?: string
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_audit_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      source_inputs: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error: string | null
          file_mime: string | null
          file_path: string | null
          id: string
          language: string
          meta: Json
          raw_text: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error?: string | null
          file_mime?: string | null
          file_path?: string | null
          id?: string
          language?: string
          meta?: Json
          raw_text?: string | null
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error?: string | null
          file_mime?: string | null
          file_path?: string | null
          id?: string
          language?: string
          meta?: Json
          raw_text?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      yarngpt_voice_status: {
        Row: {
          enabled: boolean
          id: string
          language_code: string
          notes: string | null
          tested: boolean
          updated_at: string
          updated_by: string | null
          voice_name: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          language_code: string
          notes?: string | null
          tested?: boolean
          updated_at?: string
          updated_by?: string | null
          voice_name: string
        }
        Update: {
          enabled?: boolean
          id?: string
          language_code?: string
          notes?: string | null
          tested?: boolean
          updated_at?: string
          updated_by?: string | null
          voice_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve_records: { Args: { _business_id: string }; Returns: boolean }
      can_write_business: { Args: { _business_id: string }; Returns: boolean }
      can_write_inventory: { Args: { _business_id: string }; Returns: boolean }
      can_write_sales: { Args: { _business_id: string }; Returns: boolean }
      has_business_role: {
        Args: { _business_id: string; _roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      is_business_owner: { Args: { _business_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      business_member_role:
        | "owner"
        | "admin"
        | "member"
        | "manager"
        | "sales_attendant"
        | "inventory_staff"
        | "read_only"
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
      app_role: ["admin", "user"],
      business_member_role: [
        "owner",
        "admin",
        "member",
        "manager",
        "sales_attendant",
        "inventory_staff",
        "read_only",
      ],
    },
  },
} as const
