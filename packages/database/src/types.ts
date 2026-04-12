// Tipos gerados do schema Supabase — será populado na Etapa 2
// com: supabase gen types typescript --project-id <id> > packages/database/src/types.ts

export interface Database {
  public: {
    Tables: Record<string, unknown>
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
    Enums: Record<string, unknown>
  }
}
