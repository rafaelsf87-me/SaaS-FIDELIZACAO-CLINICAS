// =============================================================================
// CRM Fidelização Clínicas — Tipos TypeScript do Schema Supabase
// Gerado manualmente com base no schema.sql — Etapa 2
// Em produção: substituir por `supabase gen types typescript --project-id <id>`
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Status types
export type TenantStatus = 'active' | 'inactive'
// 'external_integration' é runtime-only — não é um role armazenado no banco (DB CHECK restringe a super_admin|admin|secretary)
export type UserRole = 'super_admin' | 'admin' | 'secretary' | 'external_integration'
export type UserStatus = 'active' | 'inactive'
export type PatientStatus = 'review' | 'active' | 'inactive'
export type PatientSex = 'M' | 'F'
export type FollowupSource = 'inactivity' | 'contextual'
export type FollowupAgendaStatus = 'pending' | 'sent' | 'cancelled' | 'responded'
export type TriggerType = 'medication' | 'exam' | 'return' | 'custom'
export type ConversationStatus = 'active' | 'closed' | 'escalated'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'template' | 'media' | 'audio'
export type WaStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type KeywordCategory = 'emergency' | 'clinical' | 'commercial' | 'optout' | 'operational'
export type KeywordMode = 'immediate' | 'conversational'
export type TemplateCategory = 'utility' | 'marketing'
export type MetaStatus = 'pending' | 'approved' | 'rejected'
export type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled'
export type AuditActor = 'ai' | 'secretary' | 'system' | 'admin'
export type SpecialtyType = 'specialty' | 'procedure' | 'service'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          description: string | null
          services_description: string | null
          phone_contact: string | null
          waba_phone_number_id: string | null
          waba_access_token: string | null
          followup_inactivity_enabled: boolean
          followup_contextual_enabled: boolean
          followup_config: Json
          status: TenantStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          description?: string | null
          services_description?: string | null
          phone_contact?: string | null
          waba_phone_number_id?: string | null
          waba_access_token?: string | null
          followup_inactivity_enabled?: boolean
          followup_contextual_enabled?: boolean
          followup_config?: Json
          status?: TenantStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          description?: string | null
          services_description?: string | null
          phone_contact?: string | null
          waba_phone_number_id?: string | null
          waba_access_token?: string | null
          followup_inactivity_enabled?: boolean
          followup_contextual_enabled?: boolean
          followup_config?: Json
          status?: TenantStatus
          updated_at?: string
        }
      }

      tenant_contacts: {
        Row: {
          id: string
          tenant_id: string
          label: string
          phone_number: string | null
          whatsapp_number: string | null
          scope_description: string | null
          is_default: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          label: string
          phone_number?: string | null
          whatsapp_number?: string | null
          scope_description?: string | null
          is_default?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          label?: string
          phone_number?: string | null
          whatsapp_number?: string | null
          scope_description?: string | null
          is_default?: boolean
          active?: boolean
          updated_at?: string
        }
      }

      tenant_specialties: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: SpecialtyType
          contact_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: SpecialtyType
          contact_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: SpecialtyType
          contact_id?: string | null
          active?: boolean
          updated_at?: string
        }
      }

      users: {
        Row: {
          id: string
          tenant_id: string | null
          email: string
          name: string
          role: UserRole
          status: UserStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          email: string
          name: string
          role: UserRole
          status?: UserStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          email?: string
          name?: string
          role?: UserRole
          status?: UserStatus
          updated_at?: string
        }
      }

      patients: {
        Row: {
          id: string
          tenant_id: string
          cpf: string
          name: string
          first_name: string
          birth_date: string | null
          sex: PatientSex | null
          health_plan: string | null
          address: string | null
          phone_whatsapp: string
          general_info: string | null
          status: PatientStatus
          recurrence_flag: boolean
          enabled: boolean
          opt_out: boolean
          interaction_summary: string | null
          last_interaction_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cpf: string
          name: string
          first_name?: string               // auto-preenchido via trigger
          birth_date?: string | null
          sex?: PatientSex | null
          health_plan?: string | null
          address?: string | null
          phone_whatsapp: string
          general_info?: string | null
          status?: PatientStatus            // default 'active' (manual) | 'review' (API externa)
          recurrence_flag?: boolean
          enabled?: boolean
          opt_out?: boolean
          interaction_summary?: string | null
          last_interaction_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cpf?: string
          name?: string
          first_name?: string
          birth_date?: string | null
          sex?: PatientSex | null
          health_plan?: string | null
          address?: string | null
          phone_whatsapp?: string
          general_info?: string | null
          status?: PatientStatus
          recurrence_flag?: boolean
          enabled?: boolean
          opt_out?: boolean
          interaction_summary?: string | null
          last_interaction_at?: string | null
          updated_at?: string
        }
      }

      patient_documents: {
        Row: {
          id: string
          patient_id: string
          tenant_id: string
          file_url: string
          file_name: string
          file_type: string | null
          extracted_data: Json | null
          is_active: boolean
          uploaded_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          tenant_id: string
          file_url: string
          file_name: string
          file_type?: string | null
          extracted_data?: Json | null
          is_active?: boolean
          uploaded_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          tenant_id?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          extracted_data?: Json | null
          is_active?: boolean
          updated_at?: string
        }
      }

      followup_scenarios: {
        Row: {
          id: string
          tenant_id: string | null
          name: string
          trigger_type: TriggerType
          interval_days: number
          repeat_every_days: number | null
          max_repeats: number
          message_template: string | null
          active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          name: string
          trigger_type: TriggerType
          interval_days: number
          repeat_every_days?: number | null
          max_repeats?: number
          message_template?: string | null
          active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          name?: string
          trigger_type?: TriggerType
          interval_days?: number
          repeat_every_days?: number | null
          max_repeats?: number
          message_template?: string | null
          active?: boolean
          is_default?: boolean
          updated_at?: string
        }
      }

      whatsapp_templates: {
        Row: {
          id: string
          tenant_id: string
          template_name: string
          template_body: string
          variables: Json
          category: TemplateCategory
          meta_status: MetaStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          template_name: string
          template_body: string
          variables?: Json
          category?: TemplateCategory
          meta_status?: MetaStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          template_name?: string
          template_body?: string
          variables?: Json
          category?: TemplateCategory
          meta_status?: MetaStatus
          updated_at?: string
        }
      }

      patient_followup_agenda: {
        Row: {
          id: string
          patient_id: string
          tenant_id: string
          source: FollowupSource
          scenario_id: string | null
          trigger_type: TriggerType | null
          trigger_detail: Json | null
          scheduled_date: string
          sent_at: string | null
          status: FollowupAgendaStatus
          template_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          tenant_id: string
          source: FollowupSource
          scenario_id?: string | null
          trigger_type?: TriggerType | null
          trigger_detail?: Json | null
          scheduled_date: string
          sent_at?: string | null
          status?: FollowupAgendaStatus
          template_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          tenant_id?: string
          source?: FollowupSource
          scenario_id?: string | null
          trigger_type?: TriggerType | null
          trigger_detail?: Json | null
          scheduled_date?: string
          sent_at?: string | null
          status?: FollowupAgendaStatus
          template_id?: string | null
          updated_at?: string
        }
      }

      conversations: {
        Row: {
          id: string
          patient_id: string
          tenant_id: string
          whatsapp_conversation_id: string | null
          status: ConversationStatus
          escalation_reason: string | null
          escalated_to: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          tenant_id: string
          whatsapp_conversation_id?: string | null
          status?: ConversationStatus
          escalation_reason?: string | null
          escalated_to?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          tenant_id?: string
          whatsapp_conversation_id?: string | null
          status?: ConversationStatus
          escalation_reason?: string | null
          escalated_to?: string | null
          last_message_at?: string | null
          updated_at?: string
        }
      }

      messages: {
        Row: {
          id: string
          conversation_id: string
          tenant_id: string
          patient_id: string
          direction: MessageDirection
          content: string | null
          template_id: string | null
          message_type: MessageType
          media_url: string | null
          audio_transcription: string | null
          wa_message_id: string | null
          wa_status: WaStatus | null
          ai_intent_detected: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          tenant_id: string
          patient_id: string
          direction: MessageDirection
          content?: string | null
          template_id?: string | null
          message_type?: MessageType
          media_url?: string | null
          audio_transcription?: string | null
          wa_message_id?: string | null
          wa_status?: WaStatus | null
          ai_intent_detected?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          tenant_id?: string
          patient_id?: string
          direction?: MessageDirection
          content?: string | null
          template_id?: string | null
          message_type?: MessageType
          media_url?: string | null
          audio_transcription?: string | null
          wa_message_id?: string | null
          wa_status?: WaStatus | null
          ai_intent_detected?: Json | null
          updated_at?: string
        }
      }

      escalation_keywords: {
        Row: {
          id: string
          tenant_id: string | null
          keyword: string
          category: KeywordCategory
          mode: KeywordMode
          priority: number
          is_default: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          keyword: string
          category: KeywordCategory
          mode?: KeywordMode
          priority?: number
          is_default?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          keyword?: string
          category?: KeywordCategory
          mode?: KeywordMode
          priority?: number
          is_default?: boolean
          active?: boolean
          updated_at?: string
        }
      }

      campaigns: {
        Row: {
          id: string
          tenant_id: string
          name: string
          message_template_id: string | null
          target_filter: Json | null
          scheduled_at: string | null
          status: CampaignStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          message_template_id?: string | null
          target_filter?: Json | null
          scheduled_at?: string | null
          status?: CampaignStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          message_template_id?: string | null
          target_filter?: Json | null
          scheduled_at?: string | null
          status?: CampaignStatus
          updated_at?: string
        }
      }

      usage_tracking: {
        Row: {
          id: string
          tenant_id: string
          month_year: string
          messages_sent: number
          messages_received: number
          ai_tokens_input: number
          ai_tokens_output: number
          audio_minutes_processed: number
          documents_processed: number
          campaigns_sent: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          month_year: string
          messages_sent?: number
          messages_received?: number
          ai_tokens_input?: number
          ai_tokens_output?: number
          audio_minutes_processed?: number
          documents_processed?: number
          campaigns_sent?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          month_year?: string
          messages_sent?: number
          messages_received?: number
          ai_tokens_input?: number
          ai_tokens_output?: number
          audio_minutes_processed?: number
          documents_processed?: number
          campaigns_sent?: number
          updated_at?: string
        }
      }

      audit_logs: {
        Row: {
          id: string
          tenant_id: string | null
          patient_id: string | null
          action: string
          details: Json | null
          actor: AuditActor
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          patient_id?: string | null
          action: string
          details?: Json | null
          actor: AuditActor
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          patient_id?: string | null
          action?: string
          details?: Json | null
          actor?: AuditActor
        }
      }

      tenant_api_keys: {
        Row: {
          id: string
          tenant_id: string
          key_hash: string
          label: string
          active: boolean
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          key_hash: string
          label: string
          active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          key_hash?: string
          label?: string
          active?: boolean
          last_used_at?: string | null
          updated_at?: string
        }
      }
    }

    Views: Record<string, never>

    Functions: {
      get_current_user_tenant_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }

    Enums: {
      tenant_status: TenantStatus
      user_role: UserRole
      patient_status: PatientStatus
      followup_source: FollowupSource
      followup_agenda_status: FollowupAgendaStatus
      trigger_type: TriggerType
      conversation_status: ConversationStatus
      message_direction: MessageDirection
      message_type: MessageType
      wa_status: WaStatus
      keyword_category: KeywordCategory
      keyword_mode: KeywordMode
      template_category: TemplateCategory
      meta_status: MetaStatus
      campaign_status: CampaignStatus
      audit_actor: AuditActor
      specialty_type: SpecialtyType
    }
  }
}

// Atalhos de tipo para uso no app
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
