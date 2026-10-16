/** The three sites publish the same Fumadocs `llms.txt` / `llms-full.txt` / per-page Markdown routes. */
export const DOCS_SITES = {
  praxisjs: 'https://praxisjs.org',
  morphos: 'https://morphos.praxisjs.org',
  kosmesis: 'https://kosmesis.praxisjs.org',
} as const

export type DocsLibrary = keyof typeof DOCS_SITES

/** Docs only change on deploy, so a session can reuse what it already fetched. */
export const CACHE_TTL_MS = 10 * 60 * 1000
export const FETCH_TIMEOUT_MS = 15 * 1000

export type DocsFormat = 'overview' | 'full' | 'page'

export interface FetchDocsInput {
  format: DocsFormat
  /** Only used when format is "page". Slug relative to /docs, e.g. "essentials/components" */
  page?: string
  /** Which site: PraxisJS (default), Morphos or Kosmesis. */
  library?: DocsLibrary
}

interface CacheEntry {
  expires: number
  text: Promise<string>
}

const cache = new Map<string, CacheEntry>()

export function clearDocsCache(): void {
  cache.clear()
}

/**
 * Accepts a slug ("essentials/components") and the forms an assistant copies from the index or the
 * site: "/docs/essentials/components", a full praxisjs.org URL, a trailing slash, a ".md"/".mdx"
 * extension or the "/llms.mdx/docs/…/content.md" path itself. Returns "" for the docs root.
 */
export function normalizeSlug(page: string): string {
  return page
    .trim()
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[?#].*$/, '')
    .replace(/^\/+/, '')
    .replace(/^llms\.mdx\//, '')
    .replace(/\/content\.md$/, '')
    .replace(/\.mdx?$/, '')
    .replace(/^docs(?:\/|$)/, '')
    .replace(/\/+$/, '')
}

function urlFor(input: FetchDocsInput): string {
  const base = DOCS_SITES[input.library ?? 'praxisjs']
  switch (input.format) {
    case 'overview':
      return `${base}/llms.txt`
    case 'full':
      return `${base}/llms-full.txt`
    case 'page': {
      if (!input.page) throw new Error('page slug is required when format is "page"')
      const slug = normalizeSlug(input.page)
      return `${base}/llms.mdx/docs/${slug === '' ? '' : `${slug}/`}content.md`
    }
  }
}

async function load(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${String(response.status)}`)
  }
  return response.text()
}

export async function fetchDocs(input: FetchDocsInput): Promise<string> {
  const url = urlFor(input)
  const now = Date.now()
  const cached = cache.get(url)
  if (cached && cached.expires > now) return cached.text

  // Stored before it settles so concurrent calls share one request; a failure is dropped so the
  // next call retries instead of replaying the error for the rest of the TTL.
  const text = load(url)
  const entry: CacheEntry = { expires: now + CACHE_TTL_MS, text }
  cache.set(url, entry)
  text.catch(() => {
    if (cache.get(url) === entry) cache.delete(url)
  })
  return text
}
