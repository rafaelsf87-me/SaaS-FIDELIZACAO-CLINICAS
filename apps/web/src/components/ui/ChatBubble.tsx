'use client'

import { Mic, AlertTriangle, FileText, Check, CheckCheck } from 'lucide-react'

export interface ChatBubbleProps {
  direction: 'inbound' | 'outbound'
  content: string | null
  timestamp: string
  status?: 'sent' | 'delivered' | 'read' | 'failed' | undefined
  messageType: 'text' | 'template' | 'audio' | 'media'
  audioTranscription?: string | null
  isEscalation?: boolean
  escalationReason?: string | null
}

function DeliveryStatus({ status }: { status?: ChatBubbleProps['status'] }) {
  if (!status) return null
  if (status === 'sent') return <Check className="h-3 w-3 text-white/60" />
  if (status === 'failed') return <Check className="h-3 w-3 text-danger" />
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-white/60" />
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-sky-300" />
  return null
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ChatBubble({
  direction,
  content,
  timestamp,
  status,
  messageType,
  audioTranscription,
  isEscalation,
  escalationReason,
}: ChatBubbleProps) {
  const isOutbound = direction === 'outbound'

  // Escalation card — inline, independente de direção
  if (isEscalation) {
    return (
      <div className="flex justify-center my-2 px-4">
        <div className="flex items-start gap-2 rounded-lg border border-escalated/40 bg-orange-50 px-4 py-3 max-w-sm w-full text-sm">
          <AlertTriangle className="h-4 w-4 text-escalated mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-escalated">Conversa escalada</p>
            {escalationReason && (
              <p className="text-text-secondary mt-0.5">{escalationReason}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-4 my-1`}>
      <div
        className={`
          relative max-w-[75%] rounded-2xl px-3 py-2 text-sm
          ${isOutbound
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-surface border border-border text-text-primary rounded-bl-sm'
          }
          ${messageType === 'template'
            ? isOutbound
              ? 'border border-white/20'
              : 'border border-primary/20'
            : ''
          }
        `}
      >
        {/* Template label */}
        {messageType === 'template' && (
          <div className={`flex items-center gap-1 mb-1 text-xs ${isOutbound ? 'text-white/70' : 'text-text-secondary'}`}>
            <FileText className="h-3 w-3" />
            <span>template</span>
          </div>
        )}

        {/* Audio */}
        {messageType === 'audio' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Mic className={`h-4 w-4 ${isOutbound ? 'text-white' : 'text-text-secondary'}`} />
              <span className={`text-xs ${isOutbound ? 'text-white/70' : 'text-text-secondary'}`}>
                Mensagem de áudio
              </span>
            </div>
            {audioTranscription && (
              <p className={`italic text-xs mt-1 ${isOutbound ? 'text-white/80' : 'text-text-secondary'}`}>
                "{audioTranscription}"
              </p>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        )}

        {/* Footer: timestamp + status */}
        <div className={`flex items-center gap-1 mt-1 justify-end ${isOutbound ? 'text-white/60' : 'text-text-secondary'} text-[10px]`}>
          <span>{formatTime(timestamp)}</span>
          {isOutbound && <DeliveryStatus status={status} />}
        </div>
      </div>
    </div>
  )
}
