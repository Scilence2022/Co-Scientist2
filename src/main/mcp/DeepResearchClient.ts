import type { McpConnection } from './McpManager'

export interface LiteratureFinding {
  summary: string
  sources: { title?: string; url: string }[]
}

/**
 * Wraps the deep-research MCP tools (literature grounding). Each method
 * degrades gracefully: if the server is unavailable the caller receives a
 * null result and annotates the hypothesis accordingly.
 */
export class DeepResearchClient {
  constructor(private conn: McpConnection) {}

  get available(): boolean {
    return this.conn.enabled
  }

  /**
   * Targeted literature search across one or more queries. Maps to the
   * `search-task` tool, which returns learnings + sources.
   */
  async search(
    tasks: { query: string; researchGoal: string }[]
  ): Promise<LiteratureFinding | null> {
    if (!this.conn.enabled) return null
    try {
      const raw = await this.conn.callText('search-task', { tasks, maxResult: 5 })
      return this.coerce(raw)
    } catch {
      return null
    }
  }

  /**
   * A full deep-research pass on a single topic (slower, richer). Maps to the
   * `deep-research` tool.
   */
  async deepResearch(query: string): Promise<LiteratureFinding | null> {
    if (!this.conn.enabled) return null
    try {
      const raw = await this.conn.callText('deep-research', {
        query,
        maxResult: 5,
        enableReferences: true,
        enableCitationImage: false
      })
      return this.coerce(raw)
    } catch {
      return null
    }
  }

  private coerce(raw: string): LiteratureFinding {
    const sources: { title?: string; url: string }[] = []
    let summary = raw
    try {
      const parsed = JSON.parse(raw)
      // search-task returns an array of {learning, sources, ...}
      const items = Array.isArray(parsed) ? parsed : parsed.tasks ?? parsed.learnings ?? [parsed]
      const learnings: string[] = []
      for (const item of items as any[]) {
        if (item?.learning) learnings.push(item.learning)
        else if (typeof item === 'string') learnings.push(item)
        for (const s of item?.sources ?? []) {
          if (s?.url) sources.push({ title: s.title, url: s.url })
        }
      }
      if (learnings.length) summary = learnings.join('\n\n')
    } catch {
      // raw is plain text; keep it as the summary.
    }
    return { summary: summary.slice(0, 6000), sources: sources.slice(0, 12) }
  }
}
