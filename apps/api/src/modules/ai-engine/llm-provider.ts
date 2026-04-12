import type { ILLMProvider } from './ai-engine.types.js'
import { SonnetProvider } from './providers/sonnet.provider.js'
import { OpenAIProvider } from './providers/openai.provider.js'

// ---------------------------------------------------------------------------
// Factory — retorna o provider correto baseado em LLM_PROVIDER env var
// LLM_PROVIDER=sonnet  → Anthropic Claude (padrão local)
// LLM_PROVIDER=openai  → OpenAI GPT
// ---------------------------------------------------------------------------

let _interactionProvider: ILLMProvider | null = null
let _analysisProvider: ILLMProvider | null = null

export function getInteractionProvider(): ILLMProvider {
  if (!_interactionProvider) {
    const provider = process.env.LLM_PROVIDER ?? 'sonnet'
    _interactionProvider =
      provider === 'openai'
        ? new OpenAIProvider('interaction')
        : new SonnetProvider()
  }
  return _interactionProvider
}

export function getAnalysisProvider(): ILLMProvider {
  if (!_analysisProvider) {
    const provider = process.env.LLM_PROVIDER ?? 'sonnet'
    // Agent 1 (análise de documentos) usa modelo mais capaz quando disponível
    _analysisProvider =
      provider === 'openai'
        ? new OpenAIProvider('analysis')
        : new SonnetProvider()
  }
  return _analysisProvider
}

// Reset de singletons (útil em testes)
export function resetProviders(): void {
  _interactionProvider = null
  _analysisProvider = null
}
