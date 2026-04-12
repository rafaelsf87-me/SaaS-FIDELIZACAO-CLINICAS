import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { ContactsClient } from './ContactsClient'

export default async function ClinicSettingsContactsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: contacts } = await supabase
    .from('tenant_contacts')
    .select('id, label, phone_number, whatsapp_number, scope_description, is_default, active')
    .eq('tenant_id', profile.tenant_id)
    .order('is_default', { ascending: false })

  return (
    <>
      <PageHeader title="Contatos" breadcrumb={['Clínica', 'Configurações', 'Contatos']} />
      <main className="flex-1 overflow-y-auto p-6">
        <ContactsClient initialContacts={contacts ?? []} />
      </main>
    </>
  )
}
