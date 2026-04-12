-- =============================================================================
-- CRM Fidelização Clínicas — Schema Supabase
-- Versão: 1.1 — Etapa 2 (rev: review auto-fix)
-- =============================================================================
-- IMPORTANTE: executar como postgres (service role) no SQL Editor do Supabase.
-- Ordem de criação respeita dependências de FK.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- SET search_path = public, pg_temp em todas as SECURITY DEFINER
-- para prevenir search_path hijacking
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION extract_first_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.first_name = split_part(trim(NEW.name), ' ', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Helper RLS: retorna tenant_id do usuário autenticado
-- SECURITY DEFINER: executa com privilégios do owner para acessar auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Helper RLS: verifica se o usuário autenticado é super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- =============================================================================
-- Auth trigger: cria perfil em public.users quando auth.users recebe INSERT
-- Lê raw_user_meta_data para: name, role, tenant_id
-- role padrão: 'secretary' — super_admin só pode ser criado via bootstrap direto
-- Nota: SECURITY DEFINER bypassa RLS de INSERT (necessário e intencional)
-- =============================================================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_role      TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'secretary');

  -- Nunca permite criação de super_admin via trigger — apenas bootstrap direto
  IF v_role = 'super_admin' THEN
    v_role := 'secretary';
  END IF;

  -- tenant_id é opcional (super_admin não tem tenant)
  IF (NEW.raw_user_meta_data->>'tenant_id') IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  END IF;

  INSERT INTO public.users (id, email, name, role, tenant_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_role,
    v_tenant_id,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- =============================================================================
-- TABELA 0: plans
-- Define os planos de assinatura disponíveis no SaaS.
-- Gerenciado apenas pelo super_admin.
-- =============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  max_messages_month INTEGER,
  max_patients       INTEGER,
  features           JSONB NOT NULL DEFAULT '{}',
  trial_days         INTEGER NOT NULL DEFAULT 0,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- TABELA 1: tenants
-- NOTA DE PRODUÇÃO: waba_access_token deve ser criptografado via Supabase Vault
-- antes do go-live. Ver ASK item #1 no review de Etapa 2.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL,
  logo_url                    TEXT,
  description                 TEXT,
  services_description        TEXT,
  phone_contact               TEXT,
  waba_phone_number_id        TEXT,
  waba_access_token           TEXT, -- TODO(segurança): migrar para Supabase Vault antes do go-live
  followup_inactivity_enabled BOOLEAN NOT NULL DEFAULT false,
  followup_contextual_enabled BOOLEAN NOT NULL DEFAULT true,
  followup_config             JSONB   NOT NULL DEFAULT '{}',
  status                      TEXT    NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive')),
  plan_id                     UUID REFERENCES plans(id) ON DELETE SET NULL,
  plan_started_at             TIMESTAMPTZ,
  trial_ends_at               TIMESTAMPTZ,
  billing_status              TEXT NOT NULL DEFAULT 'active'
                                CONSTRAINT chk_tenants_billing_status
                                CHECK (billing_status IN ('active', 'trial', 'suspended', 'cancelled')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenants_plan_id
  ON tenants (plan_id)
  WHERE plan_id IS NOT NULL;

-- =============================================================================
-- TABELA 2: tenant_contacts
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  phone_number      TEXT,
  whatsapp_number   TEXT,
  scope_description TEXT,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenant_contacts_updated_at
  BEFORE UPDATE ON tenant_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenant_contacts_tenant_id
  ON tenant_contacts (tenant_id);

-- Garante apenas 1 contato default por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tenant_default_contact
  ON tenant_contacts (tenant_id)
  WHERE is_default = true;

-- =============================================================================
-- TABELA 3: tenant_specialties
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_specialties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('specialty', 'procedure', 'service')),
  contact_id UUID REFERENCES tenant_contacts(id) ON DELETE SET NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenant_specialties_updated_at
  BEFORE UPDATE ON tenant_specialties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenant_specialties_tenant_id
  ON tenant_specialties (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_specialties_contact_id
  ON tenant_specialties (contact_id)
  WHERE contact_id IS NOT NULL;

-- =============================================================================
-- TABELA 4: users
-- NOTA: id deve coincidir com auth.uid() do Supabase Auth.
-- Inserção em public.users deve ser feita via SECURITY DEFINER function
-- ou service_role. Clients autenticados NÃO podem inserir diretamente (ver RLS).
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'secretary')),
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_tenant_id
  ON users (tenant_id);

-- =============================================================================
-- TABELA 5: patients
-- status 'review': cadastrado via API externa — NÃO recebe mensagens.
-- status 'active': padrão manual — recebe onboarding e FUPs normalmente.
-- status 'inactive': desativado manualmente — não recebe mensagens.
-- =============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cpf                  TEXT NOT NULL,
  name                 TEXT NOT NULL,
  first_name           TEXT NOT NULL,
  birth_date           DATE,
  sex                  TEXT CHECK (sex IN ('M', 'F')),
  health_plan          TEXT,
  address              TEXT,
  phone_whatsapp       TEXT NOT NULL,
  general_info         TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('review', 'active', 'inactive')),
  recurrence_flag      BOOLEAN NOT NULL DEFAULT false,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  opt_out              BOOLEAN NOT NULL DEFAULT false,
  interaction_summary  TEXT,
  last_interaction_at  TIMESTAMPTZ,
  opportunity_flag     BOOLEAN NOT NULL DEFAULT false,
  opportunity_detail   TEXT,
  patient_facts        JSONB   NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cpf)
);

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_patients_first_name
  BEFORE INSERT OR UPDATE OF name ON patients
  FOR EACH ROW EXECUTE FUNCTION extract_first_name();

-- Índice principal para RLS + filtros de status
CREATE INDEX IF NOT EXISTS idx_patients_tenant_status
  ON patients (tenant_id, status);

-- Índice parcial para contador de oportunidades ativas no dashboard
CREATE INDEX IF NOT EXISTS idx_patients_opportunity
  ON patients (tenant_id)
  WHERE opportunity_flag = true;

-- Índice UNIQUE para roteamento de webhook inbound + prevenção de duplicatas concorrentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_tenant_phone
  ON patients (tenant_id, phone_whatsapp);

-- =============================================================================
-- TABELA 6: patient_documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  file_type      TEXT,
  extracted_data JSONB,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_documents_updated_at
  BEFORE UPDATE ON patient_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id
  ON patient_documents (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_documents_tenant_id
  ON patient_documents (tenant_id);

-- =============================================================================
-- TABELA 7: followup_scenarios
-- tenant_id NULL = cenário global padrão (super_admin)
-- =============================================================================
CREATE TABLE IF NOT EXISTS followup_scenarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  trigger_type     TEXT NOT NULL
                     CHECK (trigger_type IN ('medication', 'exam', 'return', 'custom')),
  interval_days    INTEGER NOT NULL,
  repeat_every_days INTEGER,
  max_repeats      INTEGER NOT NULL DEFAULT 1,
  message_template TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_followup_scenarios_updated_at
  BEFORE UPDATE ON followup_scenarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_followup_scenarios_tenant_id
  ON followup_scenarios (tenant_id);

-- =============================================================================
-- TABELA 8: whatsapp_templates
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  variables     JSONB NOT NULL DEFAULT '[]',
  category      TEXT NOT NULL DEFAULT 'utility'
                  CHECK (category IN ('utility', 'marketing')),
  meta_status   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (meta_status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA 9: patient_followup_agenda
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_followup_agenda (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source         TEXT NOT NULL CHECK (source IN ('inactivity', 'contextual')),
  scenario_id    UUID REFERENCES followup_scenarios(id) ON DELETE SET NULL,
  trigger_type   TEXT CHECK (trigger_type IN ('medication', 'exam', 'return', 'custom')),
  trigger_detail JSONB,
  scheduled_date TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'sent', 'cancelled', 'responded')),
  template_id    UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_followup_agenda_updated_at
  BEFORE UPDATE ON patient_followup_agenda
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_followup_agenda_pending
  ON patient_followup_agenda (tenant_id, scheduled_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_followup_agenda_patient_id
  ON patient_followup_agenda (patient_id);

CREATE INDEX IF NOT EXISTS idx_followup_agenda_scenario_id
  ON patient_followup_agenda (scenario_id)
  WHERE scenario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_followup_agenda_template_id
  ON patient_followup_agenda (template_id)
  WHERE template_id IS NOT NULL;

-- =============================================================================
-- TABELA 10: conversations
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id               UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_conversation_id TEXT,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'closed', 'escalated')),
  escalation_reason        TEXT,
  escalated_to             TEXT,
  last_message_at          TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status
  ON conversations (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_conversations_patient_id
  ON conversations (patient_id);

-- =============================================================================
-- TABELA 11: messages
-- updated_at rastreia mudanças de wa_status (sent→delivered→read→failed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content             TEXT,
  template_id         UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_type        TEXT NOT NULL DEFAULT 'text'
                        CHECK (message_type IN ('text', 'template', 'media', 'audio')),
  media_url           TEXT,
  audio_transcription TEXT,
  wa_message_id       TEXT,
  wa_status           TEXT CHECK (wa_status IN ('sent', 'delivered', 'read', 'failed')),
  ai_intent_detected  JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_messages_tenant_created
  ON messages (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_patient_id
  ON messages (patient_id);

CREATE INDEX IF NOT EXISTS idx_messages_template_id
  ON messages (template_id)
  WHERE template_id IS NOT NULL;

-- =============================================================================
-- TABELA 12: escalation_keywords
-- tenant_id NULL = padrão global; clínica pode customizar com tenant_id preenchido
-- =============================================================================
CREATE TABLE IF NOT EXISTS escalation_keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  category   TEXT NOT NULL
               CHECK (category IN ('emergency', 'clinical', 'commercial', 'optout', 'operational')),
  mode       TEXT NOT NULL DEFAULT 'immediate'
               CHECK (mode IN ('immediate', 'conversational')),
  priority   INTEGER NOT NULL DEFAULT 3
               CHECK (priority BETWEEN 1 AND 5),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_escalation_keywords_updated_at
  BEFORE UPDATE ON escalation_keywords
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_escalation_keywords_tenant_id
  ON escalation_keywords (tenant_id);

-- =============================================================================
-- TABELA 13: campaigns
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  message_template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  target_filter       JSONB,
  scheduled_at        TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaigns_message_template_id
  ON campaigns (message_template_id)
  WHERE message_template_id IS NOT NULL;

-- =============================================================================
-- TABELA 14: usage_tracking
-- month_year formato YYYY-MM validado por CHECK constraint
-- =============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month_year              TEXT NOT NULL
                            CONSTRAINT chk_usage_month_year
                            CHECK (month_year ~ '^[0-9]{4}-(?:0[1-9]|1[0-2])$'),
  messages_sent           INTEGER NOT NULL DEFAULT 0,
  messages_received       INTEGER NOT NULL DEFAULT 0,
  ai_tokens_input         INTEGER NOT NULL DEFAULT 0,
  ai_tokens_output        INTEGER NOT NULL DEFAULT 0,
  audio_minutes_processed NUMERIC(10,2) NOT NULL DEFAULT 0,
  documents_processed     INTEGER NOT NULL DEFAULT 0,
  campaigns_sent          INTEGER NOT NULL DEFAULT 0,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month_year)
);

CREATE TRIGGER trg_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA 15: audit_logs
-- NOTA: inserções devem ser feitas exclusivamente via service_role ou
-- via função SECURITY DEFINER dedicada — clients autenticados não inserem.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  details    JSONB,
  actor      TEXT NOT NULL CHECK (actor IN ('ai', 'secretary', 'system', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id
  ON audit_logs (patient_id)
  WHERE patient_id IS NOT NULL;

-- =============================================================================
-- TABELA 16: tenant_api_keys
-- Chaves de API por tenant para integrações externas (Doctoralia, iClinic, etc.)
-- key_hash: HMAC-SHA256 da chave com secret do Vault (ver TODO abaixo)
-- TODO(segurança): substituir por encode(hmac(key, vault_secret, 'sha256'), 'hex')
-- para que o hash não seja reversível mesmo com acesso total ao DB.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenant_api_keys_updated_at
  BEFORE UPDATE ON tenant_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id
  ON tenant_api_keys (tenant_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Política base: usuário só vê dados do próprio tenant
-- super_admin enxerga tudo
-- Backend usa service_role (bypass automático do RLS)
-- =============================================================================

ALTER TABLE plans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_specialties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_scenarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_followup_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_keywords     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns               ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_keys         ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- plans
-- ----------------------------------------------------------------------------
CREATE POLICY "plans: super_admin gerencia tudo"
  ON plans FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "plans: autenticados leem planos ativos"
  ON plans FOR SELECT
  USING (active = true);

-- ----------------------------------------------------------------------------
-- tenants
-- ----------------------------------------------------------------------------
CREATE POLICY "tenants: super_admin gerencia tudo"
  ON tenants FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tenants: usuário vê próprio tenant"
  ON tenants FOR SELECT
  USING (id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- tenant_contacts
-- ----------------------------------------------------------------------------
CREATE POLICY "tenant_contacts: super_admin gerencia tudo"
  ON tenant_contacts FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tenant_contacts: admin lê e gerencia próprio tenant"
  ON tenant_contacts FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- tenant_specialties
-- ----------------------------------------------------------------------------
CREATE POLICY "tenant_specialties: super_admin gerencia tudo"
  ON tenant_specialties FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tenant_specialties: admin gerencia próprio tenant"
  ON tenant_specialties FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- users
-- Inserção em public.users deve ser feita exclusivamente via service_role
-- (onboarding function ou auth trigger). Clients autenticados não podem inserir.
-- create_user_profile() implementado acima (linha ~40).
-- ----------------------------------------------------------------------------
CREATE POLICY "users: super_admin gerencia tudo"
  ON users FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "users: usuário vê próprio registro"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: admin vê usuários do próprio tenant"
  ON users FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "users: usuário atualiza próprio registro (nome/status)"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Bloqueia INSERT de clients autenticados — apenas service_role insere
CREATE POLICY "users: INSERT apenas via service_role"
  ON users FOR INSERT
  WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- patients
-- ----------------------------------------------------------------------------
CREATE POLICY "patients: super_admin gerencia tudo"
  ON patients FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "patients: usuário gerencia pacientes do próprio tenant"
  ON patients FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- patient_documents
-- ----------------------------------------------------------------------------
CREATE POLICY "patient_documents: super_admin gerencia tudo"
  ON patient_documents FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "patient_documents: usuário gerencia do próprio tenant"
  ON patient_documents FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- followup_scenarios (globais visíveis para todos)
-- ----------------------------------------------------------------------------
CREATE POLICY "followup_scenarios: super_admin gerencia tudo"
  ON followup_scenarios FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "followup_scenarios: usuário vê globais e do próprio tenant"
  ON followup_scenarios FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id());

CREATE POLICY "followup_scenarios: admin gerencia do próprio tenant"
  ON followup_scenarios FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- whatsapp_templates
-- ----------------------------------------------------------------------------
CREATE POLICY "whatsapp_templates: super_admin gerencia tudo"
  ON whatsapp_templates FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "whatsapp_templates: admin gerencia do próprio tenant"
  ON whatsapp_templates FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- patient_followup_agenda
-- ----------------------------------------------------------------------------
CREATE POLICY "followup_agenda: super_admin gerencia tudo"
  ON patient_followup_agenda FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "followup_agenda: admin gerencia do próprio tenant"
  ON patient_followup_agenda FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- conversations
-- ----------------------------------------------------------------------------
CREATE POLICY "conversations: super_admin gerencia tudo"
  ON conversations FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "conversations: admin gerencia do próprio tenant"
  ON conversations FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
CREATE POLICY "messages: super_admin gerencia tudo"
  ON messages FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "messages: admin gerencia do próprio tenant"
  ON messages FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- escalation_keywords (globais visíveis para todos)
-- ----------------------------------------------------------------------------
CREATE POLICY "escalation_keywords: super_admin gerencia tudo"
  ON escalation_keywords FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "escalation_keywords: usuário vê globais e do próprio tenant"
  ON escalation_keywords FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = get_current_user_tenant_id());

CREATE POLICY "escalation_keywords: admin gerencia do próprio tenant"
  ON escalation_keywords FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- campaigns
-- ----------------------------------------------------------------------------
CREATE POLICY "campaigns: super_admin gerencia tudo"
  ON campaigns FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "campaigns: admin gerencia do próprio tenant"
  ON campaigns FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- ----------------------------------------------------------------------------
-- usage_tracking
-- Escrita exclusiva via service_role (backend). Clients autenticados só leem.
-- ----------------------------------------------------------------------------
CREATE POLICY "usage_tracking: super_admin gerencia tudo"
  ON usage_tracking FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "usage_tracking: admin vê do próprio tenant"
  ON usage_tracking FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- Bloqueia INSERT/UPDATE de clients autenticados — apenas service_role escreve
CREATE POLICY "usage_tracking: escrita apenas via service_role"
  ON usage_tracking FOR INSERT
  WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- audit_logs
-- Escrita exclusiva via service_role. Integridade obrigatória (LGPD).
-- ----------------------------------------------------------------------------
CREATE POLICY "audit_logs: super_admin gerencia tudo"
  ON audit_logs FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "audit_logs: admin vê do próprio tenant"
  ON audit_logs FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- Bloqueia INSERT de clients autenticados — apenas service_role insere
CREATE POLICY "audit_logs: INSERT apenas via service_role"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- tenant_api_keys
-- ----------------------------------------------------------------------------
CREATE POLICY "tenant_api_keys: super_admin gerencia tudo"
  ON tenant_api_keys FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tenant_api_keys: admin gerencia do próprio tenant"
  ON tenant_api_keys FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());
