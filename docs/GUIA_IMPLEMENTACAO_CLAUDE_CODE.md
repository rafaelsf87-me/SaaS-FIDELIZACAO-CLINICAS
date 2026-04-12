# GUIA DE IMPLEMENTAÇÃO — Claude Code
## Como usar este documento

Este guia é para ser usado dentro do Claude Code (Sonnet).
Fluxo de trabalho:

1. Abra o Claude Code no terminal do projeto
2. Cole a SPEC (arquivo SPEC_PROJETO_FIDELIZACAO_v2.md) como contexto
3. Siga as etapas abaixo NA ORDEM, uma por vez
4. A cada etapa: cole o bloco de instrução correspondente no Claude Code
5. Valide o resultado antes de avançar para a próxima etapa

> REGRA: nunca pule etapas. Cada módulo depende dos anteriores.

---

## ETAPA 0 — Setup do Projeto

### Prompt para o Claude Code:

```
Crie o setup inicial do projeto seguindo estas specs:

ESTRUTURA: Monorepo com a seguinte organização (baseada no Gstack):

projeto-raiz/
├── apps/
│   ├── web/                    # Frontend Next.js (painel clínica + admin)
│   └── api/                    # Backend Fastify
├── packages/
│   ├── shared/                 # Types, utils, configs compartilhados
│   ├── database/               # Schema Supabase, migrations, seed
│   └── ui/                     # Componentes UI compartilhados (shadcn/ui customizado)
├── docs/                       # Documentação (specs, API docs, guias)
├── .env.example
├── .gitignore
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo config
└── README.md

STACK:
- Package manager: pnpm
- Monorepo: Turborepo
- Frontend: Next.js 14+ App Router, TypeScript strict
- UI: Tailwind CSS + shadcn/ui
- Backend: Fastify + TypeScript
- Banco: Supabase (instalar @supabase/supabase-js)
- Filas: BullMQ + ioredis (preparar, não conectar ainda)
- Linting: ESLint + Prettier
- Node: >= 20

AÇÕES:
1. Inicializar monorepo com pnpm workspaces + Turborepo
2. Criar app web (Next.js) com App Router e TypeScript strict
3. Criar app api (Fastify) com TypeScript
4. Criar packages shared, database, ui
5. Configurar Tailwind + shadcn/ui no app web
6. Criar .env.example com variáveis necessárias (listar todas: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID, META_VERIFY_TOKEN, REDIS_URL, NODE_ENV)
7. Configurar scripts no package.json raiz: dev, build, lint
8. Criar README.md com instruções de setup

NÃO implementar nenhuma lógica de negócio ainda. Apenas o esqueleto.
```

### Validação:
- `pnpm install` roda sem erros
- `pnpm dev` sobe Next.js e Fastify
- Estrutura de pastas confere

---

## ETAPA 1 — Design System + Layout Base

### Prompt para o Claude Code:

```
Configure o Design System e o layout base do painel.

DESIGN SYSTEM (aplicar no Tailwind config e CSS variables):

Cores:
- primary: #2563EB (azul médio) - botões, links, ícones ativos
- primary-light: #60A5FA - hover, badges
- primary-lighter: #DBEAFE - backgrounds cards, menu ativo
- primary-dark: #1D4ED8 - headers, texto destaque
- background: #FFFFFF
- surface: #F8FAFC - sidebar, painéis
- border: #E2E8F0
- text-primary: #1E293B
- text-secondary: #64748B
- success: #16A34A
- warning: #F59E0B
- danger: #DC2626
- escalated: #EA580C

Tipografia: Inter (já padrão do shadcn/ui)

LAYOUT BASE — Componente AppLayout:

Criar layout padrão reutilizável com:
1. Sidebar esquerda fixa (width: 260px desktop, colapsável em mobile)
   - Logo no topo (placeholder por enquanto)
   - Menu de navegação vertical com ícones (usar lucide-react)
   - Itens do menu com subitens em accordion
   - Item ativo: background primary-lighter + borda esquerda primary
   - Footer da sidebar: nome do usuário logado + botão logout
2. Área de conteúdo à direita (flex-1, padding)
3. Top bar no conteúdo: breadcrumb + título da página

Criar 2 variantes do layout:
- AdminLayout (menu do super admin)
- ClinicLayout (menu da clínica)

Menu Super Admin:
- Dashboard (ícone: LayoutDashboard)
- Clínicas (ícone: Building2)
- Cenários FUP (ícone: CalendarClock)
- Keywords (ícone: Tag)
- Usage (ícone: BarChart3)
- Auditoria (ícone: FileSearch)
- Configurações (ícone: Settings)

Menu Clínica:
- Dashboard (ícone: LayoutDashboard)
- Pacientes (ícone: Users)
- Conversas (ícone: MessageSquare)
- Configurações (ícone: Settings)
  - Dados da Clínica
  - Especialidades/Serviços
  - Contatos
  - Follow-up
  - Keywords
- Campanhas (ícone: Megaphone) — com badge "Em breve"

COMPONENTE REUTILIZÁVEL — FieldLabel:
Criar componente <FieldLabel> que renderiza:
- Label do campo
- Ícone "ℹ️" com tooltip (hover) contendo: descrição + exemplo
- Props: label, description, example, required (boolean)
- Exemplo: <FieldLabel label="CPF" description="CPF do paciente" example="123.456.789-00" required />

COMPONENTE REUTILIZÁVEL — FieldGuide:
Criar componente <FieldGuide> para campos complexos:
- Ícone "📖" ao lado do campo
- Ao clicar: abre modal/drawer com passo-a-passo
- Props: title, steps (array de {title, description})
- Exemplo: usado no campo "WhatsApp API Token" com instruções de como obter

Criar as páginas placeholder (apenas título + "em construção"):
- /admin/dashboard
- /admin/clinics
- /admin/scenarios
- /admin/keywords
- /admin/usage
- /admin/audit
- /admin/settings
- /clinic/dashboard
- /clinic/patients
- /clinic/conversations
- /clinic/settings/clinic-data
- /clinic/settings/specialties
- /clinic/settings/contacts
- /clinic/settings/followup
- /clinic/settings/keywords
- /clinic/campaigns

Tema: azul claro/branco. Cara de software médico premium.
Desktop-first, responsivo mobile.
```

### Validação:
- Sidebar renderiza com todos os itens
- Navegação funciona entre páginas
- FieldLabel com tooltip funciona
- FieldGuide com modal funciona
- Visual azul/branco médico

---

## ETAPA 2 — Banco de Dados (Supabase)

### Prompt para o Claude Code:

```
Crie o schema do banco de dados no Supabase.

Criar arquivo packages/database/schema.sql com TODAS as tabelas abaixo.
Criar arquivo packages/database/seed.sql com dados iniciais para teste.

TABELAS (usar UUID para todos os IDs, timestamps com timezone):

1. tenants
   - id UUID PK default gen_random_uuid()
   - name TEXT NOT NULL
   - logo_url TEXT (max 200KB validado no app)
   - description TEXT
   - services_description TEXT
   - phone_contact TEXT
   - waba_phone_number_id TEXT
   - waba_access_token TEXT
   - followup_inactivity_enabled BOOLEAN DEFAULT false
   - followup_contextual_enabled BOOLEAN DEFAULT true
   - followup_config JSONB DEFAULT '{}'
   - status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
   - created_at TIMESTAMPTZ DEFAULT now()
   - updated_at TIMESTAMPTZ DEFAULT now()

2. tenant_contacts
   - id UUID PK
   - tenant_id UUID FK tenants NOT NULL
   - label TEXT NOT NULL (ex: "Secretária Ortopedia")
   - phone_number TEXT
   - whatsapp_number TEXT
   - scope_description TEXT
   - is_default BOOLEAN DEFAULT false
   - active BOOLEAN DEFAULT true
   - created_at TIMESTAMPTZ DEFAULT now()
   - UNIQUE(tenant_id, is_default) WHERE is_default = true (partial unique)

3. tenant_specialties
   - id UUID PK
   - tenant_id UUID FK tenants NOT NULL
   - name TEXT NOT NULL
   - type TEXT NOT NULL CHECK (type IN ('specialty', 'procedure', 'service'))
   - contact_id UUID FK tenant_contacts (nullable)
   - active BOOLEAN DEFAULT true
   - created_at TIMESTAMPTZ DEFAULT now()

4. users
   - id UUID PK
   - tenant_id UUID FK tenants (nullable para super_admin)
   - email TEXT UNIQUE NOT NULL
   - name TEXT NOT NULL
   - role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'secretary'))
   - status TEXT DEFAULT 'active'
   - created_at TIMESTAMPTZ DEFAULT now()
   - updated_at TIMESTAMPTZ DEFAULT now()

5. patients
   - id UUID PK
   - tenant_id UUID FK tenants NOT NULL
   - cpf TEXT NOT NULL
   - name TEXT NOT NULL
   - first_name TEXT NOT NULL
   - birth_date DATE
   - sex TEXT CHECK (sex IN ('M', 'F'))
   - health_plan TEXT
   - address TEXT
   - phone_whatsapp TEXT NOT NULL
   - general_info TEXT
   - recurrence_flag BOOLEAN DEFAULT false
   - enabled BOOLEAN DEFAULT true
   - opt_out BOOLEAN DEFAULT false
   - interaction_summary TEXT
   - last_interaction_at TIMESTAMPTZ
   - created_at TIMESTAMPTZ DEFAULT now()
   - updated_at TIMESTAMPTZ DEFAULT now()
   - UNIQUE(tenant_id, cpf)

6. patient_documents
   - id UUID PK
   - patient_id UUID FK patients NOT NULL
   - tenant_id UUID FK tenants NOT NULL
   - file_url TEXT NOT NULL
   - file_name TEXT NOT NULL
   - file_type TEXT
   - extracted_data JSONB
   - is_active BOOLEAN DEFAULT true
   - uploaded_at TIMESTAMPTZ DEFAULT now()

7. patient_followup_agenda
   - id UUID PK
   - patient_id UUID FK patients NOT NULL
   - tenant_id UUID FK tenants NOT NULL
   - source TEXT NOT NULL CHECK (source IN ('inactivity', 'contextual'))
   - scenario_id UUID FK followup_scenarios
   - trigger_type TEXT CHECK (trigger_type IN ('medication', 'exam', 'return', 'custom'))
   - trigger_detail JSONB
   - scheduled_date TIMESTAMPTZ NOT NULL
   - sent_at TIMESTAMPTZ
   - status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'responded'))
   - template_id UUID FK whatsapp_templates
   - created_at TIMESTAMPTZ DEFAULT now()

8. followup_scenarios
   - id UUID PK
   - tenant_id UUID FK tenants (NULL = padrão global)
   - name TEXT NOT NULL
   - trigger_type TEXT NOT NULL CHECK (trigger_type IN ('medication', 'exam', 'return', 'custom'))
   - interval_days INTEGER NOT NULL
   - repeat_every_days INTEGER
   - max_repeats INTEGER DEFAULT 1
   - message_template TEXT
   - active BOOLEAN DEFAULT true
   - is_default BOOLEAN DEFAULT false
   - created_at TIMESTAMPTZ DEFAULT now()
   - updated_at TIMESTAMPTZ DEFAULT now()

9. conversations
   - id UUID PK
   - patient_id UUID FK patients NOT NULL
   - tenant_id UUID FK tenants NOT NULL
   - whatsapp_conversation_id TEXT
   - status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'escalated'))
   - escalation_reason TEXT
   - escalated_to TEXT
   - last_message_at TIMESTAMPTZ
   - created_at TIMESTAMPTZ DEFAULT now()
   - updated_at TIMESTAMPTZ DEFAULT now()

10. messages
    - id UUID PK
    - conversation_id UUID FK conversations NOT NULL
    - tenant_id UUID FK tenants NOT NULL
    - patient_id UUID FK patients NOT NULL
    - direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound'))
    - content TEXT
    - template_id UUID FK whatsapp_templates
    - message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'media', 'audio'))
    - media_url TEXT
    - audio_transcription TEXT
    - wa_message_id TEXT
    - wa_status TEXT CHECK (wa_status IN ('sent', 'delivered', 'read', 'failed'))
    - ai_intent_detected JSONB
    - created_at TIMESTAMPTZ DEFAULT now()
    - INDEX on (tenant_id, created_at DESC)
    - INDEX on (conversation_id, created_at ASC)

11. escalation_keywords
    - id UUID PK
    - tenant_id UUID FK tenants (NULL = padrão global)
    - keyword TEXT NOT NULL
    - category TEXT NOT NULL CHECK (category IN ('emergency', 'clinical', 'commercial', 'optout', 'operational'))
    - mode TEXT DEFAULT 'immediate' CHECK (mode IN ('immediate', 'conversational'))
    - priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5)
    - is_default BOOLEAN DEFAULT false
    - active BOOLEAN DEFAULT true
    - created_at TIMESTAMPTZ DEFAULT now()

12. whatsapp_templates
    - id UUID PK
    - tenant_id UUID FK tenants NOT NULL
    - template_name TEXT NOT NULL
    - template_body TEXT NOT NULL
    - variables JSONB DEFAULT '[]'
    - category TEXT DEFAULT 'utility' CHECK (category IN ('utility', 'marketing'))
    - meta_status TEXT DEFAULT 'pending' CHECK (meta_status IN ('pending', 'approved', 'rejected'))
    - created_at TIMESTAMPTZ DEFAULT now()

13. campaigns (futuro, criar tabela mesmo assim)
    - id UUID PK
    - tenant_id UUID FK tenants NOT NULL
    - name TEXT NOT NULL
    - message_template_id UUID FK whatsapp_templates
    - target_filter JSONB
    - scheduled_at TIMESTAMPTZ
    - status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled'))
    - created_at TIMESTAMPTZ DEFAULT now()

14. usage_tracking
    - id UUID PK
    - tenant_id UUID FK tenants NOT NULL
    - month_year TEXT NOT NULL (formato: "2026-04")
    - messages_sent INTEGER DEFAULT 0
    - messages_received INTEGER DEFAULT 0
    - ai_tokens_input INTEGER DEFAULT 0
    - ai_tokens_output INTEGER DEFAULT 0
    - audio_minutes_processed NUMERIC(10,2) DEFAULT 0
    - documents_processed INTEGER DEFAULT 0
    - campaigns_sent INTEGER DEFAULT 0
    - updated_at TIMESTAMPTZ DEFAULT now()
    - UNIQUE(tenant_id, month_year)

15. audit_logs
    - id UUID PK
    - tenant_id UUID FK tenants
    - patient_id UUID FK patients
    - action TEXT NOT NULL
    - details JSONB
    - actor TEXT NOT NULL CHECK (actor IN ('ai', 'secretary', 'system', 'admin'))
    - created_at TIMESTAMPTZ DEFAULT now()
    - INDEX on (tenant_id, created_at DESC)

ROW LEVEL SECURITY (RLS):
- Habilitar RLS em TODAS as tabelas
- Política base: usuário só vê dados do seu tenant_id
- super_admin vê tudo
- Criar policies para SELECT, INSERT, UPDATE, DELETE

TRIGGERS:
- updated_at: trigger automático em tenants, users, patients, followup_scenarios, conversations
- patients.first_name: trigger que extrai primeiro nome do campo name ao INSERT/UPDATE

SEED DATA:
- 1 tenant de teste: "Clínica Exemplo Ortopedia"
- 1 user super_admin: admin@sistema.com
- 1 user admin da clínica: secretaria@clinicaexemplo.com
- 3 pacientes de teste com dados fictícios
- Keywords padrão (todas as da spec, is_default = true, tenant_id = NULL)
- 3 cenários de FUP padrão (medicamento, exame, retorno)

Também criar o arquivo packages/database/types.ts com tipos TypeScript gerados do schema (usar formato compatível com supabase gen types).
```

### Validação:
- SQL executa sem erros no Supabase
- RLS ativo em todas as tabelas
- Seed data inserido
- Types TypeScript gerados

---

## ETAPA 3 — Módulo Auth + Tenant

### Prompt para o Claude Code:

```
Implemente o módulo de autenticação e gestão de tenants.

BACKEND (apps/api):

Criar módulo src/modules/auth/:
- Usar Supabase Auth para autenticação (email/senha)
- Middleware de autenticação Fastify: valida JWT do Supabase, extrai user e tenant_id
- Middleware de autorização por role: super_admin, admin, secretary
- Helper: getCurrentTenant(request) retorna tenant do usuário logado

Criar módulo src/modules/tenant/:
- CRUD de tenants (apenas super_admin)
- Ao criar tenant: gera user admin com email/senha temporária
- GET /tenants (super_admin only)
- GET /tenants/:id
- POST /tenants
- PUT /tenants/:id
- GET /tenants/:id/contacts
- POST /tenants/:id/contacts
- PUT /tenants/:id/contacts/:contactId
- DELETE /tenants/:id/contacts/:contactId
- GET /tenants/:id/specialties
- POST /tenants/:id/specialties
- PUT /tenants/:id/specialties/:specId
- DELETE /tenants/:id/specialties/:specId

FRONTEND (apps/web):

Criar página de login (/login):
- Email + senha
- Botão entrar
- Visual limpo, tema médico, logo centralizada
- Após login: redireciona para /admin/dashboard (super_admin) ou /clinic/dashboard (admin/secretary)

Criar guard de rotas:
- /admin/* → requer role super_admin
- /clinic/* → requer role admin ou secretary
- Não autenticado → redireciona /login

Criar página /admin/clinics:
- Lista de clínicas cadastradas (tabela)
- Botão "Nova Clínica" → modal/drawer de criação
- Cada linha: nome, status, qtd pacientes, ação "editar"
- Página de edição da clínica: formulário com todos os campos do tenant
  - Usar FieldLabel com tooltips em todos os campos
  - Usar FieldGuide no campo waba_phone_number_id e waba_access_token com passo-a-passo:
    Steps: ["Acesse business.facebook.com", "Vá em Configurações do WhatsApp", "Copie o Phone Number ID", "Gere um Access Token permanente"]
  - Upload de logo com validação 200KB no front
  - Sub-abas: Dados, Contatos, Especialidades

NÃO implementar: lógica de IA, WhatsApp, follow-ups. Apenas auth e CRUD de tenant.
```

### Validação:
- Login funciona
- Redirecionamento por role funciona
- CRUD de clínicas funciona
- Tooltips e FieldGuide visíveis
- Upload de logo com validação

---

## ETAPA 4 — Módulo Patient

### Prompt para o Claude Code:

```
Implemente o módulo de gestão de pacientes.

BACKEND (apps/api):

Criar módulo src/modules/patient/:
- CRUD de pacientes (scoped por tenant_id do usuário logado)
- Upload de documentos para Supabase Storage (bucket: patient-documents, path: /{tenant_id}/{patient_id}/{filename})
- Validação: CPF único por tenant
- Auto-extrair first_name do name

Endpoints:
- GET /patients?search=&filter=&page=&limit=
- GET /patients/:id (inclui documents e followup_agenda)
- POST /patients (cria paciente + dispara evento patient.created)
- PUT /patients/:id
- DELETE /patients/:id (soft delete: enabled = false)
- POST /patients/:id/documents (upload, aceita PDF/imagem, max 10MB)
- PUT /patients/:id/documents/:docId (ativar/desativar: is_active)
- DELETE /patients/:id/documents/:docId
- POST /patients/:id/generate-summary (gera interaction_summary — placeholder, IA vem depois)
- GET /patients/:id/followup-agenda
- PUT /patients/:id/followup-agenda/:agendaId (editar data, cancelar)
- POST /patients/:id/followup-agenda (adicionar FUP manual)

FRONTEND (apps/web):

Página /clinic/patients:
- Tabela de pacientes com busca (nome, CPF) e filtros (flag recorrência, plano, status)
- Colunas: Nome, CPF, Plano, Último contato, Status, Ações
- Botão "Novo Paciente" → abre formulário

Formulário de paciente (modal ou página):
- Campos obrigatórios: Nome, CPF (com máscara)
- Campos opcionais: Nascimento, Sexo, Plano de Saúde, Endereço, Telefone WhatsApp (com máscara), Flag Recorrência, Informações Gerais (textarea)
- Todos os campos com FieldLabel (tooltip + exemplo)
- Upload de documentos: área drag & drop, lista de docs já enviados com toggle ativo/inativo
- Alerta ao adicionar novo doc: "Caso haja documentos anteriores com datas e procedimentos conflitantes, desative-os para não confundir a agenda de mensagens personalizada."

Página de detalhe do paciente (/clinic/patients/:id):
- Seção: Dados cadastrais (editáveis inline ou modal)
- Seção: Documentos (lista, upload, toggle ativo/inativo)
- Seção: Agenda de Follow-ups
  - Tabela: Data programada, Tipo (medicamento/exame/retorno), Detalhe, Status, Ações
  - Status com cores: pendente (amarelo), enviado (azul), respondido (verde), cancelado (cinza)
  - Ações: editar data, cancelar
  - Botão "Adicionar FUP manual"
- Seção: Resumo de Interações (texto gerado por IA)
  - Botão "Gerar resumo" (placeholder por enquanto)
  - Texto exibido em card com visual de nota
- Botão "Ver conversa" → navega para /clinic/conversations?patient={id}

Validações front:
- CPF com máscara e validação de dígitos
- WhatsApp com máscara (+55...)
- Logo/imagem max 200KB
- Documento max 10MB
```

### Validação:
- CRUD de pacientes funciona
- Upload de documentos funciona
- Detalhe com agenda de FUPs renderiza
- Busca e filtros funcionam
- Masks de CPF e telefone funcionam

---

## ETAPA 5 — Módulo Conversations (UI)

### Prompt para o Claude Code:

```
Implemente a aba de Conversas no painel da clínica.

BACKEND:

Criar módulo src/modules/conversation/:
- GET /conversations?status=&patient=&page=&limit= (ordenado por last_message_at DESC)
- GET /conversations/:id/messages?page=&limit= (ordenado por created_at ASC)
- POST /conversations/:id/takeover (secretária assume conversa: muda flag)
- PUT /conversations/:id/status (fechar, reabrir)

FRONTEND:

Página /clinic/conversations:
Layout split (2 painéis):

Painel esquerdo (lista de conversas):
- Lista de conversas ordenada por mais recente
- Cada item: nome paciente, preview última msg (truncada), timestamp, badge de status
- Status visual: ativa (normal), escalada (borda laranja), fechada (cinza)
- Filtros no topo: status, busca por nome
- Conversa selecionada tem background primary-lighter

Painel direito (detalhe da conversa):
- Header: nome paciente, status, botão "Ver paciente" (link pro detalhe), botão "Assumir conversa"
- Área de mensagens estilo WhatsApp:
  - Bolhas: outbound (IA/sistema) à direita em azul claro, inbound (paciente) à esquerda em cinza
  - Timestamp em cada bolha
  - Status de entrega: ✓ enviado, ✓✓ entregue, ✓✓ (azul) lido
  - Mensagens de áudio: ícone 🎤 + texto da transcrição em itálico
  - Indicador de escalonamento: card inline com ícone ⚠️ + motivo
  - Mensagens de template: visual diferenciado (borda sutil + label "template")
- Scroll automático para última mensagem
- Área de input no bottom (para quando secretária assumir conversa — por enquanto placeholder "IA respondendo automaticamente")

Criar componente reutilizável <ChatBubble> com props:
- direction (inbound | outbound)
- content
- timestamp
- status (sent | delivered | read)
- messageType (text | template | audio)
- audioTranscription
- escalation (boolean + reason)

Por enquanto as conversas estarão vazias (sem integração WhatsApp ainda).
Criar 3 conversas mock com mensagens fake no seed para testar o visual.
```

### Validação:
- Layout split renderiza
- Lista de conversas com filtros
- Bolhas de chat com estilos corretos
- Indicadores de status funcionam
- Mock data exibe corretamente

---

## ETAPA 6 — Configurações da Clínica

### Prompt para o Claude Code:

```
Implemente todas as subpáginas de configurações da clínica.

BACKEND: endpoints já criados nas etapas anteriores (tenant, contacts, specialties). Adicionar:

Módulo src/modules/followup/:
- GET /followup-scenarios?tenant_id= (retorna padrões globais + customizados do tenant)
- POST /followup-scenarios (criar cenário para o tenant)
- PUT /followup-scenarios/:id
- DELETE /followup-scenarios/:id (só se não for is_default ou se for cópia local)

Módulo src/modules/escalation/:
- GET /escalation-keywords?tenant_id= (retorna padrões globais + customizados do tenant)
- POST /escalation-keywords
- PUT /escalation-keywords/:id
- DELETE /escalation-keywords/:id

FRONTEND:

/clinic/settings/clinic-data:
- Formulário: logo (upload 200KB), nome, descrição, serviços
- FieldLabel em todos os campos
- FieldGuide em campos técnicos (WABA Phone ID, Access Token)
- Botão salvar com feedback visual

/clinic/settings/contacts:
- Lista de contatos com CRUD
- Cada contato: label, telefone, WhatsApp, escopo, toggle default
- Garantir que só 1 pode ser default (ao marcar um, desmarca outro)
- FieldLabel: "Label" → "Nome identificador do contato. Ex: Secretária Ortopedia"

/clinic/settings/specialties:
- 2 seções: Especialidades e Procedimentos/Serviços (ou tabs)
- CRUD em cada seção: nome, tipo, vincular contato (select dos contatos cadastrados)
- FieldLabel: "Nome" → "Nome da especialidade ou procedimento. Ex: Ortopedista Joelho"

/clinic/settings/followup:
- Toggle: FUP por inatividade (on/off) com descrição
- Toggle: FUP contextual (on/off) com descrição
- Tabela de cenários:
  - Colunas: Nome, Tipo (medicamento/exame/retorno/custom), Intervalo, Repetições, Status, Ações
  - Badge "Padrão" nos cenários herdados do admin
  - Botão "Personalizar" em cenários padrão (cria cópia local editável)
  - Botão "Novo Cenário"
  - Modal de edição: nome, tipo, intervalo em dias, repetir a cada X dias, max repetições, template da msg

/clinic/settings/keywords:
- Tabela de keywords agrupada por categoria (tabs: Emergência, Clínico, Comercial, Opt-out, Operacional)
- Colunas: Keyword, Modo (imediato/conversacional), Prioridade, Status, Ações
- Badge "Padrão" nos herdados do admin
- Comercial (tab): destacar que esta é a mais customizável
- Botão "Personalizar" + "Nova keyword"
- Prioridade com select 1-5

/clinic/campaigns:
- Tela placeholder com visual bonito
- Ícone grande de megafone
- Texto: "Campanhas em massa — Em breve"
- Preview visual de como será: cards mockados com exemplos de campanha
- Botão desabilitado "Criar Campanha"
```

### Validação:
- Todas as subpáginas renderizam
- CRUD de contatos, especialidades, cenários e keywords funcionam
- Toggles de FUP salvam
- Cenários padrão aparecem com badge
- Campanhas mostra placeholder visual

---

## ETAPA 7 — Dashboard da Clínica + Super Admin

### Prompt para o Claude Code:

```
Implemente os dashboards.

/clinic/dashboard:
- Cards no topo (4 cards em grid):
  - Pacientes ativos (count patients where enabled=true)
  - Mensagens este mês (usage_tracking.messages_sent)
  - FUPs pendentes (count followup_agenda where status=pending)
  - Conversas escaladas (count conversations where status=escalated)
- Gráfico 1: Interações por semana (últimas 8 semanas) — bar chart
- Gráfico 2: Taxa de resposta dos FUPs (% respondido vs enviado) — donut chart
- Gráfico 3: Sinais detectados por categoria — horizontal bar chart
- Usar Recharts para gráficos
- Dados reais do banco (queries Supabase)
- Se não houver dados suficientes, mostrar estado vazio amigável

/admin/dashboard:
- Cards: Total clínicas ativas, Total pacientes, Msgs do mês (todos tenants), Tokens gastos no mês
- Tabela: Top 10 clínicas por uso (msgs enviadas/mês)
- Gráfico: Uso agregado últimos 6 meses (line chart)

/admin/usage:
- Tabela com todas as clínicas: nome, msgs enviadas, msgs recebidas, tokens input, tokens output, áudio minutos, docs processados
- Filtro por mês
- Export CSV

/admin/audit:
- Filtros: clínica, paciente, ação, período
- Tabela de logs: data/hora, clínica, paciente, ação, ator, detalhes (expandível)
- Botão "Export" (CSV/JSON) — para uso em prontuário
- Paginação
```

### Validação:
- Dashboards renderizam com dados do banco
- Gráficos funcionam
- Filtros e export funcionam no admin

---

## ETAPA 8 — Integração WhatsApp (Meta Cloud API)

### Prompt para o Claude Code:

```
Implemente a integração com a API do WhatsApp Business (Meta Cloud API).

BACKEND:

Criar módulo src/modules/whatsapp/:

1. Webhook receiver (POST /webhook/whatsapp):
   - Verificação do webhook Meta (GET com verify_token)
   - Recebe mensagens (text, audio, image)
   - Recebe status updates (sent, delivered, read)
   - Valida signature do request (X-Hub-Signature-256)
   - Identifica tenant pelo phone_number_id
   - Identifica paciente pelo número de telefone (phone_whatsapp)
   - Se áudio: baixa mídia, salva temporariamente, envia pra transcrição (placeholder)
   - Salva mensagem no banco (messages table)
   - Atualiza conversation.last_message_at
   - Atualiza patient.last_interaction_at
   - Publica evento: message.received

2. Message sender (service):
   - sendTextMessage(phoneNumber, text, tenantConfig)
   - sendTemplateMessage(phoneNumber, templateName, variables, tenantConfig)
   - Usa Meta Cloud API: POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
   - Salva mensagem no banco com wa_message_id
   - Publica evento: message.sent
   - Atualiza usage_tracking (increment messages_sent)

3. Media handler (service):
   - downloadMedia(mediaId, tenantConfig) → buffer
   - Usado para baixar áudios enviados pelo paciente

4. Template manager (service):
   - submitTemplate(tenantConfig, templateData) — futuro, placeholder
   - getTemplateStatus(tenantConfig, templateName) — futuro, placeholder

IMPORTANTE:
- Cada tenant tem seu próprio waba_phone_number_id e waba_access_token
- Todo request à Meta API usa o token do tenant específico
- Rate limiting: máx 80 msgs/segundo por número (Meta limit)
- Retry com exponential backoff em caso de falha
- Logar todas as interações no audit_logs

NÃO conectar com IA ainda. Apenas receber/enviar mensagens e salvar no banco.
Para testar local sem Meta: criar um mock mode (env: WHATSAPP_MOCK=true) que simula receber/enviar sem chamar API real.
```

### Validação:
- Webhook recebe mensagens (mock mode)
- Mensagens são salvas no banco
- Sender funciona (mock mode)
- Status updates processados
- Aba Conversas mostra mensagens reais do banco

---

## ETAPA 9 — Módulo AI Engine

### Prompt para o Claude Code:

```
Implemente o módulo de IA com abstração de provider.

BACKEND:

Criar módulo src/modules/ai-engine/:

1. LLM Provider Abstraction:
   - Interface ILLMProvider:
     - chat(messages: Message[], options?: LLMOptions): Promise<string>
     - analyzeDocument(documentBase64: string, prompt: string): Promise<string>
   - SonnetProvider (local): chama API local do Claude/Sonnet
   - OpenAIProvider (deploy): chama OpenAI API (GPT-4o-mini para chat, GPT-4o para docs)
   - Factory: getLLMProvider() retorna provider baseado em env var LLM_PROVIDER=sonnet|openai

2. Agente 1 — Análise de Documentos:
   - Trigger: evento document.uploaded
   - Input: PDF/imagem do paciente
   - Processo:
     a. Baixa documento do Supabase Storage
     b. Envia para LLM (analyzeDocument) com prompt de extração
     c. Prompt de extração deve retornar JSON estruturado:
        {
          medications: [{name, dosage, frequency, duration_days, start_date?}],
          exams: [{name, requested_date?, notes}],
          returns: [{date?, interval_days?, notes}],
          orientations: [{description, category}],
          summary: "resumo geral da consulta"
        }
     d. Salva extracted_data no patient_documents
     e. Gera agenda de FUPs baseada nos cenários ativos do tenant:
        - Para cada medication → cria FUPs de acordo com cenário "medication"
        - Para cada exam → cria FUP de acordo com cenário "exam"
        - Para cada return → cria FUP de acordo com cenário "return"
     f. Salva agenda em patient_followup_agenda
     g. Publica evento: document.analyzed
   - Otimização: prompt compacto, pedir apenas JSON sem explicação

3. Agente 2 — Interação com Paciente:
   - Trigger: evento message.received
   - Input: mensagem do paciente + contexto
   - Contexto montado (otimizado em tokens):
     - System prompt base (da spec seção 9)
     - Dados do tenant: nome clínica, especialidades, contatos
     - Dados do paciente: first_name, general_info, extracted_data resumido
     - Últimas 10 mensagens da conversa (não todas)
     - Keywords de escalonamento ativas
   - Processo:
     a. Monta contexto
     b. Verifica keywords de emergência (modo imediato) ANTES de chamar IA
     c. Se emergência → responde direto sem chamar LLM (economia de tokens)
     d. Se opt-out → processa direto sem chamar LLM
     e. Senão → chama LLM com contexto
     f. LLM responde com JSON: {response: "texto", intent: "educativo|commercial|clinical|escalation", escalate: bool, escalation_reason?: string, detected_specialty?: string}
     g. Se escalate=true → muda conversation.status para escalated
     h. Se detected_specialty → verifica tenant_specialties → ajusta resposta
     i. Envia resposta via WhatsApp sender
     j. Salva ai_intent_detected na mensagem
     k. Atualiza usage_tracking (tokens)
   - Otimização: 
     - Cache de system prompt por tenant (não recompor a cada msg)
     - Histórico limitado a 10 msgs
     - Keywords checadas ANTES da chamada LLM (evita gasto desnecessário)

4. Whisper — Transcrição de Áudio:
   - Trigger: mensagem recebida com type=audio
   - Baixa áudio do WhatsApp (via media handler)
   - Envia para OpenAI Whisper API (ou mock local)
   - Salva transcrição em messages.audio_transcription
   - Alimenta Agente 2 com o texto transcrito
   - Atualiza usage_tracking.audio_minutes_processed

SYSTEM PROMPT (compacto para otimizar tokens):

"""
Você é o Assistente Virtual da {clinic_name}. Responda como assistente de clínica médica.

REGRAS ABSOLUTAS:
- Chame o paciente por {patient_first_name}
- NUNCA diagnostique, prescreva, sugira exame ou interprete resultado
- NUNCA diga "é normal", "não é nada", "pode tomar X", "pode ficar tranquilo"
- Se paciente insistir em perguntas médicas: responda "Não posso responder isso, {patient_first_name}. Fale com a secretária da {clinic_name}: {contact_phone}"
- Se emergência (dor peito, falta ar, desmaio, sangramento, ideação suicida): "Procure atendimento de urgência imediatamente. Fale com a secretária: {contact_phone}"

PODE: acolher, orientar em geral, fazer perguntas de triagem (sem concluir), lembrar orientações já definidas pelo médico, informar sobre a clínica.

CONTEXTO DO PACIENTE:
{patient_context}

ESPECIALIDADES DA CLÍNICA:
{specialties_list}

ORIENTAÇÕES PRÉVIAS DO MÉDICO:
{medical_orientations}

Responda APENAS em JSON: {"response": "texto", "intent": "educativo|commercial|clinical|escalation", "escalate": false, "escalation_reason": null, "detected_specialty": null}
"""

Implementar tudo mas testar com mock LLM (respostas fixas) até conectar provider real.
```

### Validação:
- Agente 1 processa documento e gera agenda (com mock)
- Agente 2 responde mensagem (com mock)
- Keywords de emergência bloqueiam sem chamar LLM
- Whisper placeholder funciona
- Usage tracking incrementa

---

## ETAPA 10 — Motor de Follow-ups

### Prompt para o Claude Code:

```
Implemente o motor de follow-ups agendados.

BACKEND:

Criar worker em src/modules/followup/worker.ts:

1. Cron job: roda a cada 5 minutos
   - Busca patient_followup_agenda WHERE status = 'pending' AND scheduled_date <= NOW()
   - Filtra: só seg-sex (se hoje é sáb/dom, ignora — serão processados na segunda)
   - Filtra: verifica se paciente enabled=true e opt_out=false
   - Para FUP contextual: envia template com variáveis preenchidas
   - Para FUP inatividade: verifica last_interaction_at do paciente
     - Se paciente interagiu desde o agendamento → cancela (status=cancelled)
     - Se não → envia
   - Atualiza status para 'sent' e sent_at

2. Listener de interação (evento: message.received):
   - Quando paciente interage, verifica se há FUPs de inatividade pendentes
   - Se sim → cancela todos (status=cancelled) — paciente já está ativo
   - Reseta contagem de inatividade

3. Gerador de FUP inatividade:
   - Trigger: quando FUP de inatividade é enviado OU quando paciente interage
   - Agenda o próximo FUP da sequência:
     - Após FUP1 (7d) → agenda FUP2 para +15 dias
     - Após FUP2 (15d) → agenda FUP3 para +30 dias
     - Após FUP3 → fim da sequência
   - Se paciente interagir → reseta para FUP1 (+7 dias de inatividade)
   - Regra de dia útil: se scheduled_date cair em sáb/dom → move pra segunda

4. Recalculador de agenda contextual:
   - Trigger: evento document.uploaded ou patient.updated
   - Remove FUPs contextuais pendentes do paciente
   - Agente 1 reanalisa docs ativos
   - Gera nova agenda baseada nos docs atualizados

5. Onboarding automático:
   - Trigger: evento patient.created
   - Agenda:
     - Msg 1 (boas-vindas): envio imediato
     - Msg 2 (resumo consulta): +30 minutos após msg 1 (ou após Agente 1 terminar, o que for mais tarde)
   - Se followup_inactivity_enabled → agenda FUP1 para +7 dias
   - Se followup_contextual_enabled + docs anexados → Agente 1 processa e gera agenda

FILAS (BullMQ):
- Queue: followup-processor (processa envios agendados)
- Queue: document-analyzer (processa docs via Agente 1)
- Queue: onboarding (processa cadastro novo)
- Todas com retry (3 tentativas, backoff exponencial)
- Dead letter queue para falhas persistentes

Configurar cron jobs:
- Followup check: */5 * * * * (a cada 5 min)
- Inactivity check: 0 9 * * 1-5 (9h seg-sex, gera FUPs de inatividade se aplicável)
```

### Validação:
- Cadastrar paciente → recebe msg boas-vindas
- Msg resumo chega 30min depois
- FUPs contextuais são gerados a partir dos docs
- FUPs de inatividade agendam corretamente
- Interação cancela FUPs de inatividade pendentes
- Não dispara em fim de semana

---

## ETAPA 11 — Integração End-to-End + Testes

### Prompt para o Claude Code:

```
Conecte todos os módulos e faça o fluxo completo funcionar.

1. Event bus: garantir que todos os eventos estão conectados:
   - patient.created → onboarding worker
   - document.uploaded → Agente 1 → gera agenda
   - message.received → keyword check → Agente 2 → resposta
   - message.received → cancela FUPs inatividade se aplicável

2. Fluxo completo de teste (mock mode):
   a. Login como secretária
   b. Cadastrar paciente com doc PDF
   c. Verificar: msg boas-vindas enviada (mock)
   d. Verificar: Agente 1 processou doc e gerou agenda
   e. Verificar: msg resumo agendada para +30min
   f. Simular mensagem do paciente (mock webhook)
   g. Verificar: Agente 2 respondeu
   h. Verificar: conversa aparece na aba Conversas
   i. Simular mensagem de emergência → verificar escalonamento
   j. Simular opt-out → verificar flag e msg despedida
   k. Verificar dashboard atualiza contadores
   l. Verificar audit_logs registram tudo

3. Criar testes automatizados básicos:
   - Testes unitários: keyword matcher, LLM provider factory, FUP scheduler
   - Testes de integração: fluxo completo patient → onboarding → followup
   - Usar Vitest

4. Error handling global:
   - Todas as chamadas externas (Supabase, LLM, WhatsApp) com try/catch
   - Falhas logadas em audit_logs
   - Notificação no dashboard admin quando há falhas críticas

5. README.md final:
   - Instruções de setup completas
   - Como configurar Supabase
   - Como configurar Meta WhatsApp API
   - Como rodar em mock mode
   - Como fazer deploy (Vercel + Railway)
   - Variáveis de ambiente necessárias
```

### Validação:
- Fluxo completo funciona em mock mode
- Testes passam
- README está completo

---

## ORDEM RESUMIDA

| # | Etapa | Dependência |
|---|---|---|
| 0 | Setup projeto | — |
| 1 | Design System + Layout | 0 |
| 2 | Banco de dados | 0 |
| 3 | Auth + Tenant | 1, 2 |
| 4 | Pacientes | 3 |
| 5 | Conversas (UI) | 3 |
| 6 | Configurações | 3, 4 |
| 7 | Dashboards | 4, 5, 6 |
| 8 | WhatsApp API | 5 |
| 9 | AI Engine | 4, 8 |
| 10 | Motor Follow-ups | 8, 9 |
| 11 | Integração E2E | Tudo |

---

## DICAS PARA O CLAUDE CODE

- Sempre rode `pnpm typecheck` após cada módulo
- Se der erro de tipo, corrija antes de avançar
- Commite após cada etapa funcional
- Use branches: `feat/etapa-0-setup`, `feat/etapa-1-design`, etc.
- Mantenha o .env.example atualizado
- Se o Claude Code perder contexto, re-envie a spec + o último estado do projeto
