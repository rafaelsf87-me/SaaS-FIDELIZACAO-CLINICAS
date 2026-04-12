# SPEC TÉCNICA — Sistema de Fidelização e Acompanhamento Pós-Consulta
## v2.0 — Consolidada

> Documento base para implementação via Claude Code.

---

## 1. VISÃO GERAL

**Produto**: Sistema SaaS multi-tenant de acompanhamento pós-consulta via WhatsApp com IA, focado em fidelização, aumento de LTV e reativação de pacientes.

**Modelo**: B2B SaaS — clínica é o cliente, paciente é o usuário final (via WhatsApp).

**Escala**: Piloto 1 clínica → projeção até 1.000 clínicas.

**MVP**: Pós-consulta apenas (follow-up, dúvidas, reativação). Campanhas em massa = tela "em construção". Pré-atendimento = arquitetura preparada, não implementado.

---

## 2. STACK TECNOLÓGICA

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript | SSR, deploy Vercel |
| UI | Tailwind CSS + shadcn/ui | Visual profissional médico |
| Backend | Node.js + Fastify + TypeScript | Performance, workers persistentes |
| Banco de Dados | Supabase Cloud (PostgreSQL) | Auth, Storage, Realtime, RLS |
| Filas/Jobs | BullMQ + Upstash Redis | Follow-ups agendados, processamento async |
| WhatsApp | Meta Cloud API (direto, sem BSP) | Controle total |
| LLM | Abstração de provider (interface única) | Local = Sonnet. Deploy = OpenAI |
| Speech-to-text | OpenAI Whisper API | Transcrição de áudios WhatsApp |
| Storage | Supabase Storage | PDFs, logos, mídias. RLS por tenant |
| Deploy Frontend | Vercel | |
| Deploy Backend | Railway | Workers, filas, cron jobs |

### Observações
- **Supabase Cloud desde o início** (free tier: 500MB banco, 1GB storage, 50K auth users)
- **LLM provider abstraction**: interface `ILLMProvider` com `SonnetProvider` (local) e `OpenAIProvider` (deploy). Swap via env var.
- **Áudio no MVP**: paciente envia áudio → Whisper transcreve → processa como texto. ~$0.006/min.
- **Otimização de tokens/processamento**: system prompts compactos, contexto do paciente resumido, histórico limitado às últimas N msgs relevantes, cache de respostas frequentes.
- **Desktop-first**, responsivo mobile.

---

## 3. DESIGN SYSTEM

### Paleta de cores — Tema Médico

| Token | Cor | Uso |
|---|---|---|
| `--primary` | #2563EB (azul médio) | Botões primários, links, ícones ativos |
| `--primary-light` | #60A5FA (azul claro) | Hover, badges, destaques leves |
| `--primary-lighter` | #DBEAFE (azul bem claro) | Backgrounds de cards, linhas ativas no menu |
| `--primary-dark` | #1D4ED8 (azul escuro) | Texto sobre fundo claro, headers |
| `--background` | #FFFFFF | Fundo principal |
| `--surface` | #F8FAFC (cinza quase branco) | Fundo de painéis, sidebars |
| `--border` | #E2E8F0 (cinza claro) | Bordas, divisores |
| `--text-primary` | #1E293B (cinza escuro) | Texto principal |
| `--text-secondary` | #64748B (cinza médio) | Texto secundário, labels |
| `--success` | #16A34A | Status positivo, badges "ativo" |
| `--warning` | #F59E0B | Alertas, FUPs pendentes |
| `--danger` | #DC2626 | Erros, escalonamentos, emergência |
| `--escalated` | #EA580C (laranja) | Conversas escaladas |

### Tipografia
- Font principal: Inter (padrão shadcn/ui, alta legibilidade)
- Títulos: semibold
- Body: regular
- Tamanhos: seguir escala do Tailwind (text-sm, text-base, text-lg)

### Componentes visuais
- Cards com bordas suaves (rounded-lg), sombra leve (shadow-sm)
- Menu lateral: fundo `--surface`, item ativo com `--primary-lighter` + borda lateral `--primary`
- Tabelas: linhas alternadas com fundo sutil
- Botões: primário azul, secundário outline, destrutivo vermelho
- Tooltips "ℹ️" em todos os campos de formulário

---

## 4. ARQUITETURA

### 4.1 Padrão: Modular Monolith + DDD leve

```
src/
├── modules/
│   ├── auth/           # Autenticação e autorização
│   ├── tenant/         # Gestão de clínicas (multi-tenant)
│   ├── patient/        # Cadastro e gestão de pacientes
│   ├── conversation/   # Mensagens e histórico WhatsApp
│   ├── ai-engine/      # Agentes de IA (análise + interação + whisper)
│   ├── followup/       # Motor de follow-ups e agendamento
│   ├── escalation/     # Triagem, keywords, escalonamento
│   ├── campaign/       # Campanhas (futuro - "em construção")
│   ├── billing/        # Metering e usage tracking
│   └── audit/          # Logs de auditoria
├── shared/             # Utils, types, configs
├── infra/              # Database, queues, external APIs
└── api/                # Rotas HTTP (Fastify)
```

### 4.2 Princípios
- Cada módulo: entities, use-cases, repositories, controllers
- Comunicação entre módulos via event bus interno
- API-first: OpenAPI spec antes de implementar
- Event-driven: `patient.created` → onboarding, `document.uploaded` → Agente 1
- Tenant isolation: `tenant_id` em TODAS as tabelas, RLS no Supabase
- Gstack: template de organização do repo
- Token optimization: minimizar chamadas à IA, cachear respostas, comprimir histórico

### 4.3 Arquitetura de Agentes IA

```
                    ┌──────────────┐
  Áudio WhatsApp ──▶│   WHISPER    │──▶ Texto
                    └──────────────┘      │
                                          ▼
┌─────────────────┐     ┌──────────────────┐
│   AGENTE 1      │     │    AGENTE 2       │
│   (Análise)     │     │   (Interação)     │
│                 │     │                   │
│ - Lê PDFs/docs  │     │ - Responde msgs   │
│ - Extrai dados  │────▶│ - Follow-ups      │
│ - Monta agenda  │     │ - Triagem         │
│ - Atualiza      │     │ - Escalonamento   │
│   perfil        │     │ - Detecta sinais  │
└─────────────────┘     └──────────────────┘
```

**Agente 1 (Análise)**: roda ao cadastrar paciente ou upload de novo documento. GPT-4o (multimodal). Extrai: medicamentos + posologia + duração, pedidos de exame, retornos, orientações. Monta agenda de FUPs personalizada. Reroda ao incluir novos docs ou editar info.

**Agente 2 (Interação)**: roda a cada mensagem (texto ou áudio transcrito) e a cada FUP agendado. GPT-4o-mini. Escopo seguro, triagem conversacional, detecção de sinais, escalonamento.

**Whisper**: recebe áudio do WhatsApp → transcreve → alimenta Agente 2 como texto. Transparente pro paciente.

---

## 5. MODELO DE DADOS

### tenants
```
id, name, logo_url (max 200KB),
description, services_description,
phone_contact,
waba_phone_number_id, waba_access_token,
followup_inactivity_enabled (bool),
followup_contextual_enabled (bool),
followup_config (json),
created_at, updated_at, status (active/inactive)
```

### tenant_contacts
```
id, tenant_id, label (ex: "Secretária Ortopedia"),
phone_number, whatsapp_number,
scope_description (ex: "Atende ortopedia e fisioterapia"),
is_default (bool), active (bool), created_at
```

### tenant_specialties
```
id, tenant_id, name (ex: "Ortopedista Joelho"),
type (specialty | procedure | service),
contact_id (ref tenant_contacts, opcional),
active (bool), created_at
```

### users
```
id, tenant_id, email, name, role (admin | secretary | super_admin),
created_at, updated_at, status
```

### patients
```
id, tenant_id, cpf (chave ID), name, first_name,
birth_date, sex (M/F), health_plan,
address, phone_whatsapp,
general_info (texto livre),
recurrence_flag (bool),
enabled (bool, default true),
opt_out (bool, default false),
interaction_summary (texto gerado por IA),
last_interaction_at, created_at, updated_at
```

### patient_documents
```
id, patient_id, tenant_id, file_url (Supabase Storage),
file_name, file_type,
extracted_data (json - output do Agente 1),
uploaded_at, is_active (bool, default true)
```
> Alerta ao adicionar novo doc: "Caso haja documentos anteriores com datas e procedimentos conflitantes, desative-os para não confundir a agenda de mensagens personalizada."

### patient_followup_agenda
```
id, patient_id, tenant_id,
source (inactivity | contextual),
scenario_id (ref tabela cenários),
trigger_type (medication | exam | return | custom),
trigger_detail (json),
scheduled_date, sent_at,
status (pending | sent | cancelled | responded),
template_id, created_at
```
> Visível e editável no detalhe do paciente. Recalcula ao adicionar docs ou editar info.

### followup_scenarios
```
id, tenant_id (null = padrão global admin),
name (ex: "Medicamento em uso"),
trigger_type (medication | exam | return | custom),
interval_days, repeat_every_days, max_repeats,
message_template, active (bool),
is_default (bool), created_at, updated_at
```

### conversations
```
id, patient_id, tenant_id,
whatsapp_conversation_id,
status (active | closed | escalated),
escalation_reason, escalated_to,
last_message_at,
created_at, updated_at
```

### messages
```
id, conversation_id, tenant_id, patient_id,
direction (inbound | outbound),
content, template_id,
message_type (text | template | media | audio),
media_url, audio_transcription,
wa_message_id, wa_status (sent | delivered | read | failed),
ai_intent_detected (json),
created_at
```

### escalation_keywords
```
id, tenant_id (null = padrão global),
keyword, category (emergency | clinical | commercial | optout | operational),
mode (immediate | conversational),
priority (1-5),
is_default (bool), active (bool)
```

### whatsapp_templates
```
id, tenant_id, template_name, template_body,
variables (json - lista com nome e descrição de cada variável),
category (utility | marketing),
meta_status (pending | approved | rejected),
created_at
```
> Painel: botão "Ver variáveis disponíveis" ao criar/editar templates.

### campaigns (futuro)
```
id, tenant_id, name, message_template_id,
target_filter (json), scheduled_at,
status (draft | scheduled | sent | cancelled),
created_at
```

### usage_tracking
```
id, tenant_id, month_year,
messages_sent, messages_received,
ai_tokens_input, ai_tokens_output,
audio_minutes_processed,
documents_processed, campaigns_sent,
updated_at
```

### audit_logs
```
id, tenant_id, patient_id,
action, details (json), actor (ai | secretary | system),
created_at
```

---

## 6. INTERFACES

### 6.0 Padrão de Layout (todos os painéis)
- **Menu lateral esquerdo** fixo: ícones + labels
- Clique em aba → conteúdo abre à direita
- Subitens expandem em accordion abaixo do título no menu
- **Tooltips "ℹ️"** ao lado de TODOS os labels de campos. Hover = descrição breve. Ex: "Nome" → "Nome completo do paciente"
- Visual: tema azul claro/branco médico (ver seção 3 - Design System)
- Secretárias são iniciantes → tudo óbvio e autoexplicativo

### 6.1 Painel Super Admin

**Menu lateral:**
- Dashboard
- Clínicas
- Cenários FUP (padrões globais)
- Keywords (padrões globais) — inclui visualização de keywords comerciais com indicação de quais clínicas customizaram
- Usage/Billing
- Auditoria / Export prontuário
- Configurações

**Funcionalidades:**
- CRUD de clínicas com login/senha gerado
- Dashboard: tenants ativos, msgs/mês, tokens gastos, áudios processados
- Cenários FUP padrão (CRUD, default para novas clínicas)
- Keywords padrão (CRUD, default para novas clínicas)
- Export de auditoria por clínica e por paciente (para prontuário)

### 6.2 Painel Clínica (Secretárias)

**Menu lateral:**
- Dashboard
- Pacientes
- **Conversas**
- Configurações
  - Dados da Clínica
  - Especialidades/Serviços
  - Contatos
  - Follow-up
  - Keywords
- Campanhas (em construção)

---

**Dashboard**
- Pacientes ativos, msgs enviadas/mês, FUPs pendentes
- Gráficos: interações/semana, taxa de resposta, sinais detectados

---

**Pacientes**
- Lista com busca e filtros (nome, CPF, flag, plano, status)
- Cadastro de paciente:
  - Obrigatórios: nome, CPF
  - Opcionais: plano saúde, endereço, nascimento, sexo (M/F), flag recorrência, info gerais (texto livre)
  - Upload docs (drag & drop)
  - Alerta ao add novo doc com datas/procedimentos
- **Detalhe do paciente:**
  - Dados cadastrais (editáveis)
  - Documentos (lista, upload, ativar/desativar cada um)
  - **Agenda personalizada de FUPs**: lista visual com datas, status (pendente/enviado/respondido/cancelado). Editável: alterar data, cancelar, adicionar manualmente. Recalcula ao add docs ou editar info.
  - Resumo interações (botão "Gerar resumo" — economiza token)
  - Botão "Ver conversa" → abre na aba Conversas

---

**Conversas**
- Lista de TODAS as conversas, ordenada por mensagem mais recente (last_message_at)
- Filtros: status (ativa, escalada, fechada), nome paciente
- Indicador visual de escaladas (cor laranja/vermelho)
- Clique na conversa → abre à direita estilo WhatsApp Desktop:
  - Bolhas: IA à direita (azul claro), paciente à esquerda (cinza)
  - Áudio: ícone 🎤 + texto da transcrição
  - Indicador de escalonamento inline
  - Status msgs (enviado ✓, entregue ✓✓, lido ✓✓ azul)
  - Botão "Assumir conversa" (secretária toma controle da IA)

---

**Configurações**

*Dados da Clínica:*
- Logo (upload, max 200KB, validação no front com mensagem de erro clara)
- Nome (IA usa como "Assistente da {{nome}}")
- Descrição geral e serviços

*Contatos:*
- CRUD de telefones/WhatsApp humanos
- Cada contato: label + número + escopo
- Marcar 1 como padrão

*Especialidades/Serviços:*
- CRUD especialidades (ex: Ortopedista Joelho)
- CRUD procedimentos/serviços (ex: Infiltração, Fisioterapia)
- Vincular contato específico (opcional)

*Follow-up:*
- Toggle: FUP por inatividade (on/off)
- Toggle: FUP contextual (on/off)
- Cenários de FUP: herda padrões admin, pode editar/adicionar/excluir
- Preview de como ficaria a agenda de um paciente exemplo

*Keywords:*
- Keywords de escalonamento: herda padrões, pode editar/adicionar/excluir
- Destaque para keywords comerciais (mais customizáveis por clínica)

---

**Campanhas (EM CONSTRUÇÃO)**
- Tela placeholder visual com preview de como será
- Botão desabilitado "Em breve"

### 6.3 Interface Paciente
- 100% WhatsApp, transparente
- Sem app, sem portal, sem login
- Suporta texto e áudio
- "Pare" → desabilita envio

---

## 7. FLUXOS CONVERSACIONAIS

### FLUXO 1: Onboarding
- **Gatilho**: secretária salva cadastro de novo paciente
- **Mensagem 1 (imediata)**: template boas-vindas
  - "Olá {{primeiro_nome}}, sou o Assistente Virtual da {{clínica}}. Fui criado para te ajudar com dúvidas e acompanhamento do seu tratamento. Salve este número nos seus contatos!"
- **Em paralelo**: Agente 1 analisa PDFs/docs, extrai dados, monta agenda
- **Mensagem 2 (30 minutos após msg 1)**: resumo da consulta + próximos passos
  - Baseada nos docs extraídos pelo Agente 1
  - Todo paciente recebe (fixa)
  - Se Agente 1 ainda não terminou → aguarda conclusão, envia assim que pronto (mínimo 30 min)

### FLUXO 2: FUP Contextual (baseado nos docs — PRIORITÁRIO)
- **Gatilho**: Agente 1 extrai dados dos documentos e monta agenda automática
- **Cenários padrão**:
  - Medicamento → msg a cada 2 dias durante período do tratamento
  - Pedido de exame → msg D+3 ("Conseguiu agendar o exame?")
  - Retorno agendado → msg D-2 ("Lembrete: seu retorno está chegando")
- **Tabela de cenários**: admin define padrões → clínica herda e pode personalizar
- **Agenda visível no detalhe do paciente**: editável, recalculável
- **Regras**: só seg-sex. Se cair no fim de semana → segunda seguinte.
- **Mix de templates**: com variáveis quando possível + template curto pra reabrir janela 24h

### FLUXO 3: FUP por Inatividade
- **Configurável**: liga/desliga no painel da clínica
- **Regra**: conta dias desde a ÚLTIMA INTERAÇÃO do paciente (não desde cadastro)
  - 7 dias sem interação → FUP 1. Zera contagem.
  - 15 dias sem interação → FUP 2. Zera contagem.
  - 30 dias sem interação → FUP 3. Fim da sequência.
- **Regras**: só seg-sex. Qualquer interação do paciente zera a contagem.
- Template curto pra reabrir janela → IA conversa livremente na janela 24h

### FLUXO 4: Dúvidas do Paciente (passivo)
- **Gatilho**: paciente manda msg (texto ou áudio)
- Se áudio → Whisper transcreve → processa como texto
- **Triagem conversacional (funil)**:
  1. **Acolhe**: "Entendi, {{nome}}. Vou te ajudar."
  2. **Perguntas de protocolo** (sem diagnosticar): "Desde quando?", "Constante ou intermitente?", "Já aconteceu antes?", "Está tomando algo?"
  3. **Classifica**:
     - **Educativo/leve** → responde dentro do escopo seguro, encerra naturalmente
     - **Indica necessidade de médico** → verifica `tenant_specialties`:
       - Dentro do escopo da clínica → direciona pra clínica
       - Fora do escopo → orienta especialidade genérica (não direciona pra clínica)
     - **Urgência** → FLUXO 6 (imediato)
- **Regra de insistência**: se paciente insiste em prescrição/diagnóstico → "Não posso responder isso, {{nome}}. Fale diretamente com a secretária da {{clínica}}: {{telefone}}"

### FLUXO 5: Detecção de Sinais de Interesse
- **Modo conversacional** (não escala de primeira)
- IA conversa → identifica necessidade → verifica cadastro especialidades:
  - **Dentro do escopo** → "Temos um especialista na {{clínica}} para isso. Fale direto com a secretária: {{telefone_específico ou padrão}}"
  - **Fora do escopo** → "Você precisa agendar com um {{especialidade}} para investigar." (NÃO direciona)
- Keywords comerciais cruzam com `tenant_specialties` em tempo real

### FLUXO 6: Emergência / Escalonamento Imediato
- **Gatilho**: keywords de emergência (modo imediato)
- **Sem perguntas** → "Procure atendimento de urgência imediatamente. Se precisar de ajuda, fale com a secretária da {{clínica}}: {{telefone}}"
- Risco psíquico → tom acolhedor + contato clínica (sempre)

### FLUXO 7: Opt-out
- "Pare" ou variações → msg despedida + `opt_out = true` + `enabled = false`
- "Tudo bem, {{nome}}. Suas mensagens foram desativadas. Se precisar, é só mandar um 'Oi' que reativamos."
- Cessa todos os envios
- Reativação: secretária manual OU paciente manda msg nova

### FLUXO 8: Reclamação / Jurídico
- Keywords operacionais (modo imediato)
- Escala pra humano: "Vou encaminhar sua mensagem para a equipe da {{clínica}}. Alguém entrará em contato em breve."
- Sem resposta automática além disso

---

## 8. TABELA DE KEYWORDS / SINAIS

### Categoria 1: EMERGÊNCIA (modo imediato)

| Subcategoria | Keywords |
|---|---|
| Cardíaco | dor no peito, aperto no peito, infarto, coração acelerado, palpitação forte |
| Respiratório | falta de ar, não consigo respirar, sufocando, chiado forte |
| Neurológico | desmaio, desmaiei, convulsão, confusão mental, perdi a consciência, não enxergo, dormência súbita |
| Sangramento | sangramento intenso, muito sangue, hemorragia, não para de sangrar |
| Reação medicamentosa | inchaço na boca, alergia grave, anafilaxia, não consigo engolir após remédio, corpo todo inchado |
| Psíquico | quero morrer, não aguento mais viver, suicídio, me machucar, acabar com tudo |
| Gestante | perdi líquido, sangramento grávida, contrações fortes, bebê parou de mexer |
| Criança | febre alta criança, criança sem responder, criança convulsionando |
| Geral | piorando rápido, piorou muito, está muito pior, piora súbita |

### Categoria 2: CLÍNICO PROIBIDO (modo conversacional → imediato após insistência)

| Subcategoria | Keywords |
|---|---|
| Diagnóstico | o que eu tenho, qual minha doença, isso é grave, é normal sentir, pode ser câncer, será que é |
| Prescrição | posso tomar, que remédio, qual medicamento, me receita, aumentar dose, diminuir dose, trocar remédio, parar de tomar |
| Exame como conduta | preciso fazer exame, qual exame devo, preciso de ressonância, me pede um exame |
| Interpretação exame | meu exame deu, resultado do exame, está normal meu exame, o que significa esse resultado |
| Prognóstico | vai melhorar, quanto tempo pra curar, vou ficar bom, tem cura, vai piorar |
| Tratamento | qual tratamento, como tratar, melhor tratamento, tratamento alternativo |
| Insistência | mas me diz só isso, só uma dica, ninguém vai saber, me ajuda com esse remédio |

### Categoria 3: SINAIS COMERCIAIS (modo conversacional)

| Subcategoria | Keywords |
|---|---|
| Nova consulta | quero marcar, agendar consulta, retorno, remarcar, voltar ao médico |
| Procedimento | botox, preenchimento, cirurgia, procedimento, harmonização, laser, peeling |
| Indicação | indicar amigo, indicar parente, minha amiga quer, minha mãe precisa |
| Interesse geral | quanto custa, qual o valor, preço, formas de pagamento, parcela, convênio aceita |
| Especialidade | outro especialista, encaminhamento, preciso de ortopedista, dermatologista |

> Cruzam com `tenant_specialties`. Visíveis e editáveis no admin e por clínica.

### Categoria 4: OPT-OUT (modo imediato)

| Keywords |
|---|
| pare, parar, cancelar, não quero mais, sair, remover, descadastrar, desinscrever, para de mandar, chega, bloquear |

### Categoria 5: OPERACIONAL / JURÍDICO (modo imediato)

| Subcategoria | Keywords |
|---|---|
| Reclamação grave | processo, advogado, procon, denúncia, vou processar, reclamar, insatisfeito |
| Prontuário/LGPD | meu prontuário, cópia dos meus dados, apagar meus dados, LGPD, meus direitos |
| Cobrança | cobrança indevida, não era esse valor, me cobraram errado, estorno |

### Regras de processamento
- Match fuzzy (variações, erros de digitação, abreviações WhatsApp)
- Prioridade: Emergência > Clínico proibido > Operacional > Comercial
- Configurável por clínica (admin define padrões, clínica edita)
- Categoria 3 = mais customizável (cada clínica tem seus procedimentos)

---

## 9. ESCOPO DA IA — SYSTEM PROMPT BASE

### Mandato
Você é o Assistente Virtual da {{clínica}}. Seu papel é acolher, informar de forma geral, organizar, lembrar, orientar operacionalmente, apoiar o relacionamento com o paciente e encaminhar para humano quando necessário. Sempre chame o paciente pelo primeiro nome.

### Limite absoluto
Você NÃO é médica. NÃO realiza consulta, NÃO dá diagnóstico, NÃO faz prognóstico, NÃO prescreve, NÃO altera tratamento, NÃO sugere exames como conduta individual, NÃO interpreta exames de forma personalizada, NÃO substitui avaliação médica.

### PODE
- Explicar conceitos gerais de saúde em linguagem simples
- Acolher e ouvir o paciente
- Fazer perguntas de triagem operacional SEM concluir clinicamente
- Informar horários, endereço, convênios, documentos, preparo, fluxos
- Lembrar consulta, retorno, exame, horários de medicação previamente cadastrados
- Repetir orientações JÁ definidas pelo médico (sem alterar)
- Alertar para buscar urgência quando sinais de gravidade
- Coletar interesse em serviços e encaminhar secretária

### NÃO PODE
- Diagnosticar, dar hipótese, excluir doença ou risco
- Prognóstico (evolução, melhora, chance de cura)
- Indicar, trocar, suspender ou alterar dose de medicamento
- Solicitar ou sugerir exames como conduta individual
- Interpretar resultado de exame como laudo
- Dizer "isso é normal", "não é nada", "pode ficar tranquilo", "não precisa ir ao médico"
- Se apresentar como médica
- Prometer cura, resultado garantido, pressionar paciente

### Regra de insistência
Se paciente insiste em perguntas proibidas: "Não posso responder isso, {{nome}}. Fale diretamente com a secretária da {{clínica}}: {{telefone}}"

### Regra de direcionamento
- Especialidade que a clínica ATENDE → "Temos um especialista na {{clínica}} para isso. Fale direto com a secretária: {{telefone}}"
- Especialidade que a clínica NÃO ATENDE → "Você precisa agendar com um {{especialidade}} para investigar seu caso."
- Emergência (sempre) → "Procure atendimento de urgência imediatamente. Se precisar, fale com a secretária da {{clínica}}: {{telefone}}"

### Frases seguras
- "Posso te passar uma orientação geral, mas a avaliação individual precisa ser feita pela equipe médica."
- "Não consigo indicar remédios, exames ou tratamento para o seu caso."
- "Esse ponto precisa ser analisado pelo médico da clínica."
- "Se estiver com piora importante ou sinais de urgência, procure atendimento imediatamente."

### Frases PROIBIDAS
- "Isso é normal." / "Não é nada." / "Pode tomar X." / "Pode ficar tranquilo." / "Seu exame está bom." / "Você não precisa ir ao médico." / "Tome isso e observe."

---

## 10. TEMPLATES WHATSAPP (Meta Business API)

### Estratégia: Mix (variáveis + template curto pra janela 24h)

| ID | Nome | Tipo | Conteúdo |
|---|---|---|---|
| T01 | onboarding_welcome | utility | "Olá {{1}}, sou o Assistente Virtual da {{2}}. Fui criado para te ajudar com dúvidas e acompanhamento do seu tratamento. Salve este número nos seus contatos!" |
| T02 | onboarding_summary | utility | "{{1}}, aqui está um resumo da sua consulta e próximos passos: {{2}}" |
| T03 | followup_medication | utility | "{{1}}, lembrete: está tomando o {{2}} corretamente? Qualquer dúvida, estou aqui." |
| T04 | followup_exam | utility | "{{1}}, conseguiu agendar o exame que foi solicitado? Se precisar de ajuda, me avisa." |
| T05 | followup_return | utility | "{{1}}, lembrete: seu retorno está próximo ({{2}}). Deseja falar com a secretária para agendar?" |
| T06 | followup_inactivity | utility | "Olá {{1}}, tudo bem? Aqui é o Assistente da {{2}}. Como você está se sentindo?" |
| T07 | reopen_conversation | utility | "{{1}}, aqui é o Assistente da {{2}}. Tenho uma mensagem sobre seu acompanhamento. Pode responder?" |
| T08 | optout_farewell | utility | "Tudo bem, {{1}}. Suas mensagens foram desativadas. Se precisar, é só mandar um 'Oi' que reativamos." |
| T09 | birthday | utility | "{{1}}, feliz aniversário! A equipe da {{2}} deseja um dia especial pra você." |

> Botão "Ver variáveis disponíveis" no painel ao criar/editar templates.

---

## 11. SEGURANÇA E COMPLIANCE

### LGPD
- Opt-in explícito no cadastro
- Minimização de dados
- Direito de exclusão total (além do "Pare")
- Base legal: consentimento (CRM) + proteção da vida (alertas)
- Dados sensíveis → proteção reforçada
- Criptografia em trânsito e repouso
- RLS por tenant
- Logs de auditoria completos

### CFM / Ética Médica
- IA = ferramenta de apoio, nunca substituta
- Responsabilidade final sempre do médico
- Paciente informado que interage com assistente virtual
- Export de uso de IA para prontuário

### Auditoria
- Toda operação: data/hora, paciente, assunto, respostas, motivo escalonamento, responsável handoff
- Export disponível no super admin (por clínica e por paciente)

---

## 12. METERING / BILLING

### Trackeado por tenant/mês
- messages_sent, messages_received
- ai_tokens_input, ai_tokens_output
- audio_minutes_processed
- documents_processed, campaigns_sent

### Visibilidade
- Super Admin: vê tudo
- Clínica: NÃO vê (fase 1)

### Futuro
- Planos por funcionalidade + limites de disparo
- Feature flags por plano

---

## 13. FASES DE IMPLEMENTAÇÃO

### FASE 1 — MVP (Piloto 1 clínica)
1. Setup projeto (monorepo, Gstack, configs, design system)
2. Módulo auth + tenant
3. Módulo patient (CRUD + upload docs)
4. Integração Supabase (banco + storage + auth)
5. Integração WhatsApp Meta Cloud API (webhook receive + send)
6. Módulo ai-engine (Agente 1 + Agente 2 + Whisper)
7. Módulo followup (FUP contextual + FUP inatividade)
8. Módulo escalation (keywords + triagem + direcionamento)
9. Painel clínica (Dashboard, Pacientes, Conversas, Configurações, Campanhas placeholder)
10. Painel super admin (básico)
11. Módulo audit (logs + export)
12. Módulo billing (tracking apenas)
13. Templates WhatsApp (submissão Meta)
14. Testes end-to-end
15. Deploy (Vercel + Railway)

### FASE 2 — Expansão
- Campanhas em massa funcional
- Dashboard avançado (RFM simplificado)
- Multi-tenant produção
- Planos e billing real
- Envio de áudio com voz treinada do especialista

### FASE 3 — Escala
- Pré-atendimento / qualificação de leads
- Integrações externas (faturamento, CRM, prontuário)
- Outros nichos (dentistas, fisioterapia, estética, salões)

---

## 14. PRÓXIMOS PASSOS

1. ✅ Fluxos conversacionais definidos
2. ✅ Escopo da IA definido
3. ✅ Stack e arquitetura definidos
4. ✅ Modelo de dados definido
5. ✅ Tabela de keywords definida
6. ✅ Design system definido
7. ✅ Interfaces detalhadas
8. → **Validar este documento**
9. → Criar repo com estrutura Gstack
10. → Gerar OpenAPI spec dos endpoints
11. → Iniciar implementação módulo a módulo no Claude Code
