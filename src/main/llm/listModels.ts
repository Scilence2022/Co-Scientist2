import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider } from '@shared/domain'
import type { ModelListResult } from '@shared/ipc'

/**
 * Refresh a provider's available models using its credentials.
 *
 *   - Anthropic → the native SDK's `models.list()`.
 *   - everything else → `GET {baseUrl}/models` (the OpenAI-compatible models
 *     endpoint), tolerating both `{ data: [...] }` and `{ models: [...] }`
 *     response shapes and string-or-object entries.
 *
 * Doubles as a connectivity check: a successful refresh proves the key + base
 * URL reach the provider.
 */
export async function listModels(
  provider: LLMProvider,
  apiKey: string,
  baseUrl: string
): Promise<ModelListResult> {
  try {
    if (provider === 'anthropic') {
      if (!apiKey.trim()) return { ok: false, models: [], message: 'API key required' }
      const client = new Anthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) })
      const res = await client.models.list({ limit: 1000 })
      const models = res.data.map((m) => m.id).sort()
      return { ok: true, models, message: `${models.length} models` }
    }

    const root = baseUrl.trim().replace(/\/$/, '')
    if (!root) return { ok: false, models: [], message: 'No base URL configured' }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey}`

    const res = await fetch(`${root}/models`, { headers })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, models: [], message: `HTTP ${res.status}: ${text || res.statusText}` }
    }
    const json: any = await res.json()
    const raw: unknown[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.models)
        ? json.models
        : Array.isArray(json)
          ? json
          : []
    const models = Array.from(
      new Set(
        raw
          .map((m: any) => (typeof m === 'string' ? m : (m?.id ?? m?.name)))
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      )
    ).sort()
    if (!models.length) return { ok: false, models: [], message: 'No models returned' }
    return { ok: true, models, message: `${models.length} models` }
  } catch (err) {
    return { ok: false, models: [], message: err instanceof Error ? err.message : String(err) }
  }
}
