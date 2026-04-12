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

### 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o schema: `packages/database/schema.sql` no SQL Editor do Supabase
3. Execute o seed: `packages/database/seed.sql`
4. Copie a URL e as keys para o `.env`

### 4. Rodar em desenvolvimento

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## Mock mode (sem Meta API)

Defina `WHATSAPP_MOCK=true` no `.env`. Mensagens serão simuladas localmente sem chamar a API real da Meta.

## Deploy

### Frontend → Vercel

```bash
# Instale a Vercel CLI
npm i -g vercel
vercel --cwd apps/web
```

### Backend → Railway

1. Conecte o repositório no [railway.app](https://railway.app)
2. Selecione o diretório `apps/api`
3. Configure as variáveis de ambiente
4. Deploy automático via push na branch `main`

## Configurar Meta WhatsApp API

1. Acesse [business.facebook.com](https://business.facebook.com)
2. Vá em **Configurações** → **WhatsApp** → **Phone Numbers**
3. Copie o **Phone Number ID** → `META_PHONE_NUMBER_ID`
4. Gere um **Access Token** permanente → `META_WHATSAPP_TOKEN`
5. Configure o Webhook:
   - URL: `https://sua-api.railway.app/webhook/whatsapp`
   - Verify Token: valor de `META_VERIFY_TOKEN`
   - Eventos: `messages`, `message_deliveries`, `message_reads`

## Scripts disponíveis

```bash
pnpm dev          # Sobe todos os apps em desenvolvimento
pnpm build        # Build de produção
pnpm lint         # Lint em todos os packages
pnpm typecheck    # Verifica tipos TypeScript
pnpm format       # Formata código com Prettier
```
