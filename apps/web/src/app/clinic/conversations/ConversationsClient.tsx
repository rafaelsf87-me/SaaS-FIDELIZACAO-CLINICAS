'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MessageSquare, UserCheck, X, ChevronRight } from 'lucide-react'
import { ChatBubble } from '@/components/ui/ChatBubble'
import { getToken } from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type ConversationStatus = 'active' | 'closed' | 'escalated'

interface Patient {
  id: string
  name: string
  first_name: string
  phone_whatsapp: string
  health_plan?: string | null
}

interface Conversation {
  id: string
  status: ConversationStatus
  escalation_reason: string | null
  escalated_to: string | null
  last_message_at: string | null
  created_at: string
  patient: Patient
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  content: string | null
  message_type: 'text' | 'template' | 'audio' | 'media'
  audio_transcription: string | null
  wa_status: 'sent' | 'delivered' | 'read' | 'failed' | null
  created_at: string
}

export interface ConversationsClientProps {
  initialConversations: Conversation[]
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const STATUS_BADGE: Record<ConversationStatus, { label: string; className: string }> = {
  active:    { label: 'Ativa',    className: 'bg-green-50 text-success border-green-200' },
  escalated: { label: 'Escalada', className: 'bg-orange-50 text-escalated border-orange-200' },
  closed:    { label: 'Fechada',  className: 'bg-surface text-text-secondary border-border' },
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const { patient, status, last_message_at } = conversation
  const badge = STATUS_BADGE[status]

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 border-b border-border transition-colors
        hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary
        ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
        ${status === 'escalated' ? 'border-l-2 border-l-escalated' : ''}
        ${status === 'closed' ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-text-primary truncate">{patient.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-[10px] text-text-secondary mt-0.5">
          {relativeTime(last_message_at)}
        </div>
      </div>
    </button>
  )
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function ConversationsClient({ initialConversations }: ConversationsClientProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | ''>('')
  const [takingOver, setTakingOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Carrega mensagens da conversa selecionada
  const loadMessages = useCallback(async (conversationId: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    setLoadingMessages(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations/${conversationId}/messages?limit=100`,
        { headers: { Authorization: `Bearer ${token}` }, signal },
      )
      if (!res.ok) { setMessages([]); return }
      const { data } = await res.json()
      setMessages(data ?? [])
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId, loadMessages])

  // Takeover
  async function handleTakeover() {
    if (!selectedId) return
    setTakingOver(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations/${selectedId}/takeover`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return
      const { data } = await res.json()
      // Merge seletivo: data do backend não inclui JOIN patient, evitar sobrescrever
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, status: data.status as ConversationStatus, escalated_to: data.escalated_to as string | null }
            : c,
        ),
      )
    } finally {
      setTakingOver(false)
    }
  }

  // Fechar conversa
  async function handleClose() {
    if (!selectedId) return
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations/${selectedId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'closed' }),
        },
      )
      if (!res.ok) return
      // Merge seletivo: data do backend não inclui JOIN patient
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, status: 'closed' as ConversationStatus }
            : c,
        ),
      )
    } catch { /* noop */ }
  }

  // Filtros client-side
  const filtered = conversations.filter((c) => {
    const matchesStatus = statusFilter === '' || c.status === statusFilter
    const matchesSearch =
      search === '' || c.patient.name.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex h-full min-h-0 gap-0 rounded-lg border border-border overflow-hidden bg-background">
      {/* ===== PAINEL ESQUERDO — Lista ===== */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-background">
        {/* Filtros */}
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | '')}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="escalated">Escaladas</option>
            <option value="closed">Fechadas</option>
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
              <MessageSquare className="h-8 w-8 text-text-secondary opacity-30" />
              <p className="text-sm text-text-secondary">Nenhuma conversa encontrada.</p>
              {(search || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('') }}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>

        {/* Counter */}
        <div className="px-4 py-2 border-t border-border text-xs text-text-secondary">
          {filtered.length} conversa{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ===== PAINEL DIREITO — Detalhe ===== */}
      {selected ? (
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary truncate">
                    {selected.patient.name}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[selected.status].className}`}
                  >
                    {STATUS_BADGE[selected.status].label}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{selected.patient.phone_whatsapp}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Ver paciente */}
              <button
                onClick={() => router.push(`/clinic/patients/${selected.patient.id}`)}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface transition-colors"
              >
                Ver paciente
                <ChevronRight className="h-3 w-3" />
              </button>

              {/* Assumir conversa */}
              {selected.status !== 'closed' && (
                <button
                  onClick={handleTakeover}
                  disabled={takingOver}
                  className="flex items-center gap-1 rounded-md bg-escalated/10 border border-escalated/20 px-3 py-1.5 text-xs font-medium text-escalated hover:bg-escalated/20 transition-colors disabled:opacity-50"
                >
                  <UserCheck className="h-3 w-3" />
                  {takingOver ? 'Assumindo...' : 'Assumir'}
                </button>
              )}

              {/* Fechar conversa */}
              {selected.status !== 'closed' && (
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface hover:text-danger transition-colors"
                  title="Fechar conversa"
                >
                  <X className="h-3 w-3" />
                  Fechar
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto py-3 bg-slate-50">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-text-secondary animate-pulse">Carregando mensagens...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                <MessageSquare className="h-10 w-10 text-text-secondary opacity-20" />
                <p className="text-sm text-text-secondary">Nenhuma mensagem nesta conversa.</p>
              </div>
            ) : (
              <>
                {/* Indicador de escalação no topo se houver motivo */}
                {selected.status === 'escalated' && selected.escalation_reason && (
                  <ChatBubble
                    direction="outbound"
                    content={null}
                    timestamp={selected.last_message_at ?? ''}
                    messageType="text"
                    isEscalation
                    escalationReason={selected.escalation_reason}
                  />
                )}

                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    direction={msg.direction}
                    content={msg.content}
                    timestamp={msg.created_at}
                    status={msg.wa_status ?? undefined}
                    messageType={msg.message_type}
                    audioTranscription={msg.audio_transcription}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
            <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-secondary flex items-center gap-2 cursor-not-allowed select-none">
              <MessageSquare className="h-4 w-4 opacity-40 shrink-0" />
              <span>
                {selected.status === 'closed'
                  ? 'Conversa encerrada.'
                  : selected.escalated_to
                    ? 'Secretária assumiu — resposta manual disponível em breve.'
                    : 'IA respondendo automaticamente — assuma para responder manualmente.'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state — nenhuma conversa selecionada */
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <MessageSquare className="h-12 w-12 text-text-secondary opacity-20" />
          <p className="text-text-secondary text-sm">Selecione uma conversa para visualizar.</p>
        </div>
      )}
    </div>
  )
}
