-- =============================================================================
-- Migration 007 — Tabela plans + campos de billing em tenants
-- Pré-Etapa 7
-- Executar no SQL Editor do Supabase (service role)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  max_messages_month  INTEGER,
  max_patients        INTEGER,
  features            JSONB NOT NULL DEFAULT '{}',
  trial_days          INTEGER NOT NULL DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CAMPOS DE BILLING em tenants
-- -----------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_status  TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT chk_tenants_billing_status
    CHECK (billing_status IN ('active', 'trial', 'suspended', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_tenants_plan_id
  ON tenants (plan_id)
  WHERE plan_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS para plans (super_admin gerencia; qualquer autenticado lê ativos)
-- -----------------------------------------------------------------------------
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans: super_admin gerencia tudo"
  ON plans FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "plans: autenticados leem planos ativos"
  ON plans FOR SELECT
  USING (active = true);

-- -----------------------------------------------------------------------------
-- SEED: Plano Padrão
-- -----------------------------------------------------------------------------
INSERT INTO plans (id, name, max_messages_month, max_patients, features, trial_days, active)
VALUES (
  'p1an0000-0000-0000-0000-000000000001',
  'Padrão',
  1000,
  500,
  '{"whatsapp": true, "ai_followup": true, "campaigns": false, "multi_user": false}',
  14,
  true
)
ON CONFLICT (id) DO NOTHING;
