import type { AppSettings } from '@shared/domain'
import type { LLMClient } from './types'
import { AnthropicClient } from './AnthropicClient'
import { OpenAICompatibleClient } from './OpenAICompatibleClient'

export * from './types'

export function createLLMClient(settings: AppSettings): LLMClient {
  return settings.llm.provider === 'openai-compatible'
    ? new OpenAICompatibleClient(settings)
    : new AnthropicClient(settings)
}

/** Robust extraction of a JSON value embedded in model prose. */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  if (!text) return null
  // Strip code fences.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  // Try direct parse first.
  try {
    return JSON.parse(candidate) as T
  } catch {
    // Fall back to the first balanced { ... } or [ ... ] span.
    const span = extractBalanced(candidate)
    if (span) {
      try {
        return JSON.parse(span) as T
      } catch {
        return null
      }
    }
    return null
  }
}

function extractBalanced(text: string): string | null {
  const startObj = text.indexOf('{')
  const startArr = text.indexOf('[')
  let start = -1
  let open = '{'
  let close = '}'
  if (startObj === -1 && startArr === -1) return null
  if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
    start = startObj
    open = '{'
    close = '}'
  } else {
    start = startArr
    open = '['
    close = ']'
  }
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}
