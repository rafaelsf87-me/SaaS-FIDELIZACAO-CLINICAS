# CLAUDE.md

## Documentação do Projeto
- Spec completa: docs/SPEC_PROJETO_FIDELIZACAO_v2.md
- Guia de implementação: docs/GUIA_IMPLEMENTACAO_CLAUDE_CODE.md
- NUNCA deletar ou modificar esses arquivos.

## Regras
- Sempre consultar a spec antes de implementar qualquer módulo
- Ao finalizar cada etapa, rodar /review
- Seguir Design System: tema azul claro/branco médico (ver seção 3 da spec)
- Tooltips "ℹ️" com descrição + exemplo em todos os campos de formulário
- Desktop-first, responsivo mobile
- Otimizar tokens/processamento em todas as chamadas de IA
- Tenant isolation: tenant_id em todas as queries, RLS no Supabase

## Stack
- Frontend: Next.js 14+ App Router + TypeScript + Tailwind + shadcn/ui
- Backend: Fastify + TypeScript
- Banco: Supabase Cloud (PostgreSQL)
- LLM: Sonnet (local) / OpenAI (deploy) via ILLMProvider
- WhatsApp: Meta Cloud API direta

## Progresso
- [x] Etapa 0: Setup
- [x] Etapa 1: Design System + Layout
- [x] Etapa 2: Banco de Dados
- [x] Etapa 3: Auth + Tenant
- [x] Etapa 4: Pacientes
- [x] Etapa 5: Conversas UI
- [x] Etapa 6: Configurações
- [x] Etapa 7: Dashboards
- [x] Etapa 8: WhatsApp API
- [x] Etapa 9: AI Engine
- [ ] Etapa 10: Follow-ups
- [ ] Etapa 11: Integração E2E
