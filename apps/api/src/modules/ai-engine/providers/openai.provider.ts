import OpenAI from 'openai'
import type { ILLMProvider, LLMCompletionOptions, LLMCompletionResult } from '../ai-engine.types.js'

// Modelos para interação e análise de documentos
const OPENAI_MODEL_INTERACTION = process.env.OPENAI_MODEL_INTERACTION ?? 'gpt-4o-mini'
const OPENAI_MODEL_ANALYSIS = process.env.OPENAI_MODEL_ANALYSIS ?? 'gpt-4o'

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI
  /** 'interaction' usa gpt-4o-mini; 'analysis' usa gpt-4o */
  private modelVariant: 'interaction' | 'analysis'

  constructor(modelVariant: 'interaction' | 'analysis' = 'interaction') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    this.client = new OpenAI({ apiKey })
    this.modelVariant = modelVariant
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const { messages, temperature = 0.3, maxTokens = 1024, jsonMode = false } = options

    const model =
      this.modelVariant === 'analysis' ? OPENAI_MODEL_ANALYSIS : OPENAI_MODEL_INTERACTION

    const openaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: openaiMessages,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

    const content = response.choices[0]?.message?.content ?? ''

    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    }
  }
}
