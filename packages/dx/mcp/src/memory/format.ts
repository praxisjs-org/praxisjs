import { CATEGORY_SPECS, type Category, type Entry } from './schema.js'
import { compareText } from '../knowledge/text.js'


/**
 * Reads and writes memory entries as Markdown with a small, strict frontmatter. Output depends only
 * on the entry (fixed key and section order, sorted lists, normalized whitespace), so rewriting an
 * unchanged entry produces the same bytes and a changed entry produces the smallest git diff.
 */

export const MANAGED_HEADER =
  '# Managed by the PraxisJS MCP server (@praxisjs/mcp). Change it through the praxisjs_memory_* tools, not by hand.'

const PLAIN = /^[A-Za-z0-9_./@()][A-Za-z0-9 _./@()'+-]*$/

function scalar(value: string): string {
  return PLAIN.test(value) && !value.endsWith(' ') ? value : JSON.stringify(value)
}

/** Trims trailing spaces, unifies line breaks and collapses runs of blank lines. */
export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Section text with `#`/`##` headings outside code fences lowered to `###`, so they cannot be read
 * back as the start of another section.
 */
export function sectionText(value: string): string {
  let fenced = false
  return normalizeText(value)
    .split('\n')
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) fenced = !fenced
      return !fenced && /^#{1,2}\s/.test(line) ? line.replace(/^#{1,2}/, '###') : line
    })
    .join('\n')
}

export function serializeEntry(entry: Entry): string {
  const spec = CATEGORY_SPECS[entry.category]
  const lines = ['---', MANAGED_HEADER, `id: ${entry.id}`]
  for (const field of spec.fields) {
    const value = entry.fields[field.key]
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      const items = [...new Set(value)].sort(compareText)
      lines.push(`${field.key}: [${items.map(scalar).join(', ')}]`)
    } else {
      lines.push(`${field.key}: ${scalar(value)}`)
    }
  }
  lines.push('---')
  for (const section of spec.sections) {
    const value = entry.sections[section.key]
    if (value === undefined || value.trim() === '') continue
    lines.push('', `## ${section.heading}`, '', sectionText(value))
  }
  return `${lines.join('\n')}\n`
}

function parseList(raw: string): string[] {
  const inner = raw.slice(1, -1).trim()
  if (inner === '') return []
  const items: string[] = []
  let k = 0
  while (k < inner.length) {
    while (inner[k] === ' ' || inner[k] === ',') k++
    if (k >= inner.length) break
    if (inner[k] === '"') {
      let end = k + 1
      while (end < inner.length && inner[end] !== '"') end += inner[end] === '\\' ? 2 : 1
      items.push(JSON.parse(inner.slice(k, end + 1)) as string)
      k = end + 1
    } else {
      const end = inner.indexOf(',', k)
      items.push(inner.slice(k, end === -1 ? inner.length : end).trim())
      k = end === -1 ? inner.length : end
    }
  }
  return items
}

/** Parses an entry file; throws with a readable message when the file is not in the managed format. */
export function parseEntry(category: Category, source: string): Entry {
  const text = source.replace(/\r\n?/g, '\n')
  if (!text.startsWith('---\n')) throw new Error('missing frontmatter')
  const close = text.indexOf('\n---', 4)
  if (close === -1) throw new Error('unterminated frontmatter')
  const spec = CATEGORY_SPECS[category]
  const listKeys = new Set(spec.fields.filter((f) => f.type === 'list').map((f) => f.key))
  const fields: Record<string, string | string[]> = {}
  let id = ''
  for (const line of text.slice(4, close).split('\n')) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) throw new Error(`invalid frontmatter line "${line}"`)
    const key = line.slice(0, colon).trim()
    const raw = line.slice(colon + 1).trim()
    if (key === 'id') {
      id = raw
      continue
    }
    if (listKeys.has(key)) {
      if (!raw.startsWith('[') || !raw.endsWith(']')) throw new Error(`"${key}" must be a [list]`)
      fields[key] = parseList(raw)
    } else {
      fields[key] = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw
    }
  }
  if (id === '') throw new Error('missing id')

  const sections: Entry['sections'] = {}
  const byHeading = new Map(spec.sections.map((s) => [s.heading, s.key]))
  let key: string | undefined
  let lines: string[] = []
  let fenced = false
  const flush = () => {
    if (key) sections[key] = normalizeText(lines.join('\n'))
  }
  for (const line of text.slice(close + 4).split('\n')) {
    if (/^\s*(?:```|~~~)/.test(line)) fenced = !fenced
    const heading = fenced ? undefined : /^## (.+)$/.exec(line)?.[1]
    if (heading === undefined) {
      lines.push(line)
      continue
    }
    flush()
    key = byHeading.get(heading.trim())
    lines = []
  }
  flush()
  return { category, id, fields, sections }
}
