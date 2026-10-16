import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { parseEntry, serializeEntry } from './format.js'
import { CATEGORIES, ENTRY_SCHEMAS } from './schema.js'
import { MEMORY_DIR, MemoryError, MemoryStore, SCHEMA_VERSION } from './store.js'

export interface MigrationStep {
  /** Path inside `.praxis/`. */
  file: string
  action: 'rewrite' | 'rename' | 'unchanged' | 'invalid'
  /** New path, for renames. */
  to?: string
  reason?: string
}

export interface MigrationReport {
  from: number
  to: number
  steps: MigrationStep[]
  applied: boolean
}

interface Planned extends MigrationStep {
  content?: string
}

function planEntries(store: MemoryStore): Planned[] {
  const steps: Planned[] = []
  const targets = new Set<string>()
  for (const category of CATEGORIES) {
    const dir = path.join(store.dir, category)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
      const file = `${category}/${name}`
      const original = fs.readFileSync(path.join(dir, name), 'utf8')
      let content: string
      let id: string
      try {
        const entry = parseEntry(category, original)
        const parsed = ENTRY_SCHEMAS[category].safeParse({ ...entry.fields, ...entry.sections, id: entry.id })
        if (!parsed.success) {
          const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
          steps.push({ file, action: 'invalid', reason: issues })
          continue
        }
        content = serializeEntry(entry)
        id = entry.id
      } catch (error) {
        steps.push({ file, action: 'invalid', reason: (error as Error).message })
        continue
      }
      const to = `${category}/${id}.md`
      if (to !== file && (targets.has(to) || fs.existsSync(path.join(store.dir, to)))) {
        steps.push({ file, action: 'invalid', reason: `its id "${id}" belongs to another file` })
        continue
      }
      targets.add(to)
      if (to !== file) steps.push({ file, action: 'rename', to, content })
      else steps.push({ file, action: content === original ? 'unchanged' : 'rewrite', content })
    }
  }
  return steps
}

/**
 * Brings `.praxis/` to the current format: every entry is parsed, validated and written again in the
 * canonical form (renamed when its file name doesn't match its id), and README.md and index.md are
 * regenerated with the current format version. Invalid entries are reported and left as they are.
 *
 * The new memory is built in a sibling folder and swapped in with two renames, so the project never
 * sees a half-migrated memory; the old one is deleted only once the swap succeeded.
 */
export function migrateMemory(store: MemoryStore, options: { dryRun: boolean }): MigrationReport {
  const from = store.schemaVersion()
  if (from === undefined) throw new MemoryError('There is no project memory to migrate: run praxisjs_memory_init.')
  if (from > SCHEMA_VERSION) {
    throw new MemoryError(`.praxis/ uses format ${String(from)}, newer than this server's ${String(SCHEMA_VERSION)}: update @praxisjs/mcp.`)
  }
  const planned = planEntries(store)
  const report: MigrationReport = {
    from,
    to: SCHEMA_VERSION,
    steps: planned.map(({ content: _content, ...step }) => step),
    applied: false,
  }
  if (options.dryRun) return report

  const suffix = randomBytes(4).toString('hex')
  const temp = new MemoryStore(store.root, undefined, `${MEMORY_DIR}.migrating-${suffix}`)
  const backup = path.join(store.root, `${MEMORY_DIR}.backup-${suffix}`)
  try {
    fs.cpSync(store.dir, temp.dir, { recursive: true })
    for (const step of planned) {
      if (step.content === undefined || step.action === 'unchanged') continue
      fs.writeFileSync(path.join(temp.dir, step.to ?? step.file), step.content)
      if (step.to) fs.rmSync(path.join(temp.dir, step.file))
    }
    fs.rmSync(path.join(temp.dir, 'index.md'), { force: true })
    fs.rmSync(path.join(temp.dir, 'README.md'), { force: true })
    temp.init()
    fs.renameSync(store.dir, backup)
    try {
      fs.renameSync(temp.dir, store.dir)
    } catch (error) {
      fs.renameSync(backup, store.dir)
      throw error
    }
  } catch (error) {
    fs.rmSync(temp.dir, { recursive: true, force: true })
    throw error
  }
  fs.rmSync(backup, { recursive: true, force: true })
  report.applied = true
  return report
}
