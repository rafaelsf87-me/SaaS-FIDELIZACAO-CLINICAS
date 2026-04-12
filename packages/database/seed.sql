-- =============================================================================
-- CRM Fidelização Clínicas — Seed Data
-- Versão: 1.0 — Etapa 2
-- =============================================================================
-- ATENÇÃO: executar APÓS o schema.sql.
-- Usar service_role no Supabase (bypass de RLS).
-- UUIDs fixos para reprodutibilidade.
-- =============================================================================

-- ATENÇÃO: session_replication_role = replica desabilita FK checks e triggers.
-- Usar APENAS em ambiente de desenvolvimento/staging com service_role.
-- Em produção, execute cada INSERT em ordem (respeitar dependências FK) e sem este SET.
-- SET session_replication_role = replica; -- descomentado apenas para carga inicial local

-- =============================================================================
-- TENANT de teste
-- =============================================================================
INSERT INTO tenants (
  id, name, description, services_description, phone_contact,
  followup_inactivity_enabled, followup_contextual_enabled,
  followup_config, status
) VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Clínica Exemplo Ortopedia',
  'Clínica especializada em ortopedia e fisioterapia com atendimento humanizado.',
  'Ortopedia, Fisioterapia, Acupuntura, Reabilitação pós-cirúrgica.',
  '(11) 3000-0001',
  true,
  true,
  '{"inactivity_days": [7, 15, 30], "contextual_window_hours": 72}',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CONTATO PADRÃO do tenant de teste
-- =============================================================================
INSERT INTO tenant_contacts (
  id, tenant_id, label, phone_number, whatsapp_number,
  scope_description, is_default, active
) VALUES (
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Secretária Principal',
  '(11) 3000-0001',
  '5511300000001',
  'Responsável por agendamentos gerais e dúvidas administrativas.',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ESPECIALIDADES do tenant de teste
-- =============================================================================
INSERT INTO tenant_specialties (id, tenant_id, name, type, contact_id, active) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Ortopedia', 'specialty', '22222222-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Fisioterapia', 'specialty', '22222222-0000-0000-0000-000000000001', true),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Acupuntura', 'procedure', null, true),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Reabilitação pós-cirúrgica', 'service', '22222222-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- USUÁRIOS
-- Nota: os ids abaixo precisam ser criados primeiro no Supabase Auth
-- antes de inserir aqui — ou usar a trigger on auth.users (ver README).
-- Para testes locais, inserir diretamente (bypassa auth).
-- =============================================================================
INSERT INTO users (id, tenant_id, email, name, role, status) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    NULL,
    'admin@sistema.com',
    'Super Admin',
    'super_admin',
    'active'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001',
    'secretaria@clinicaexemplo.com',
    'Ana Secretária',
    'admin',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PACIENTES de teste (status 'active' — cadastro manual)
-- =============================================================================
INSERT INTO patients (
  id, tenant_id, cpf, name, first_name, birth_date, sex,
  health_plan, phone_whatsapp, general_info, status,
  recurrence_flag, enabled, opt_out
) VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    '111.222.333-01',
    'João Silva Pereira',
    'João',
    '1975-03-15',
    'M',
    'Unimed',
    '5511991110001',
    'Paciente com histórico de lombalgia crônica. Cirurgia em 2024.',
    'active',
    false, true, false
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001',
    '222.333.444-02',
    'Maria Oliveira Santos',
    'Maria',
    '1988-07-22',
    'F',
    'Bradesco Saúde',
    '5511992220002',
    'Pós-operatório joelho. Fisioterapia 3x/semana.',
    'active',
    true, true, false
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001',
    '333.444.555-03',
    'Carlos Eduardo Mendes',
    'Carlos',
    '1960-11-05',
    'M',
    NULL,
    '5511993330003',
    'Paciente particular. Artrose leve no quadril.',
    'review',  -- cadastrado via API externa, aguardando aprovação
    false, true, false
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- KEYWORDS PADRÃO (tenant_id NULL = globais, is_default = true)
-- Baseadas na Seção 8 da SPEC_PROJETO_FIDELIZACAO_v2.md
-- =============================================================================

-- CATEGORIA 1: EMERGÊNCIA (priority 1, mode immediate)
INSERT INTO escalation_keywords (tenant_id, keyword, category, mode, priority, is_default, active) VALUES
  -- Cardíaco
  (NULL, 'dor no peito', 'emergency', 'immediate', 1, true, true),
  (NULL, 'aperto no peito', 'emergency', 'immediate', 1, true, true),
  (NULL, 'infarto', 'emergency', 'immediate', 1, true, true),
  (NULL, 'coração acelerado', 'emergency', 'immediate', 1, true, true),
  (NULL, 'palpitação forte', 'emergency', 'immediate', 1, true, true),
  -- Respiratório
  (NULL, 'falta de ar', 'emergency', 'immediate', 1, true, true),
  (NULL, 'não consigo respirar', 'emergency', 'immediate', 1, true, true),
  (NULL, 'sufocando', 'emergency', 'immediate', 1, true, true),
  (NULL, 'chiado forte', 'emergency', 'immediate', 1, true, true),
  -- Neurológico
  (NULL, 'desmaio', 'emergency', 'immediate', 1, true, true),
  (NULL, 'desmaiei', 'emergency', 'immediate', 1, true, true),
  (NULL, 'convulsão', 'emergency', 'immediate', 1, true, true),
  (NULL, 'confusão mental', 'emergency', 'immediate', 1, true, true),
  (NULL, 'perdi a consciência', 'emergency', 'immediate', 1, true, true),
  (NULL, 'não enxergo', 'emergency', 'immediate', 1, true, true),
  (NULL, 'dormência súbita', 'emergency', 'immediate', 1, true, true),
  -- Sangramento
  (NULL, 'sangramento intenso', 'emergency', 'immediate', 1, true, true),
  (NULL, 'muito sangue', 'emergency', 'immediate', 1, true, true),
  (NULL, 'hemorragia', 'emergency', 'immediate', 1, true, true),
  (NULL, 'não para de sangrar', 'emergency', 'immediate', 1, true, true),
  -- Reação medicamentosa
  (NULL, 'inchaço na boca', 'emergency', 'immediate', 1, true, true),
  (NULL, 'alergia grave', 'emergency', 'immediate', 1, true, true),
  (NULL, 'anafilaxia', 'emergency', 'immediate', 1, true, true),
  (NULL, 'não consigo engolir após remédio', 'emergency', 'immediate', 1, true, true),
  (NULL, 'corpo todo inchado', 'emergency', 'immediate', 1, true, true),
  -- Psíquico
  (NULL, 'quero morrer', 'emergency', 'immediate', 1, true, true),
  (NULL, 'não aguento mais viver', 'emergency', 'immediate', 1, true, true),
  (NULL, 'suicídio', 'emergency', 'immediate', 1, true, true),
  (NULL, 'me machucar', 'emergency', 'immediate', 1, true, true),
  (NULL, 'acabar com tudo', 'emergency', 'immediate', 1, true, true),
  -- Gestante
  (NULL, 'perdi líquido', 'emergency', 'immediate', 1, true, true),
  (NULL, 'sangramento grávida', 'emergency', 'immediate', 1, true, true),
  (NULL, 'contrações fortes', 'emergency', 'immediate', 1, true, true),
  (NULL, 'bebê parou de mexer', 'emergency', 'immediate', 1, true, true),
  -- Criança
  (NULL, 'febre alta criança', 'emergency', 'immediate', 1, true, true),
  (NULL, 'criança sem responder', 'emergency', 'immediate', 1, true, true),
  (NULL, 'criança convulsionando', 'emergency', 'immediate', 1, true, true),
  -- Geral
  (NULL, 'piorando rápido', 'emergency', 'immediate', 1, true, true),
  (NULL, 'piorou muito', 'emergency', 'immediate', 1, true, true),
  (NULL, 'está muito pior', 'emergency', 'immediate', 1, true, true),
  (NULL, 'piora súbita', 'emergency', 'immediate', 1, true, true);

-- CATEGORIA 2: CLÍNICO PROIBIDO (priority 2, mode conversational → immediate após insistência)
INSERT INTO escalation_keywords (tenant_id, keyword, category, mode, priority, is_default, active) VALUES
  -- Diagnóstico
  (NULL, 'o que eu tenho', 'clinical', 'conversational', 2, true, true),
  (NULL, 'qual minha doença', 'clinical', 'conversational', 2, true, true),
  (NULL, 'isso é grave', 'clinical', 'conversational', 2, true, true),
  (NULL, 'é normal sentir', 'clinical', 'conversational', 2, true, true),
  (NULL, 'pode ser câncer', 'clinical', 'conversational', 2, true, true),
  (NULL, 'será que é', 'clinical', 'conversational', 2, true, true),
  -- Prescrição
  (NULL, 'posso tomar', 'clinical', 'conversational', 2, true, true),
  (NULL, 'que remédio', 'clinical', 'conversational', 2, true, true),
  (NULL, 'qual medicamento', 'clinical', 'conversational', 2, true, true),
  (NULL, 'me receita', 'clinical', 'conversational', 2, true, true),
  (NULL, 'aumentar dose', 'clinical', 'conversational', 2, true, true),
  (NULL, 'diminuir dose', 'clinical', 'conversational', 2, true, true),
  (NULL, 'trocar remédio', 'clinical', 'conversational', 2, true, true),
  (NULL, 'parar de tomar', 'clinical', 'conversational', 2, true, true),
  -- Exame como conduta
  (NULL, 'preciso fazer exame', 'clinical', 'conversational', 2, true, true),
  (NULL, 'qual exame devo', 'clinical', 'conversational', 2, true, true),
  (NULL, 'preciso de ressonância', 'clinical', 'conversational', 2, true, true),
  (NULL, 'me pede um exame', 'clinical', 'conversational', 2, true, true),
  -- Interpretação exame
  (NULL, 'meu exame deu', 'clinical', 'conversational', 2, true, true),
  (NULL, 'resultado do exame', 'clinical', 'conversational', 2, true, true),
  (NULL, 'está normal meu exame', 'clinical', 'conversational', 2, true, true),
  (NULL, 'o que significa esse resultado', 'clinical', 'conversational', 2, true, true),
  -- Prognóstico
  (NULL, 'vai melhorar', 'clinical', 'conversational', 2, true, true),
  (NULL, 'quanto tempo pra curar', 'clinical', 'conversational', 2, true, true),
  (NULL, 'vou ficar bom', 'clinical', 'conversational', 2, true, true),
  (NULL, 'tem cura', 'clinical', 'conversational', 2, true, true),
  (NULL, 'vai piorar', 'clinical', 'conversational', 2, true, true),
  -- Tratamento
  (NULL, 'qual tratamento', 'clinical', 'conversational', 2, true, true),
  (NULL, 'como tratar', 'clinical', 'conversational', 2, true, true),
  (NULL, 'melhor tratamento', 'clinical', 'conversational', 2, true, true),
  (NULL, 'tratamento alternativo', 'clinical', 'conversational', 2, true, true),
  -- Insistência
  (NULL, 'mas me diz só isso', 'clinical', 'immediate', 2, true, true),
  (NULL, 'só uma dica', 'clinical', 'immediate', 2, true, true),
  (NULL, 'ninguém vai saber', 'clinical', 'immediate', 2, true, true),
  (NULL, 'me ajuda com esse remédio', 'clinical', 'immediate', 2, true, true);

-- CATEGORIA 3: COMERCIAL (priority 3, mode conversational)
INSERT INTO escalation_keywords (tenant_id, keyword, category, mode, priority, is_default, active) VALUES
  -- Nova consulta
  (NULL, 'quero marcar', 'commercial', 'conversational', 3, true, true),
  (NULL, 'agendar consulta', 'commercial', 'conversational', 3, true, true),
  (NULL, 'retorno', 'commercial', 'conversational', 3, true, true),
  (NULL, 'remarcar', 'commercial', 'conversational', 3, true, true),
  (NULL, 'voltar ao médico', 'commercial', 'conversational', 3, true, true),
  -- Procedimento
  (NULL, 'botox', 'commercial', 'conversational', 3, true, true),
  (NULL, 'preenchimento', 'commercial', 'conversational', 3, true, true),
  (NULL, 'cirurgia', 'commercial', 'conversational', 3, true, true),
  (NULL, 'procedimento', 'commercial', 'conversational', 3, true, true),
  (NULL, 'harmonização', 'commercial', 'conversational', 3, true, true),
  (NULL, 'laser', 'commercial', 'conversational', 3, true, true),
  (NULL, 'peeling', 'commercial', 'conversational', 3, true, true),
  -- Indicação
  (NULL, 'indicar amigo', 'commercial', 'conversational', 3, true, true),
  (NULL, 'indicar parente', 'commercial', 'conversational', 3, true, true),
  (NULL, 'minha amiga quer', 'commercial', 'conversational', 3, true, true),
  (NULL, 'minha mãe precisa', 'commercial', 'conversational', 3, true, true),
  -- Interesse geral
  (NULL, 'quanto custa', 'commercial', 'conversational', 3, true, true),
  (NULL, 'qual o valor', 'commercial', 'conversational', 3, true, true),
  (NULL, 'preço', 'commercial', 'conversational', 3, true, true),
  (NULL, 'formas de pagamento', 'commercial', 'conversational', 3, true, true),
  (NULL, 'parcela', 'commercial', 'conversational', 3, true, true),
  (NULL, 'convênio aceita', 'commercial', 'conversational', 3, true, true),
  -- Especialidade
  (NULL, 'outro especialista', 'commercial', 'conversational', 3, true, true),
  (NULL, 'encaminhamento', 'commercial', 'conversational', 3, true, true),
  (NULL, 'preciso de ortopedista', 'commercial', 'conversational', 3, true, true),
  (NULL, 'dermatologista', 'commercial', 'conversational', 3, true, true);

-- CATEGORIA 4: OPT-OUT (priority 1, mode immediate)
INSERT INTO escalation_keywords (tenant_id, keyword, category, mode, priority, is_default, active) VALUES
  (NULL, 'pare', 'optout', 'immediate', 1, true, true),
  (NULL, 'parar', 'optout', 'immediate', 1, true, true),
  (NULL, 'cancelar', 'optout', 'immediate', 1, true, true),
  (NULL, 'não quero mais', 'optout', 'immediate', 1, true, true),
  (NULL, 'sair', 'optout', 'immediate', 1, true, true),
  (NULL, 'remover', 'optout', 'immediate', 1, true, true),
  (NULL, 'descadastrar', 'optout', 'immediate', 1, true, true),
  (NULL, 'desinscrever', 'optout', 'immediate', 1, true, true),
  (NULL, 'para de mandar', 'optout', 'immediate', 1, true, true),
  (NULL, 'chega', 'optout', 'immediate', 1, true, true),
  (NULL, 'bloquear', 'optout', 'immediate', 1, true, true);

-- CATEGORIA 5: OPERACIONAL / JURÍDICO (priority 2, mode immediate)
INSERT INTO escalation_keywords (tenant_id, keyword, category, mode, priority, is_default, active) VALUES
  -- Reclamação grave
  (NULL, 'processo', 'operational', 'immediate', 2, true, true),
  (NULL, 'advogado', 'operational', 'immediate', 2, true, true),
  (NULL, 'procon', 'operational', 'immediate', 2, true, true),
  (NULL, 'denúncia', 'operational', 'immediate', 2, true, true),
  (NULL, 'vou processar', 'operational', 'immediate', 2, true, true),
  (NULL, 'reclamar', 'operational', 'immediate', 2, true, true),
  (NULL, 'insatisfeito', 'operational', 'immediate', 2, true, true),
  -- Prontuário/LGPD
  (NULL, 'meu prontuário', 'operational', 'immediate', 2, true, true),
  (NULL, 'cópia dos meus dados', 'operational', 'immediate', 2, true, true),
  (NULL, 'apagar meus dados', 'operational', 'immediate', 2, true, true),
  (NULL, 'lgpd', 'operational', 'immediate', 2, true, true),
  (NULL, 'meus direitos', 'operational', 'immediate', 2, true, true),
  -- Cobrança
  (NULL, 'cobrança indevida', 'operational', 'immediate', 2, true, true),
  (NULL, 'não era esse valor', 'operational', 'immediate', 2, true, true),
  (NULL, 'me cobraram errado', 'operational', 'immediate', 2, true, true),
  (NULL, 'estorno', 'operational', 'immediate', 2, true, true);

-- =============================================================================
-- CENÁRIOS DE FOLLOW-UP PADRÃO (tenant_id NULL = globais)
-- =============================================================================
INSERT INTO followup_scenarios (
  id, tenant_id, name, trigger_type, interval_days,
  repeat_every_days, max_repeats, message_template, active, is_default
) VALUES
  (
    'cccccccc-0000-0000-0000-000000000001',
    NULL,
    'Follow-up Medicamento (Padrão)',
    'medication',
    3,
    7,
    3,
    '{{first_name}}, tudo bem? Lembrete: você está tomando {{medication_name}} ({{dosage}}). Está conseguindo seguir o tratamento?',
    true,
    true
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    NULL,
    'Follow-up Exame (Padrão)',
    'exam',
    7,
    NULL,
    1,
    '{{first_name}}, como você está? Lembrando que seu exame {{exam_name}} está marcado para breve. Precisa de algum auxílio?',
    true,
    true
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    NULL,
    'Follow-up Retorno (Padrão)',
    'return',
    14,
    NULL,
    1,
    '{{first_name}}, lembrete: seu retorno está se aproximando. Deseja falar com a secretária da {{clinic_name}} para agendar?',
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Reabilita triggers
SET session_replication_role = DEFAULT;
