-- =============================================================================
-- Migration 009 — Índice UNIQUE em (tenant_id, phone_whatsapp)
-- Etapa 9 — AI Engine / Review
-- Executar no SQL Editor do Supabase (service role)
-- =============================================================================
-- Garante que dois workers não criam dois pacientes para o mesmo número
-- em webhooks duplicados (race condition no findOrCreatePatient).
--
-- NOTA: Se já existem pacientes duplicados no banco, executar antes:
--   DELETE FROM patients a USING patients b
--   WHERE a.id > b.id
--     AND a.tenant_id = b.tenant_id
--     AND a.phone_whatsapp = b.phone_whatsapp;
-- =============================================================================

-- Remover índice não-unique anterior
DROP INDEX IF EXISTS idx_patients_tenant_phone;

-- Recriar como UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_tenant_phone
  ON patients (tenant_id, phone_whatsapp);
