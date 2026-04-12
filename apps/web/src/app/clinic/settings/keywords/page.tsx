import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { KeywordsClient } from './KeywordsClient'

export default async function ClinicSettingsKeywordsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const { data: keywords } = await supabase
    .from('escalation_keywords')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`)
    .order('is_default', { ascending: false })
    .order('priority', { ascending: true })
    .order('keyword')

  return (
    <>
      <PageHeader title="Keywords de Escalação" breadcrumb={['Clínica', 'Configurações', 'Keywords']} />
      <main className="flex-1 overflow-y-auto p-6">
        <KeywordsClient
          initialKeywords={(keywords ?? []) as Parameters<typeof KeywordsClient>[0]['initialKeywords']}
        />
      </main>
    </>
  )
}
