-- =============================================================================
-- Migration 008 — Memória personalizada por paciente (AI Engine)
-- Etapa 9 — AI Engine
-- Executar no SQL Editor do Supabase (service role)
-- =============================================================================

-- patient_facts: JSONB com array de strings; extraído pelo Agente 2 durante conversas.
-- Exemplos: ["tem medo de agulha", "prefere manhã", "mora longe"]
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS patient_facts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Comentário descritivo para documentação do schema
COMMENT ON COLUMN patients.patient_facts IS
  'Array de fatos relevantes sobre o paciente, extraídos pelo Agente 2 durante conversas. '
  'Ex: ["tem medo de agulha", "prefere manhã", "mora longe"]. '
  'Incluídos no contexto do LLM nas próximas interações.';
