import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'


import { MANAGED_HEADER, parseEntry, serializeEntry } from './format.js'
import {
  CATEGORIES,
  CATEGORY_SPECS,
  ENTRY_SCHEMAS,
  slugify,
  type Category,
  type Entry,
} from './schema.js'
import { findSecret } from './secrets.js'
import { compareText, score, snippet, terms, type WeightedField } from '../knowledge/text.js'

export const MEMORY_DIR = '.praxis'
export const SCHEMA_VERSION = 1

export class MemoryError extends Error {}

export interface WriteResult {
  entry: Entry
  file: string
  warnings: string[]
}

export interface SearchHit {
  entry: Entry
  score: number
  coverage: number
  snippet: string
}

export interface MemoryProblem {
  file: string
  message: string
}

/** Entry input as the tools receive it: frontmatter fields and sections side by side. */
export type EntryInput = Record<string, unknown>

/**
 * The project memory in `<root>/.praxis/`. Every write is validated against the category schema,
 * checked for secrets and written atomically (temporary file + rename), and the index is rebuilt
 * from the entries so it never drifts from them.
 */
export class MemoryStore {
  readonly dir: string

  constructor(
    readonly root: string,
    private readonly today: () => string = () => new Date().toISOString().slice(0, 10),
    /** Folder name under `root`; the migration builds the new memory next to the old one. */
    folder = MEMORY_DIR,
  ) {
    this.dir = path.join(root, folder)
  }

  exists(): boolean {
    return fs.existsSync(path.join(this.dir, 'index.md'))
  }

  /**
   * The format version recorded in `index.md` (its manifest): undefined without a memory, 0 for a
   * memory written before the format was versioned.
   */
  schemaVersion(): number | undefined {
    const index = path.join(this.dir, 'index.md')
    if (!fs.existsSync(index)) return undefined
    const match = /^schema:\s*(\d+)\s*$/m.exec(fs.readFileSync(index, 'utf8'))
    return match ? Number(match[1]) : 0
  }

  /** Refuses writes to a memory in another format version: migrate it first, or update the server. */
  assertCurrentFormat(): void {
    const version = this.schemaVersion()
    if (version === undefined || version === SCHEMA_VERSION) return
    throw new MemoryError(
      version > SCHEMA_VERSION
        ? `.praxis/ uses format ${String(version)}, newer than this @praxisjs/mcp (format ${String(SCHEMA_VERSION)}): update the server (npx -y @praxisjs/mcp@latest).`
        : `.praxis/ uses format ${String(version)}: run praxisjs_memory_migrate (dryRun first) to bring it to format ${String(SCHEMA_VERSION)}.`,
    )
  }

  /** Creates `.praxis/` with its README and index. Existing entries are kept. */
  init(): string[] {
    this.assertCurrentFormat()
    const created: string[] = []
    for (const [name, content] of [
      ['README.md', readme()],
      ['index.md', this.renderIndex()],
    ] as const) {
      const file = path.join(this.dir, name)
      if (!fs.existsSync(file)) created.push(`${MEMORY_DIR}/${name}`)
      writeAtomic(file, content)
    }
    return created
  }

  fileOf(category: Category, id: string): string {
    return path.join(this.dir, category, `${id}.md`)
  }

  relativeFile(category: Category, id: string): string {
    return `${MEMORY_DIR}/${category}/${id}.md`
  }

  /** Every readable entry, in category order then by id, plus files that could not be parsed. */
  load(category?: Category): { entries: Entry[]; problems: MemoryProblem[] } {
    const entries: Entry[] = []
    const problems: MemoryProblem[] = []
    for (const cat of category ? [category] : CATEGORIES) {
      const dir = path.join(this.dir, cat)
      if (!fs.existsSync(dir)) continue
      for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
        const file = `${MEMORY_DIR}/${cat}/${name}`
        try {
          const entry = parseEntry(cat, fs.readFileSync(path.join(dir, name), 'utf8'))
          if (entry.id !== name.slice(0, -3)) throw new Error(`id "${entry.id}" does not match the file name`)
          entries.push(entry)
        } catch (error) {
          problems.push({ file, message: error instanceof Error ? error.message : String(error) })
        }
      }
    }
    return { entries, problems }
  }

  get(category: Category, id: string): Entry | undefined {
    const file = this.fileOf(category, id)
    if (!fs.existsSync(file)) return undefined
    return parseEntry(category, fs.readFileSync(file, 'utf8'))
  }

  add(category: Category, input: EntryInput): WriteResult {
    const data = this.validate(category, input)
    let id = typeof data.id === 'string' ? data.id : slugify(String(data.title))
    if (id === '') throw new MemoryError('The title has no letters or digits to build an id from; pass an "id".')
    if (category === 'architecture') {
      if (!/^\d{4}-/.test(id)) id = `${this.nextDecisionNumber()}-${id}`.slice(0, 80)
      data.date ??= this.today()
    }
    if (fs.existsSync(this.fileOf(category, id))) {
      throw new MemoryError(`${category}/${id} already exists. Use praxisjs_memory_update to change it.`)
    }
    return this.write(category, id, data)
  }

  /** Merges `changes` into an entry; `null` clears an optional field or section. */
  update(category: Category, id: string, changes: EntryInput): WriteResult {
    const current = this.get(category, id)
    if (!current) throw new MemoryError(`${category}/${id} does not exist.`)
    if ('id' in changes && changes.id !== id) {
      throw new MemoryError('Entry ids cannot change. Remove the entry and add it again under the new id.')
    }
    const merged: EntryInput = { ...current.fields, ...current.sections }
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'id') continue
      if (value === null) Reflect.deleteProperty(merged, key)
      else merged[key] = value
    }
    return this.write(category, id, this.validate(category, merged))
  }

  remove(category: Category, id: string): { file: string; referencedBy: string[] } {
    this.assertCurrentFormat()
    const file = this.fileOf(category, id)
    if (!fs.existsSync(file)) throw new MemoryError(`${category}/${id} does not exist.`)
    fs.rmSync(file)
    const target = `${category}/${id}`
    const referencedBy = this.load()
      .entries.filter((e) => toList(e.fields.related).some((ref) => ref === target || ref === id))
      .map((e) => `${e.category}/${e.id}`)
    this.writeIndex()
    return { file: this.relativeFile(category, id), referencedBy }
  }

  search(query: string, options: { category?: Category; limit?: number } = {}): SearchHit[] {
    const q = terms(query)
    return this.load(options.category)
      .entries.map((entry) => {
        const result = score(q, entryFields(entry))
        const body = Object.values(entry.sections).join('\n')
        return { entry, ...result, snippet: snippet(`${String(entry.fields.summary)}\n${body}`, q) }
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || b.coverage - a.coverage || compareText(a.entry.id, b.entry.id))
      .slice(0, options.limit ?? 10)
  }

  /** Checks an entry against its category schema and for secrets; returns the parsed data. */
  validate(category: Category, input: EntryInput): Record<string, unknown> {
    const parsed = ENTRY_SCHEMAS[category].safeParse(input)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'entry'}: ${issue.message}`)
      throw new MemoryError(`Invalid ${CATEGORY_SPECS[category].label}: ${issues.join('; ')}`)
    }
    const data = parsed.data as Record<string, unknown>
    for (const [key, value] of Object.entries(data)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        const secret = findSecret(String(item))
        if (secret) {
          throw new MemoryError(
            `"${key}" looks like it contains ${secret}. .praxis/ is committed to git: describe where the value comes from (an env variable, a secret manager) instead of the value itself.`,
          )
        }
      }
    }
    return data
  }

  private write(category: Category, id: string, data: Record<string, unknown>): WriteResult {
    this.assertCurrentFormat()
    const spec = CATEGORY_SPECS[category]
    const fields: Entry['fields'] = {}
    for (const field of spec.fields) {
      const value = data[field.key]
      if (typeof value === 'string' || Array.isArray(value)) fields[field.key] = value as string | string[]
    }
    const sections: Entry['sections'] = {}
    for (const section of spec.sections) {
      const value = data[section.key]
      if (typeof value === 'string') sections[section.key] = value
    }
    const entry: Entry = { category, id, fields, sections }
    writeAtomic(this.fileOf(category, id), serializeEntry(entry))
    this.writeIndex()
    return { entry, file: this.relativeFile(category, id), warnings: this.warningsFor(entry) }
  }

  private warningsFor(entry: Entry): string[] {
    const warnings: string[] = []
    const paths = [entry.fields.location, ...toList(entry.fields.locations)].filter(
      (p): p is string => typeof p === 'string',
    )
    for (const p of paths) {
      if (!fs.existsSync(path.join(this.root, p))) warnings.push(`${p} does not exist (yet).`)
    }
    for (const ref of toList(entry.fields.related)) {
      const [category, id] = ref.includes('/') ? ref.split('/', 2) : [undefined, ref]
      const exists = (category ? [category as Category] : CATEGORIES).some(
        (cat) => CATEGORIES.includes(cat) && fs.existsSync(this.fileOf(cat, id)),
      )
      if (!exists) warnings.push(`related entry "${ref}" does not exist.`)
    }
    return warnings
  }

  private nextDecisionNumber(): string {
    const dir = path.join(this.dir, 'architecture')
    const numbers = fs.existsSync(dir)
      ? fs.readdirSync(dir).map((name) => Number.parseInt(name.slice(0, 4), 10)).filter(Number.isFinite)
      : []
    return String(Math.max(0, ...numbers) + 1).padStart(4, '0')
  }

  writeIndex(): void {
    writeAtomic(path.join(this.dir, 'index.md'), this.renderIndex())
  }

  renderIndex(): string {
    const { entries } = this.load()
    const lines = [
      '---',
      MANAGED_HEADER,
      `schema: ${String(SCHEMA_VERSION)}`,
      '---',
      '',
      '# Project memory',
      '',
      'What this project already has and how it is built, for people and AI agents. Agents read and change it through the PraxisJS MCP server; see README.md.',
    ]
    for (const category of CATEGORIES) {
      const list = entries.filter((e) => e.category === category)
      lines.push('', `## ${heading(category)} (${String(list.length)})`, '')
      if (list.length === 0) {
        lines.push('None yet.')
        continue
      }
      const extra = INDEX_COLUMN[category]
      lines.push(`| Entry | ${extra.title} | Summary |`, '|---|---|---|')
      for (const e of list) {
        const value = extra.value(e)
        lines.push(
          `| [${cell(String(e.fields.title))}](${category}/${e.id}.md) | ${value ? cell(value) : ''} | ${cell(String(e.fields.summary))} |`,
        )
      }
    }
    return `${lines.join('\n')}\n`
  }
}

const INDEX_COLUMN: Record<Category, { title: string; value: (e: Entry) => string | undefined }> = {
  components: { title: 'Location', value: (e) => code(e.fields.location) },
  utilities: { title: 'Kind · location', value: (e) => `${String(e.fields.kind)} · ${code(e.fields.location)}` },
  'business-rules': { title: 'Tags', value: (e) => toList(e.fields.tags).join(', ') },
  architecture: { title: 'Status', value: (e) => `${String(e.fields.status)} (${String(e.fields.date)})` },
  conventions: { title: 'Scope', value: (e) => String(e.fields.scope) },
  glossary: { title: 'Aliases', value: (e) => toList(e.fields.aliases).join(', ') },
}

function code(value: unknown): string {
  return `\`${String(value)}\``
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|')
}

function heading(category: Category): string {
  return category
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function toList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function entryFields(entry: Entry): WeightedField[] {
  const f = entry.fields
  return [
    { text: String(f.title), weight: 4 },
    { text: [entry.id, ...toList(f.tags), ...toList(f.aliases), ...toList(f.exports)].join(' '), weight: 3 },
    { text: String(f.summary), weight: 2 },
    { text: [f.location, f.kind, f.scope, ...toList(f.locations), ...toList(f.paths)].join(' '), weight: 1 },
    { text: Object.values(entry.sections).join('\n'), weight: 1 },
  ]
}

/** Writes through a temporary file in the same folder and renames it, so readers never see half a file. */
export function writeAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${String(process.pid)}.${randomBytes(4).toString('hex')}.tmp`
  try {
    fs.writeFileSync(temp, content, 'utf8')
    fs.renameSync(temp, file)
  } catch (error) {
    fs.rmSync(temp, { force: true })
    throw error
  }
}

function readme(): string {
  const categories = CATEGORIES.map((c) => `- \`${c}/\`: ${CATEGORY_SPECS[c].description}`).join('\n')
  return `<!-- ${MANAGED_HEADER.slice(2)} -->

# .praxis: project memory

This folder records what the project already has and how it is built, so that people and AI agents
reuse existing code instead of writing it again, respect the business rules, and keep the folder
organization consistent. It is plain Markdown, versioned with the code: review it in pull requests
like any other change.

AI agents never read or write these files directly. They use the PraxisJS MCP server
(\`@praxisjs/mcp\`): \`praxisjs_memory_search\`, \`praxisjs_memory_check_duplicate\`,
\`praxisjs_memory_add\`, \`praxisjs_memory_update\`, \`praxisjs_memory_map\` and the other
\`praxisjs_memory_*\` tools, which validate every entry, refuse secrets and keep \`index.md\` in sync.

## Layout

- \`index.md\`: every entry by category, rebuilt on each change.
${categories}

Each entry is one file named after its id (\`kebab-case.md\`; architecture decisions are numbered,
\`0001-…\`). Frontmatter holds short fields (title, summary, location, tags…), the body holds
\`## Sections\` (Purpose, API, Usage; Rule, Rationale; Context, Decision, Consequences…).

Never put secrets here: credentials, tokens and private URLs are refused.
`
}
