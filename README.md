# CRM Fidelização Clínicas

Sistema SaaS multi-tenant de acompanhamento pós-consulta via WhatsApp com IA para clínicas médicas.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui → Vercel
- **Backend**: Fastify + TypeScript → Railway
- **Banco**: Supabase Cloud (PostgreSQL + Auth + Storage + RLS)
- **Filas**: BullMQ + Upstash Redis
- **WhatsApp**: Meta Cloud API (direto, sem BSP)
- **LLM**: Abstração de provider (Claude Sonnet local / OpenAI em produção)
- **Monorepo**: Turborepo + pnpm workspaces

## Estrutura

```
├── apps/
│   ├── web/          # Frontend Next.js (painel clínica + admin)
│   └── api/          # Backend Fastify
├── packages/
│   ├── shared/       # Types e constantes compartilhados
│   ├── database/     # Schema, migrations e types do Supabase
│   └── ui/           # Componentes UI compartilhados
├── docs/             # Specs e documentação
```

## Setup local

### Pré-requisitos

- Node.js >= 20
- pnpm >= 10
- Conta Supabase (free tier suficiente para desenvolvimento)

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

Variáveis obrigatórias:

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (backend apenas) |
| `JWT_SECRET` | Secret para assinar tokens JWT (mín. 32 chars) |
| `FRONTEND_URL` | URL do frontend (ex: http://localhost:3000) |
| `LLM_PROVIDER` | `sonnet` (padrão) ou `openai` |
| `ANTHROPIC_API_KEY` | API key da Anthropic (se LLM_PROVIDER=sonnet) |
| `OPENAI_API_KEY` | API key da OpenAI (se LLM_PROVIDER=openai) |
| `META_WHATSAPP_TOKEN` | Access token da Meta WhatsApp API |
| `META_PHONE_NUMBER_ID` | Phone Number ID da conta WABA |
| `META_VERIFY_TOKEN` | Token de verificação do webhook Meta |
| `META_APP_SECRET` | App Secret para validação HMAC do webhook |
| `REDIS_URL` | URL do Redis (ex: rediss://upstash...) |
| `WHATSAPP_MOCK` | `true` para simular envios localmente |
| `NODE_ENV` | `development` ou `production` |

### 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute nesta ordem:
   - `packages/database/schema.sql` — cria todas as tabelas e RLS
   - `packages/database/seed.sql` — insere dados iniciais (keywords padrão, cenários FUP)
3. Copie a **Project URL** e as **API Keys** para o `.env`
4. Configure o **Storage bucket** `patient-documents`:
   - Em Storage → New Bucket → Nome: `patient-documents`
   - Enable RLS e adicione a policy que permite acesso por `tenant_id`

### 4. Rodar em desenvolvimento

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## Mock mode (sem Meta API real)

Defina `WHATSAPP_MOCK=true` no `.env`. Mensagens simuladas são logadas no console sem chamar a API da Meta.

### Simular mensagem recebida via curl

Com o servidor rodando e `WHATSAPP_MOCK=true`:

```bash
curl -X POST http://localhost:3001/webhook/whatsapp/mock \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "SEU_PHONE_NUMBER_ID",
    "from": "5511999990000",
    "display_name": "Maria Silva",
    "message_type": "text",
    "text": "Olá, tenho uma dúvida sobre meu medicamento"
  }'
```

O endpoint processa a mensagem pelo fluxo completo (Agent 2 → resposta → audit log) sem chamar a Meta API.

## Testes

```bash
# Rodar todos os testes
pnpm --filter @crm/api test

# Modo watch
pnpm --filter @crm/api test:watch

# Com cobertura
pnpm --filter @crm/api test:coverage
```

### Cobertura dos testes

| Módulo | Tipo | O que testa |
|---|---|---|
| `llm-provider.test.ts` | Unitário | Factory retorna provider correto, singleton |
| `followup-scheduler.test.ts` | Unitário | `buildMessageText`, `addBusinessDays` |
| `agent2-parser.test.ts` | Unitário | Intent parsing, sanitização, keyword detection |
| `patient-onboarding.test.ts` | Integração | Fluxo completo com mocks de infra |

## Fluxo de Dados

```
Paciente envia mensagem WhatsApp
  └─► POST /webhook/whatsapp (Meta Cloud API)
        ├─► Validação HMAC (META_APP_SECRET)
        ├─► findOrCreatePatient
        ├─► findOrCreateConversation
        ├─► saveIncomingMessage
        │     └─► Whisper (se áudio)
        ├─► cancelInactivityFups (se paciente existente)
        ├─► scheduleInactivityFups (se paciente novo)
        └─► runAgent2
              ├─► LLM Provider (Sonnet / OpenAI)
              ├─► mergePatientFacts
              ├─► update conversation status (se escalate)
              ├─► update opt_out (se optout)
              └─► sendTextMessage

Secretária cadastra paciente com PDF
  └─► POST /api/v1/patients/:id/documents
        ├─► uploadToStorage (Supabase Storage)
        ├─► insert patient_documents
        └─► runAgent1 (assíncrono)
              ├─► extractText (pdf-parse)
              ├─► LLM Provider (análise)
              ├─► buildFollowupAgenda → patient_followup_agenda
              ├─► update interaction_summary
              └─► enqueue summary +30min (BullMQ)

Scheduler de FUPs (a cada 5min, seg-sex)
  └─► processDueAgendaItems
        └─► getFollowupQueue().add → FollowupWorker
              └─► sendTextMessage
```

## Deploy

### Frontend → Vercel

```bash
npm i -g vercel
vercel --cwd apps/web
```

Configurar variáveis de ambiente no painel da Vercel (as que começam com `NEXT_PUBLIC_` e `SUPABASE_*`).

### Backend → Railway

1. Conecte o repositório no [railway.app](https://railway.app)
2. Crie dois serviços:
   - **api**: `apps/api` — `pnpm build && pnpm start`
   - **redis**: Add-on Redis ou use Upstash externo
3. Configure todas as variáveis de ambiente
4. O deploy ocorre automaticamente via push na branch `main`

### Configurar Redis (Upstash — recomendado)

1. Acesse [upstash.com](https://upstash.com) → Create Database
2. Escolha **Redis** → região mais próxima
3. Copie a **REDIS_URL** (formato `rediss://...`) para o `.env`

## Configurar Meta WhatsApp API

1. Acesse [business.facebook.com](https://business.facebook.com)
2. Crie um **App de Negócios** → tipo **Business**
3. Adicione o produto **WhatsApp**
4. Em **WhatsApp → Getting Started**:
   - Copie o **Phone Number ID** → `META_PHONE_NUMBER_ID`
   - Gere ou use o **Temporary Access Token** → `META_WHATSAPP_TOKEN`
5. Para token permanente: crie um **System User** no Business Manager e gere token com escopo `whatsapp_business_messaging`
6. Copie o **App Secret** (em App Settings → Basic) → `META_APP_SECRET`
7. Configure o Webhook:
   - URL: `https://sua-api.railway.app/webhook/whatsapp`
   - Verify Token: valor de `META_VERIFY_TOKEN`
   - Eventos: `messages`, `message_deliveries`, `message_reads`

## Tenant Isolation

Todas as queries usam `tenant_id` como filtro obrigatório. O Supabase tem RLS (Row Level Security) ativo em todas as tabelas. A API valida o `tenant_id` via JWT a cada request.

## Auditoria

Todas as falhas críticas são registradas na tabela `audit_logs`:

| Ação | Quando |
|---|---|
| `ai_agent2_failed` | Agent 2 falha ao processar mensagem recebida |
| `ai_agent1_failed` | Agent 1 falha ao processar documento |
| `followup_send_failed` | Worker de FUP falha ao enviar mensagem |
| `onboarding_send_failed` | Worker de onboarding falha ao enviar boas-vindas |

## Scripts disponíveis

```bash
pnpm dev          # Sobe todos os apps em desenvolvimento
pnpm build        # Build de produção
pnpm lint         # Lint em todos os packages
pnpm typecheck    # Verifica tipos TypeScript
pnpm format       # Formata código com Prettier
pnpm --filter @crm/api test          # Testes da API
pnpm --filter @crm/api test:coverage # Testes com cobertura
```
