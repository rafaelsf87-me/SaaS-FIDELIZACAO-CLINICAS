export const WHATSAPP_TEMPLATES = {
  ONBOARDING_WELCOME: 'onboarding_welcome',
  ONBOARDING_SUMMARY: 'onboarding_summary',
  FOLLOWUP_MEDICATION: 'followup_medication',
  FOLLOWUP_EXAM: 'followup_exam',
  FOLLOWUP_RETURN: 'followup_return',
  FOLLOWUP_INACTIVITY: 'followup_inactivity',
  REOPEN_CONVERSATION: 'reopen_conversation',
  OPTOUT_FAREWELL: 'optout_farewell',
  BIRTHDAY: 'birthday',
} as const

export const FOLLOWUP_INACTIVITY_SCHEDULE = [7, 15, 30] as const

export const MAX_LOGO_SIZE_BYTES = 200 * 1024 // 200KB
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_CONVERSATION_HISTORY = 10

export const BUSINESS_DAYS = [1, 2, 3, 4, 5] as const // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sáb

export const ONBOARDING_SUMMARY_DELAY_MINUTES = 30
