-- =============================================================================
-- Migration 006 — Campos de Oportunidade em patients
-- Etapa 6 — Configurações da Clínica
-- Executar no SQL Editor do Supabase (service role)
-- =============================================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS opportunity_flag   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opportunity_detail TEXT;

-- Índice parcial para o contador do dashboard (só indexa registros com flag=true)
CREATE INDEX IF NOT EXISTS idx_patients_opportunity
  ON patients (tenant_id)
  WHERE opportunity_flag = true;
