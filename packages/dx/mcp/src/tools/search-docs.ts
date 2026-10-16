import { fetchDocs, type DocsLibrary } from './fetch-docs.js'
import { score, snippet, terms } from '../knowledge/text.js'


export interface DocsSection {
  /** Page slug relative to /docs. */
  slug: string
  page: string
  heading: string
  anchor?: string
  text: string
}

export interface DocsHit extends DocsSection {
  score: number
  coverage: number
  snippet: string
}

const PAGE = /^# (.+) \((\/docs[^)]*)\)$/gm
const HEADING = /^(#{2,4}) (.+?)(?: \[#([\w-]+)\])?$/gm

/** Offsets of fenced code blocks, whose `#` lines are code, not headings. */
function fences(body: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  let open = -1
  for (const match of body.matchAll(/^\s*(?:```|~~~)/gm)) {
    if (open === -1) {
      open = match.index
    } else {
      ranges.push([open, match.index])
      open = -1
    }
  }
  if (open !== -1) ranges.push([open, body.length])
  return ranges
}

/** Splits `llms-full.txt` into one section per heading, keeping the page each belongs to. */
export function splitDocs(full: string): DocsSection[] {
  const pages = [...full.matchAll(PAGE)]
  const sections: DocsSection[] = []
  pages.forEach((match, k) => {
    const page = match[1]
    const slug = match[2].replace(/^\/docs\/?/, '')
    const body = full.slice(match.index + match[0].length, pages[k + 1]?.index ?? full.length)
    const code = fences(body)
    const headings = [...body.matchAll(HEADING)].filter((h) => !code.some(([a, b]) => h.index > a && h.index < b))
    const intro = body.slice(0, headings[0]?.index ?? body.length)
    if (intro.trim() !== '') sections.push({ slug, page, heading: page, text: intro.trim() })
    headings.forEach((h, j) => {
      const text = body.slice(h.index + h[0].length, headings[j + 1]?.index ?? body.length).trim()
      sections.push({ slug, page, heading: h[2].replace(/\s*\[#[\w-]+\]$/, ''), anchor: h[3], text })
    })
  })
  return sections
}

/** Sections matching more of the query beat sections matching one word many times. */
function rank(hit: { score: number; coverage: number }): number {
  return hit.score * (0.5 + hit.coverage)
}

export async function searchDocs(
  query: string,
  options: { limit?: number; includeChangelog?: boolean; library?: DocsLibrary } = {},
): Promise<DocsHit[]> {
  const sections = splitDocs(await fetchDocs({ format: 'full', library: options.library }))
  const q = terms(query)
  return sections
    .filter((s) => options.includeChangelog === true || !s.slug.startsWith('changelog'))
    .map((s) => ({
      ...s,
      ...score(q, [
        { text: s.heading, weight: 4 },
        { text: s.page, weight: 2 },
        { text: s.text, weight: 1 },
      ]),
      snippet: snippet(s.text, q, 240),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, options.limit ?? 8)
}

/** Docs sections of `slug` whose heading names `symbol` (`@Debounce`, `Debounce()`, `` `For` ``). */
export async function sectionsAbout(symbol: string, slug: string): Promise<DocsSection[]> {
  const sections = splitDocs(await fetchDocs({ format: 'full' }))
  const name = new RegExp(String.raw`(?:^|[^\w$])@?${symbol.replace(/\$/g, '\\$')}(?![\w$])`)
  return sections.filter((s) => s.slug === slug && name.test(s.heading))
}
