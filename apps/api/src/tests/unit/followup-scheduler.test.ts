import { describe, it, expect } from 'vitest'
import {
  buildMessageText,
  addBusinessDays,
} from '../../modules/followup/followup.scheduler.js'

describe('addBusinessDays', () => {
  // Usar new Date(ano, mês-1, dia, 12) para evitar problemas de timezone (local noon)

  it('pula sábado ao avançar 1 dia a partir de sexta', () => {
    const friday = new Date(2026, 3, 10, 12, 0, 0) // 10 abr 2026 = sexta
    expect(friday.getDay()).toBe(5) // sanity check
    const result = addBusinessDays(friday, 1)
    expect(result.getDay()).toBe(1) // segunda-feira
  })

  it('pula fim de semana completo ao avançar 1 dia a partir de sábado', () => {
    const saturday = new Date(2026, 3, 11, 12, 0, 0) // 11 abr 2026 = sábado
    expect(saturday.getDay()).toBe(6) // sanity check
    const result = addBusinessDays(saturday, 1)
    expect(result.getDay()).toBe(1) // segunda-feira
  })

  it('avança 5 dias úteis saindo de segunda resulta na segunda seguinte', () => {
    const monday = new Date(2026, 3, 13, 12, 0, 0) // 13 abr 2026 = segunda
    expect(monday.getDay()).toBe(1) // sanity check
    const result = addBusinessDays(monday, 5)
    expect(result.getDay()).toBe(1) // segunda-feira seguinte
  })

  it('avança 0 dias retorna a mesma data (sem modificar)', () => {
    const date = new Date(2026, 3, 14, 12, 0, 0) // terça
    const result = addBusinessDays(date, 0)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // abril
    expect(result.getDate()).toBe(14)
  })

  it('avança 2 dias úteis saindo de quinta resulta em segunda (pula fim de semana)', () => {
    const thursday = new Date(2026, 3, 9, 12, 0, 0) // 9 abr 2026 = quinta
    expect(thursday.getDay()).toBe(4) // sanity check
    const result = addBusinessDays(thursday, 2)
    // quinta + 1 = sexta; sexta + 1 = segunda (pula sábado e domingo)
    expect(result.getDay()).toBe(1) // segunda
  })
})

describe('buildMessageText', () => {
  describe('inatividade', () => {
    it('gera mensagem curta para inatividade de 7 dias', () => {
      const msg = buildMessageText('custom', 'inactivity', { inactivity_days: 7 }, 'Maria')
      expect(msg).toContain('Maria')
      expect(msg).toContain('consulta')
    })

    it('gera mensagem diferente para inatividade de 15 dias', () => {
      const msg = buildMessageText('custom', 'inactivity', { inactivity_days: 15 }, 'João')
      expect(msg).toContain('João')
      expect(msg).toContain('tratamento')
    })

    it('gera mensagem de reativação para inatividade > 15 dias', () => {
      const msg = buildMessageText('custom', 'inactivity', { inactivity_days: 30 }, 'Ana')
      expect(msg).toContain('Ana')
      expect(msg).toContain('retorno')
    })

    it('usa nome padrão quando firstName está vazio', () => {
      const msg = buildMessageText('custom', 'inactivity', { inactivity_days: 7 }, '')
      expect(msg).toContain('paciente')
    })
  })

  describe('medicamento', () => {
    it('inclui nome do medicamento e progresso na mensagem', () => {
      const msg = buildMessageText(
        'medication',
        'contextual',
        { medication_name: 'Amoxicilina', sequence: 2, total: 5 },
        'Carlos',
      )
      expect(msg).toContain('Carlos')
      expect(msg).toContain('Amoxicilina')
      expect(msg).toContain('2/5')
    })

    it('usa fallback quando medication_name não está no detail', () => {
      const msg = buildMessageText('medication', 'contextual', {}, 'Pedro')
      expect(msg).toContain('Pedro')
      expect(msg).toContain('seu medicamento')
    })
  })

  describe('exame', () => {
    it('inclui nome do exame na mensagem', () => {
      const msg = buildMessageText(
        'exam',
        'contextual',
        { exam_name: 'Hemograma Completo' },
        'Lucia',
      )
      expect(msg).toContain('Lucia')
      expect(msg).toContain('Hemograma Completo')
    })
  })

  describe('retorno', () => {
    it('inclui especialidade quando informada', () => {
      const msg = buildMessageText(
        'return',
        'contextual',
        { specialty: 'Cardiologia' },
        'Roberto',
      )
      expect(msg).toContain('Roberto')
      expect(msg).toContain('Cardiologia')
    })

    it('gera mensagem genérica quando especialidade não informada', () => {
      const msg = buildMessageText('return', 'contextual', {}, 'Fernanda')
      expect(msg).toContain('Fernanda')
      expect(msg).toContain('retorno médico')
    })
  })

  describe('tipo desconhecido', () => {
    it('retorna mensagem genérica para tipo não mapeado', () => {
      const msg = buildMessageText('unknown_type', 'contextual', {}, 'Teste')
      expect(msg).toContain('Teste')
      expect(msg).toContain('recado da clínica')
    })
  })
})
