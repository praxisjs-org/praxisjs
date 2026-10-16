import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { migrateMemory } from '../memory/migrate.js'
import { MemoryError, MemoryStore, SCHEMA_VERSION } from '../memory/store.js'

import { makeProject, removeProjects } from './fixtures.js'

afterEach(() => {
  removeProjects()
  vi.restoreAllMocks()
})

/** A memory written before the format was versioned: hand-edited, no schema in the index. */
function legacyProject() {
  const root = makeProject({
    '.praxis/index.md': '# Project memory\n',
    '.praxis/README.md': 'old readme',
    '.praxis/components/button.md': '---\nid: button\ntitle: Button\nsummary: A button.\nlocation: src/button.tsx\ntags: [ui, a]\n---\n\n## Purpose\n\nClicks.   \n',
    '.praxis/components/renamed.md': '---\nid: card\ntitle: Card\nsummary: A card.\nlocation: src/card.tsx\n---\n## Purpose\nCards.\n',
    '.praxis/components/broken.md': 'no frontmatter',
    '.praxis/components/bad-path.md': '---\nid: bad-path\ntitle: Bad\nsummary: s\nlocation: ../outside.tsx\n---\n## Purpose\np\n',
    '.praxis/components/dupe.md': '---\nid: button\ntitle: Dupe\nsummary: s\nlocation: src/x.tsx\n---\n## Purpose\np\n',
    '.praxis/glossary/term.md': '---\n# Managed by the PraxisJS MCP server (@praxisjs/mcp). Change it through the praxisjs_memory_* tools, not by hand.\nid: term\ntitle: Term\nsummary: s\n---\n\n## Definition\n\nd\n',
    '.praxis/notes.txt': 'kept',
  })
  fs.writeFileSync(
    path.join(root, '.praxis/glossary/term.md'),
    '---\n# Managed by the PraxisJS MCP server (@praxisjs/mcp). Change it through the praxisjs_memory_* tools, not by hand.\nid: term\ntitle: Term\nsummary: s\n---\n\n## Definition\n\nd\n',
  )
  return root
}

describe('schema version', () => {
  it('reads the format from index.md and blocks writes until migrated', () => {
    const root = legacyProject()
    const store = new MemoryStore(root)
    expect(store.schemaVersion()).toBe(0)
    expect(() => store.add('glossary', { title: 'X', summary: 's', definition: 'd' })).toThrow('run praxisjs_memory_migrate')
    expect(() => store.remove('glossary', 'term')).toThrow(MemoryError)
    expect(() => store.init()).toThrow('run praxisjs_memory_migrate')
    expect(new MemoryStore(makeProject()).schemaVersion()).toBeUndefined()
  })

  it('refuses a memory written by a newer server', () => {
    const root = makeProject({ '.praxis/index.md': `---\nschema: ${String(SCHEMA_VERSION + 1)}\n---\n` })
    const store = new MemoryStore(root)
    expect(() => store.init()).toThrow('newer than this @praxisjs/mcp')
    expect(() => migrateMemory(store, { dryRun: true })).toThrow('update @praxisjs/mcp')
  })
})

describe('migrateMemory', () => {
  it('reports the plan in a dry run without touching anything', () => {
    const root = legacyProject()
    const before = fs.readFileSync(path.join(root, '.praxis/components/button.md'), 'utf8')
    const report = migrateMemory(new MemoryStore(root), { dryRun: true })
    expect(report).toMatchObject({ from: 0, to: SCHEMA_VERSION, applied: false })
    expect(report.steps).toEqual([
      { file: 'components/bad-path.md', action: 'invalid', reason: 'location: must be a path relative to the project root, without ".."' },
      { file: 'components/broken.md', action: 'invalid', reason: 'missing frontmatter' },
      { file: 'components/button.md', action: 'rewrite' },
      { file: 'components/dupe.md', action: 'invalid', reason: 'its id "button" belongs to another file' },
      { file: 'components/renamed.md', action: 'rename', to: 'components/card.md' },
      { file: 'glossary/term.md', action: 'unchanged' },
    ])
    expect(fs.readFileSync(path.join(root, '.praxis/components/button.md'), 'utf8')).toBe(before)
  })

  it('rewrites, renames and versions the memory, keeping invalid and unknown files', () => {
    const root = legacyProject()
    const store = new MemoryStore(root, () => '2026-10-16')
    expect(migrateMemory(store, { dryRun: false }).applied).toBe(true)
    expect(store.schemaVersion()).toBe(SCHEMA_VERSION)
    expect(fs.readFileSync(path.join(root, '.praxis/components/button.md'), 'utf8')).toContain('# Managed by the PraxisJS MCP server')
    expect(fs.readFileSync(path.join(root, '.praxis/components/button.md'), 'utf8')).toContain('tags: [a, ui]')
    expect(fs.existsSync(path.join(root, '.praxis/components/card.md'))).toBe(true)
    expect(fs.existsSync(path.join(root, '.praxis/components/renamed.md'))).toBe(false)
    expect(fs.readFileSync(path.join(root, '.praxis/components/broken.md'), 'utf8')).toBe('no frontmatter')
    expect(fs.readFileSync(path.join(root, '.praxis/notes.txt'), 'utf8')).toBe('kept')
    expect(fs.readFileSync(path.join(root, '.praxis/README.md'), 'utf8')).toContain('Managed by the PraxisJS MCP server')
    expect(fs.readdirSync(root).filter((n) => n.startsWith('.praxis'))).toEqual(['.praxis'])
    store.add('glossary', { title: 'New', summary: 's', definition: 'd' })

    const again = migrateMemory(store, { dryRun: false })
    expect(again.from).toBe(SCHEMA_VERSION)
    expect(again.steps.filter((s) => s.action !== 'unchanged' && s.action !== 'invalid')).toEqual([])
  })

  it('needs a memory, and restores it if the swap fails', () => {
    expect(() => migrateMemory(new MemoryStore(makeProject()), { dryRun: true })).toThrow('run praxisjs_memory_init')

    const root = legacyProject()
    const store = new MemoryStore(root)
    const rename = fs.renameSync
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(to) === store.dir && String(from).includes('.migrating-')) throw new Error('disk full')
      rename(from, to)
    })
    expect(() => migrateMemory(store, { dryRun: false })).toThrow('disk full')
    expect(store.schemaVersion()).toBe(0)
    expect(fs.readdirSync(root).filter((n) => n.startsWith('.praxis'))).toEqual(['.praxis'])

    vi.spyOn(fs, 'cpSync').mockImplementation(() => {
      throw new Error('copy failed')
    })
    expect(() => migrateMemory(store, { dryRun: false })).toThrow('copy failed')
    expect(fs.readdirSync(root).filter((n) => n.startsWith('.praxis'))).toEqual(['.praxis'])
  })
})
