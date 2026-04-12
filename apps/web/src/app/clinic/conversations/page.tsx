import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { ConversationsClient, type ConversationsClientProps } from './ConversationsClient'

export default async function ClinicConversationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: conversations } = await supabase
    .from('conversations')
    .select(
      `id, status, escalation_reason, escalated_to, last_message_at, created_at,
       patient:patients(id, name, first_name, phone_whatsapp, health_plan)`,
    )
    .eq('tenant_id', profile.tenant_id)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  return (
    <>
      <PageHeader title="Conversas" breadcrumb={['Clínica', 'Conversas']} />
      <main className="flex-1 min-h-0 overflow-hidden p-6">
        <ConversationsClient initialConversations={(conversations ?? []) as unknown as ConversationsClientProps['initialConversations']} />
      </main>
    </>
  )
}
