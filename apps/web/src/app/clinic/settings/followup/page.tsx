import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layouts/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { FollowupClient } from './FollowupClient'

export default async function ClinicSettingsFollowupPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null }>()

  if (!profile?.tenant_id) notFound()

  const [{ data: tenant }, { data: scenarios }] = await Promise.all([
    supabase
      .from('tenants')
      .select('followup_inactivity_enabled, followup_contextual_enabled')
      .eq('id', profile.tenant_id)
      .single<{ followup_inactivity_enabled: boolean; followup_contextual_enabled: boolean }>(),
    supabase
      .from('followup_scenarios')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`)
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  if (!tenant) notFound()

  return (
    <>
      <PageHeader title="Follow-up" breadcrumb={['Clínica', 'Configurações', 'Follow-up']} />
      <main className="flex-1 overflow-y-auto p-6">
        <FollowupClient
          initialScenarios={(scenarios ?? []) as Parameters<typeof FollowupClient>[0]['initialScenarios']}
          inactivityEnabled={tenant.followup_inactivity_enabled}
          contextualEnabled={tenant.followup_contextual_enabled}
        />
      </main>
    </>
  )
}
