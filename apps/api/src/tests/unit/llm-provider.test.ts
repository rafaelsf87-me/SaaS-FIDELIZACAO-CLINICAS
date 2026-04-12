import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getInteractionProvider, getAnalysisProvider, resetProviders } from '../../modules/ai-engine/llm-provider.js'

// Providers são usados com `new`, então o mock precisa ser uma classe
vi.mock('../../modules/ai-engine/providers/sonnet.provider.js', () => ({
  SonnetProvider: vi.fn().mockImplementation(function () {
    return { complete: vi.fn() }
  }),
}))

vi.mock('../../modules/ai-engine/providers/openai.provider.js', () => ({
  OpenAIProvider: vi.fn().mockImplementation(function () {
    return { complete: vi.fn() }
  }),
}))

describe('LLM Provider Factory', () => {
  beforeEach(() => {
    resetProviders()
    delete process.env['LLM_PROVIDER']
  })

  afterEach(() => {
    resetProviders()
    delete process.env['LLM_PROVIDER']
  })

  describe('getInteractionProvider', () => {
    it('cria instância via SonnetProvider quando LLM_PROVIDER não está definido', async () => {
      const { SonnetProvider } = await import('../../modules/ai-engine/providers/sonnet.provider.js')
      const provider = getInteractionProvider()
      expect(provider).toBeDefined()
      expect(SonnetProvider).toHaveBeenCalledTimes(1)
    })

    it('cria instância via SonnetProvider quando LLM_PROVIDER=sonnet', async () => {
      process.env['LLM_PROVIDER'] = 'sonnet'
      const { SonnetProvider } = await import('../../modules/ai-engine/providers/sonnet.provider.js')
      const provider = getInteractionProvider()
      expect(provider).toBeDefined()
      expect(SonnetProvider).toHaveBeenCalled()
    })

    it('cria instância via OpenAIProvider quando LLM_PROVIDER=openai', async () => {
      process.env['LLM_PROVIDER'] = 'openai'
      const { OpenAIProvider } = await import('../../modules/ai-engine/providers/openai.provider.js')
      const provider = getInteractionProvider()
      expect(provider).toBeDefined()
      expect(OpenAIProvider).toHaveBeenCalled()
    })

    it('retorna singleton — mesma instância em chamadas subsequentes', () => {
      const p1 = getInteractionProvider()
      const p2 = getInteractionProvider()
      expect(p1).toBe(p2)
    })
  })

  describe('getAnalysisProvider', () => {
    it('cria instância via SonnetProvider por padrão', async () => {
      const { SonnetProvider } = await import('../../modules/ai-engine/providers/sonnet.provider.js')
      const provider = getAnalysisProvider()
      expect(provider).toBeDefined()
      expect(SonnetProvider).toHaveBeenCalled()
    })

    it('cria instância via OpenAIProvider quando LLM_PROVIDER=openai', async () => {
      process.env['LLM_PROVIDER'] = 'openai'
      const { OpenAIProvider } = await import('../../modules/ai-engine/providers/openai.provider.js')
      const provider = getAnalysisProvider()
      expect(provider).toBeDefined()
      expect(OpenAIProvider).toHaveBeenCalled()
    })

    it('retorna singleton — mesma instância em chamadas subsequentes', () => {
      const p1 = getAnalysisProvider()
      const p2 = getAnalysisProvider()
      expect(p1).toBe(p2)
    })
  })

  describe('resetProviders', () => {
    it('força nova instância após reset', () => {
      const p1 = getInteractionProvider()
      resetProviders()
      const p2 = getInteractionProvider()
      // Após reset cria nova instância (referência diferente)
      expect(p1).not.toBe(p2)
    })
  })
})
