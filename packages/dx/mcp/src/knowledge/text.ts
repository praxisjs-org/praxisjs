const STOPWORDS = new Set(
  'a an and any are as at be by do does for from has have how i if in into is it its me my of on or our so some something that the there this to use using we what when where which with without already need want s'.split(
    ' ',
  ),
)

function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3)
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2)
  if (word.length > 4 && word.endsWith('es') && /(?:ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** Code-unit order, the same on every machine (unlike localeCompare). */
export function compareText(a: string, b: string): number {
  return Number(a > b) - Number(a < b)
}

/** Lowercased, stemmed search terms; camelCase and PascalCase names are split into words. */
export function terms(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem)
}

export interface WeightedField {
  text: string
  weight: number
}

/**
 * Scores a document for a query: each query term counts once, with the weight of the best field
 * containing it (prefix matches count, so "debounc" finds "debounce"). Returns the score and the
 * share of query terms that matched.
 */
export function score(query: string[], fields: WeightedField[]): { score: number; coverage: number } {
  if (query.length === 0) return { score: 0, coverage: 0 }
  const fieldTerms = fields.map((field) => ({ terms: terms(field.text), weight: field.weight }))
  let total = 0
  let matched = 0
  for (const term of new Set(query)) {
    let best = 0
    for (const field of fieldTerms) {
      if (field.weight > best && field.terms.some((t) => t === term || (term.length >= 4 && t.startsWith(term)))) {
        best = field.weight
      }
    }
    if (best > 0) matched++
    total += best
  }
  return { score: total, coverage: matched / new Set(query).size }
}

/** The line of `text` that best matches the query, trimmed to `max` characters. */
export function snippet(text: string, query: string[], max = 200): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('```'))
  let bestLine = lines[0] ?? ''
  let bestHits = 0
  for (const line of lines) {
    const lineTerms = new Set(terms(line))
    const hits = query.filter((term) => lineTerms.has(term)).length
    if (hits > bestHits) {
      bestHits = hits
      bestLine = line
    }
  }
  const clean = bestLine.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}
