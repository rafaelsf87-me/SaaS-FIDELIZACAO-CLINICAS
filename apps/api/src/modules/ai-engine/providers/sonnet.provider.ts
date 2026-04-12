import Anthropic from '@anthropic-ai/sdk'
import type { ILLMProvider, LLMCompletionOptions, LLMCompletionResult } from '../ai-engine.types.js'

// Modelo padrão para Sonnet local — pode ser sobrescrito via env
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

export class SonnetProvider implements ILLMProvider {
  private client: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
    this.client = new Anthropic({ apiKey })
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const { messages, temperature = 0.3, maxTokens = 1024, jsonMode = false } = options

    // Separar system prompt dos demais
    const systemMsg = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    const systemPrompt = systemMsg?.content ?? ''

    const anthropicMessages = userMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // JSON mode: instrução adicional no system para garantir JSON válido
    const effectiveSystem = jsonMode
      ? `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.`
      : systemPrompt

    const createParams = {
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
      ...(effectiveSystem ? { system: effectiveSystem } : {}),
    }

    const response = await this.client.messages.create(createParams)

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
