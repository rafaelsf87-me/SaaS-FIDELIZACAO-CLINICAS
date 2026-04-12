'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { getToken } from '@/lib/patient/helpers'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type KeywordCategory = 'emergency' | 'clinical' | 'commercial' | 'optout' | 'operational'
type KeywordMode = 'immediate' | 'conversational'

interface Keyword {
  id: string
  keyword: string
  category: KeywordCategory
  mode: KeywordMode
  priority: number
  active: boolean
  is_default: boolean
  tenant_id: string | null
}

interface KeywordsClientProps {
  initialKeywords: Keyword[]
}

const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  emergency: 'Emergência',
  clinical: 'Clínico',
  commercial: 'Comercial',
  optout: 'Opt-out',
  operational: 'Operacional',
}

const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  emergency: 'bg-red-50 text-red-700 border-red-200',
  clinical: 'bg-blue-50 text-blue-700 border-blue-200',
  commercial: 'bg-amber-50 text-amber-700 border-amber-300',
  optout: 'bg-gray-100 text-gray-600 border-gray-300',
  operational: 'bg-purple-50 text-purple-700 border-purple-200',
}

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow w-full'

const emptyForm = {
  keyword: '',
  category: 'commercial' as KeywordCategory,
  mode: 'immediate' as KeywordMode,
  priority: 3,
}

const tabTriggerClass =
  'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary px-4 py-2.5 text-sm font-medium border-b-2 transition-colors hover:text-text-primary'

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function KeywordsClient({ initialKeywords }: KeywordsClientProps) {
  const router = useRouter()
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Keyword | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byCategory = (cat: KeywordCategory) => keywords.filter((k) => k.category === cat)

  function openCreate(cat: KeywordCategory = 'commercial') {
    setEditing(null)
    setForm({ ...emptyForm, category: cat })
    setError(null)
    setOpen(true)
  }

  function openEdit(kw: Keyword) {
    setEditing(kw)
    setForm({
      keyword: kw.keyword,
      category: kw.category,
      mode: kw.mode,
      priority: kw.priority,
    })
    setError(null)
    setOpen(true)
  }

  async function handlePersonalize(kw: Keyword) {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/escalation-keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            keyword: kw.keyword,
            category: kw.category,
            mode: kw.mode,
            priority: kw.priority,
          }),
        },
      )
      if (res.ok) {
        const { data } = await res.json()
        setKeywords((prev) => [...prev, data])
        router.refresh()
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/escalation-keywords/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/escalation-keywords`
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `Erro (${res.status})`)
        return
      }

      const { data } = await res.json()
      if (editing) {
        setKeywords((prev) => prev.map((k) => (k.id === editing.id ? data : k)))
      } else {
        setKeywords((prev) => [...prev, data])
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(keywordId: string) {
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/escalation-keywords/${keywordId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) {
        setKeywords((prev) => prev.filter((k) => k.id !== keywordId))
        router.refresh()
      }
    } catch {
      // silent
    }
  }

  function CategoryTable({ category }: { category: KeywordCategory }) {
    const items = byCategory(category)
    const isCommercial = category === 'commercial'

    return (
      <div className="flex flex-col gap-3 pt-4">
        {isCommercial && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="shrink-0">💡</span>
            <span>
              As keywords comerciais são as mais customizáveis. Use-as para identificar interesse em
              produtos, planos e serviços específicos da sua clínica.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">{items.length} keyword{items.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => openCreate(category)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova keyword
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary">
            Nenhuma keyword nesta categoria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Keyword</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary hidden md:table-cell">Modo</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary hidden lg:table-cell">Prioridade</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {items.map((kw) => (
                  <tr key={kw.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary font-mono">{kw.keyword}</span>
                        {kw.is_default && (
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                            Padrão
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden md:table-cell capitalize">
                      {kw.mode === 'immediate' ? 'Imediato' : 'Conversacional'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={`h-2 w-2 rounded-full ${
                              n <= kw.priority ? 'bg-primary' : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                        kw.active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-surface text-text-secondary border-border'
                      }`}>
                        {kw.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {kw.is_default ? (
                          <button
                            onClick={() => handlePersonalize(kw)}
                            disabled={loading}
                            title="Criar cópia personalizada"
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary border border-border hover:bg-surface disabled:opacity-50 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Personalizar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(kw)}
                              className="rounded p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                              aria-label={`Editar ${kw.keyword}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <AlertDialog.Root>
                              <AlertDialog.Trigger asChild>
                                <button
                                  className="rounded p-1.5 text-text-secondary hover:bg-red-50 hover:text-danger transition-colors"
                                  aria-label={`Remover ${kw.keyword}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialog.Trigger>
                              <AlertDialog.Portal>
                                <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                                <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl bg-background shadow-xl p-6">
                                  <AlertDialog.Title className="text-base font-semibold text-text-primary mb-2">
                                    Remover keyword
                                  </AlertDialog.Title>
                                  <AlertDialog.Description className="text-sm text-text-secondary mb-5">
                                    Remover <strong>{kw.keyword}</strong>?
                                  </AlertDialog.Description>
                                  <div className="flex justify-end gap-3">
                                    <AlertDialog.Cancel asChild>
                                      <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                                        Cancelar
                                      </button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action asChild>
                                      <button
                                        onClick={() => handleDelete(kw.id)}
                                        className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                                      >
                                        Remover
                                      </button>
                                    </AlertDialog.Action>
                                  </div>
                                </AlertDialog.Content>
                              </AlertDialog.Portal>
                            </AlertDialog.Root>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <Tabs.Root defaultValue="emergency">
        <Tabs.List className="flex border-b border-border overflow-x-auto">
          {(Object.keys(CATEGORY_LABELS) as KeywordCategory[]).map((cat) => (
            <Tabs.Trigger key={cat} value={cat} className={tabTriggerClass}>
              <span className="flex items-center gap-1.5">
                {CATEGORY_LABELS[cat]}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium border ${CATEGORY_COLORS[cat]}`}>
                  {byCategory(cat).length}
                </span>
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {(Object.keys(CATEGORY_LABELS) as KeywordCategory[]).map((cat) => (
          <Tabs.Content key={cat} value={cat}>
            <CategoryTable category={cat} />
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl p-6">
            <Dialog.Title className="text-base font-semibold text-text-primary mb-4">
              {editing ? 'Editar keyword' : 'Nova keyword'}
            </Dialog.Title>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <FieldLabel label="Keyword *" htmlFor="kw-word" description="Palavra ou expressão que aciona o fluxo" example="cirurgia, emergência, cancelar">
                <input id="kw-word" value={form.keyword} onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))} required className={inputClass} />
              </FieldLabel>

              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label="Categoria" htmlFor="kw-cat" description="" example="">
                  <select id="kw-cat" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as KeywordCategory }))} className={inputClass}>
                    {(Object.entries(CATEGORY_LABELS) as [KeywordCategory, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Modo" htmlFor="kw-mode" description="" example="">
                  <select id="kw-mode" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as KeywordMode }))} className={inputClass}>
                    <option value="immediate">Imediato</option>
                    <option value="conversational">Conversacional</option>
                  </select>
                </FieldLabel>
              </div>

              <FieldLabel label="Prioridade (1–5)" htmlFor="kw-priority" description="1 = mais alta, 5 = mais baixa" example="3">
                <input id="kw-priority" type="number" min={1} max={5} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} className={inputClass} />
              </FieldLabel>

              {error && (
                <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface transition-colors">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Salvando...' : editing ? 'Salvar' : 'Criar keyword'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
