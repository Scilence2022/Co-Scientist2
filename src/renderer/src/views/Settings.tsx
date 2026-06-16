import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { IconCheck, IconRefresh } from '../components/Icons'
import { AGENT_LABELS, type AgentRole, type AppSettings, type LLMProvider } from '@shared/domain'
import { modelCapabilities } from '@shared/models'
import type { LlmPingResult, McpTestResult } from '@shared/ipc'
import {
  PROVIDERS,
  PROVIDER_GROUP_LABEL,
  PROVIDER_GROUP_ORDER,
  defaultFastTierModel,
  defaultHighTierModel,
  getProvider,
  type ModelPreset,
  type ProviderDefinition,
  type ProviderGroup
} from '@shared/providers'

const OVERRIDABLE: AgentRole[] = ['generation', 'reflection', 'ranking', 'proximity', 'evolution', 'meta-review']

/** Human-readable token count, e.g. 128000 → "128K", 1000000 → "1M". */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function ModelLimitsHint({ model }: { model: string }): JSX.Element {
  const caps = modelCapabilities(model)
  return (
    <span className="hint">
      Detected limits: {fmtTokens(caps.contextWindow)} context · {fmtTokens(caps.maxOutput)} max output. Requests are clamped to
      this automatically.
    </span>
  )
}

export function Settings(): JSX.Element {
  const { settings, setSettings } = useStore()
  const [draft, setDraft] = useState<AppSettings | null>(settings ? structuredClone(settings) : null)
  const [saved, setSaved] = useState(false)
  const [tests, setTests] = useState<Record<string, McpTestResult | 'loading'>>({})
  const [llmTest, setLlmTest] = useState<LlmPingResult | 'loading' | null>(null)

  // Reset the LLM ping result whenever the user changes provider / config so
  // stale green badges don't linger.
  useEffect(() => {
    if (!draft) return
    setLlmTest(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.llm.provider])

  const provider = useMemo<ProviderDefinition | undefined>(
    () => (draft ? getProvider(draft.llm.provider) : undefined),
    [draft?.llm.provider]
  )

  if (!draft) return <div className="page">Loading…</div>

  const patch = (fn: (d: AppSettings) => void) => {
    const next = structuredClone(draft)
    fn(next)
    setDraft(next)
    setSaved(false)
  }

  /** Update provider + auto-populate baseUrl / tier models with the provider defaults. */
  const setProvider = (id: LLMProvider) => {
    const p = getProvider(id)
    if (!p) return
    patch((d) => {
      d.llm.provider = id
      // Reset baseUrl to provider default unless user has manually set one
      // for the *previous* provider — either way, switching providers
      // re-applies the default. (User can still override afterwards.)
      d.llm.baseUrl = p.baseUrl || undefined
      d.llm.tiers.highTierModel = defaultHighTierModel(p)
      d.llm.tiers.fastTierModel = defaultFastTierModel(p)
      // Clear per-agent overrides to avoid leaking incompatible model ids.
      d.llm.overrides = {}
    })
  }

  const save = async () => {
    const result = await window.api.saveSettings(draft)
    setSettings(result)
    setDraft(structuredClone(result))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const testMcp = async (server: 'deepResearch' | 'codexomics') => {
    await window.api.saveSettings(draft)
    setSettings(draft)
    setTests((t) => ({ ...t, [server]: 'loading' }))
    const res = await window.api.testMcp(server)
    setTests((t) => ({ ...t, [server]: res }))
  }

  const testLlm = async () => {
    await window.api.saveSettings(draft)
    setSettings(draft)
    setLlmTest('loading')
    const res = await window.api.pingLlm()
    setLlmTest(res)
  }

  const groupedProviders = useMemo(() => {
    const out: Record<ProviderGroup, ProviderDefinition[]> = {
      official: [],
      'openai-compatible': [],
      regional: [],
      'self-hosted': [],
      custom: []
    }
    for (const p of PROVIDERS) out[p.group].push(p)
    return out
  }, [])

  return (
    <div className="page page-narrow col gap-lg">
      <div className="row">
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Settings</h2>
        <span className="spacer" />
        {saved && (
          <span className="badge ok">
            <IconCheck size={12} /> Saved
          </span>
        )}
        <button className="btn btn-primary" onClick={save}>
          Save changes
        </button>
      </div>

      {/* LLM */}
      <div className="card pad-lg">
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="card-title">Language model</div>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={testLlm} disabled={llmTest === 'loading'}>
            <IconRefresh size={13} /> {llmTest === 'loading' ? 'Testing…' : 'Test connection'}
          </button>
        </div>
        {llmTest && llmTest !== 'loading' && (
          <div
            className={`badge ${llmTest.ok ? 'ok' : 'err'}`}
            style={{ marginBottom: 14, display: 'inline-flex' }}
          >
            {llmTest.ok
              ? `Connected · "${llmTest.message}"${llmTest.model ? ` · ${llmTest.model}` : ''}`
              : `Failed: ${llmTest.message}`}
          </div>
        )}

        <div className="field">
          <label>Provider</label>
          <select value={draft.llm.provider} onChange={(e) => setProvider(e.target.value as LLMProvider)}>
            {PROVIDER_GROUP_ORDER.map((g) =>
              groupedProviders[g].length ? (
                <optgroup key={g} label={PROVIDER_GROUP_LABEL[g]}>
                  {groupedProviders[g].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ) : null
            )}
          </select>
          {provider && <span className="hint">{provider.description}</span>}
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>
              API key
              {provider?.envHint && (
                <span className="hint" style={{ marginLeft: 6 }}>
                  ({provider.envHint})
                </span>
              )}
            </label>
            <input
              type="password"
              value={draft.llm.apiKey}
              onChange={(e) => patch((d) => (d.llm.apiKey = e.target.value))}
              placeholder={provider?.requiresApiKey === false ? 'optional' : 'sk-…'}
            />
            {provider && provider.requiresApiKey === false && (
              <span className="hint">Optional for local servers without auth.</span>
            )}
          </div>
          <div className="field">
            <label>Base URL</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                value={draft.llm.baseUrl ?? ''}
                onChange={(e) =>
                  patch((d) => (d.llm.baseUrl = e.target.value || undefined))
                }
                placeholder={provider?.baseUrl || 'https://your-endpoint/v1'}
              />
              {provider && (
                <button
                  type="button"
                  className="btn btn-sm"
                  title="Reset to provider default"
                  onClick={() =>
                    patch((d) => {
                      d.llm.baseUrl = provider.baseUrl || undefined
                    })
                  }
                >
                  Reset
                </button>
              )}
            </div>
            {provider && provider.baseUrl && (
              <span className="hint">Default: {provider.baseUrl}</span>
            )}
          </div>
        </div>

        <div className="grid grid-2">
          <ModelField
            label="High-tier model (Generation / Reflection / Meta-review)"
            value={draft.llm.tiers.highTierModel}
            presets={provider?.highTierModels ?? []}
            onChange={(v) => patch((d) => (d.llm.tiers.highTierModel = v))}
            onReset={() =>
              provider &&
              patch((d) => {
                d.llm.tiers.highTierModel = defaultHighTierModel(provider)
              })
            }
            allowCustom={provider?.customModels ?? true}
          />
          <ModelField
            label="Fast-tier model (Ranking / Proximity / Evolution)"
            value={draft.llm.tiers.fastTierModel}
            presets={provider?.fastTierModels ?? []}
            onChange={(v) => patch((d) => (d.llm.tiers.fastTierModel = v))}
            onReset={() =>
              provider &&
              patch((d) => {
                d.llm.tiers.fastTierModel = defaultFastTierModel(provider)
              })
            }
            allowCustom={provider?.customModels ?? true}
          />
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label>Max output tokens (fallback)</label>
            <input type="number" min={512} max={384000} value={draft.llm.maxTokens} onChange={(e) => patch((d) => (d.llm.maxTokens = +e.target.value))} />
            <span className="hint">Default ceiling when an agent doesn't request its own; always clamped to the model's max output.</span>
          </div>
          <div className="field">
            <label>Temperature (OpenAI-compatible only)</label>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={draft.llm.temperature}
              onChange={(e) => patch((d) => (d.llm.temperature = +e.target.value))}
            />
            <span className="hint">
              Honoured by OpenAI-compatible providers. Ignored for Claude (Opus 4.8 removes sampling params).
            </span>
          </div>
        </div>

        <details style={{ marginTop: 6 }}>
          <summary className="muted" style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
            Per-agent model overrides
          </summary>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {OVERRIDABLE.map((a) => (
              <div key={a} className="field">
                <label>{AGENT_LABELS[a]}</label>
                <input
                  value={draft.llm.overrides[a] ?? ''}
                  placeholder="(use tier default)"
                  onChange={(e) => patch((d) => (d.llm.overrides[a] = e.target.value || undefined))}
                />
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Run */}
      <div className="card pad-lg">
        <div className="card-title" style={{ marginBottom: 14 }}>Engine</div>
        <div className="field">
          <label>Worker concurrency</label>
          <input type="number" min={1} max={8} value={draft.run.concurrency} onChange={(e) => patch((d) => (d.run.concurrency = +e.target.value))} />
          <span className="hint">Max simultaneous agent tasks.</span>
        </div>
        <label className="checkbox-row" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={draft.safety.enforceBiosafety}
            onChange={(e) => patch((d) => (d.safety.enforceBiosafety = e.target.checked))}
          />
          Enforce biosafety gate (auto-reject low-safety designs)
        </label>
      </div>

      {/* MCP */}
      <div className="card pad-lg">
        <div className="card-title" style={{ marginBottom: 6 }}>
          Grounding — MCP servers
        </div>
        <p className="faint" style={{ fontSize: 'var(--fs-sm)', marginTop: 0 }}>
          Optional. Connect the deep-research server for literature grounding and CodeXomics for genomic data
          &amp; construct design.
        </p>
        <McpRow
          label="Deep Research (literature)"
          cfg={draft.mcp.deepResearch}
          onToggle={(v) => patch((d) => (d.mcp.deepResearch.enabled = v))}
          onUrl={(v) => patch((d) => (d.mcp.deepResearch.url = v))}
          onToken={(v) => patch((d) => (d.mcp.deepResearch.accessToken = v || undefined))}
          result={tests.deepResearch}
          onTest={() => testMcp('deepResearch')}
        />
        <div className="divider" />
        <McpRow
          label="CodeXomics (genomics)"
          cfg={draft.mcp.codexomics}
          onToggle={(v) => patch((d) => (d.mcp.codexomics.enabled = v))}
          onUrl={(v) => patch((d) => (d.mcp.codexomics.url = v))}
          onToken={(v) => patch((d) => (d.mcp.codexomics.accessToken = v || undefined))}
          result={tests.codexomics}
          onTest={() => testMcp('codexomics')}
        />
      </div>
    </div>
  )
}

function ModelField({
  label,
  value,
  presets,
  onChange,
  onReset,
  allowCustom
}: {
  label: string
  value: string
  presets: ModelPreset[]
  onChange: (v: string) => void
  onReset?: () => void
  allowCustom: boolean
}): JSX.Element {
  // Use a stable id so multiple <datalist>s on the page don't collide.
  const listId = useMemo(
    () => `models-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    [label]
  )
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 6 }}>
        <input
          list={presets.length > 0 ? listId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowCustom ? 'model id (e.g. gpt-4o, deepseek-chat)' : ''}
        />
        {onReset && (
          <button type="button" className="btn btn-sm" title="Reset to provider default" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
      {presets.length > 0 && (
        <datalist id={listId}>
          {presets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </datalist>
      )}
      <ModelLimitsHint model={value} />
    </div>
  )
}

function McpRow({
  label,
  cfg,
  onToggle,
  onUrl,
  onToken,
  result,
  onTest
}: {
  label: string
  cfg: { enabled: boolean; url: string; accessToken?: string }
  onToggle: (v: boolean) => void
  onUrl: (v: string) => void
  onToken: (v: string) => void
  result?: McpTestResult | 'loading'
  onTest: () => void
}): JSX.Element {
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <label className="checkbox-row" style={{ fontWeight: 600 }}>
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => onToggle(e.target.checked)} />
          {label}
        </label>
        <span className="spacer" />
        <button className="btn btn-sm" disabled={!cfg.enabled || result === 'loading'} onClick={onTest}>
          <IconRefresh size={13} /> {result === 'loading' ? 'Testing…' : 'Test connection'}
        </button>
      </div>
      <div className="grid grid-2">
        <div className="field" style={{ marginBottom: 8 }}>
          <input value={cfg.url} onChange={(e) => onUrl(e.target.value)} placeholder="server URL" disabled={!cfg.enabled} />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <input
            type="password"
            value={cfg.accessToken ?? ''}
            onChange={(e) => onToken(e.target.value)}
            placeholder="access token (optional)"
            disabled={!cfg.enabled}
          />
        </div>
      </div>
      {result && result !== 'loading' && (
        <div className={`badge ${result.ok ? 'ok' : 'err'}`}>
          {result.ok ? `Connected · ${result.toolCount ?? 0} tools` : `Failed: ${result.message}`}
        </div>
      )}
    </div>
  )
}
