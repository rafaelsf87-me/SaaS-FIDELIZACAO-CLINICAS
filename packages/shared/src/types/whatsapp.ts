export type TemplateCategory = 'utility' | 'marketing'
export type TemplateMetaStatus = 'pending' | 'approved' | 'rejected'

export interface WhatsappTemplate {
  id: string
  tenant_id: string
  template_name: string
  template_body: string
  variables: Array<{ name: string; description: string }>
  category: TemplateCategory
  meta_status: TemplateMetaStatus
  created_at: string
}
