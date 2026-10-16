import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { MemoryError, MemoryStore, entryFields, toList, writeAtomic } from '../memory/store.js'

import { makeProject, removeProjects, writeFile } from './fixtures.js'

afterEach(() => {
  removeProjects()
  vi.restoreAllMocks()
})

function freshStore(files: Record<string, string> = { 'src/components/button.tsx': 'export class Button {}' }) {
  const store = new MemoryStore(makeProject(files), () => '2026-10-15')
  store.init()
  return store
}

const button = {
  title: 'Button',
  summary: 'Clickable button with variants.',
  location: 'src/components/button.tsx',
  exports: ['Button'],
  purpose: 'Every clickable action in the app.',
  tags: ['ui'],
}

describe('MemoryStore — init', () => {
  it('creates README and index once, and refreshes them on the next run', () => {
    const store = new MemoryStore(makeProject())
    expect(store.exists()).toBe(false)
    expect(store.init()).toEqual(['.praxis/README.md', '.praxis/index.md'])
    expect(store.exists()).toBe(true)
    expect(store.init()).toEqual([])
    const readme = fs.readFileSync(path.join(store.dir, 'README.md'), 'utf8')
    expect(readme).toMatch(/^<!-- Managed by the PraxisJS MCP server/)
    expect(readme).toContain('`business-rules/`')
    expect(fs.readFileSync(path.join(store.dir, 'index.md'), 'utf8')).toContain('## Components (0)\n\nNone yet.')
  })

  it('uses the current date by default', () => {
    const store = new MemoryStore(makeProject())
    store.init()
    const { entry } = store.add('architecture', { title: 'T', summary: 's', context: 'c', decision: 'd' })
    expect(entry.fields.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('MemoryStore — add / get / update / remove', () => {
  it('adds an entry, rebuilds the index and returns no warnings when everything resolves', () => {
    const store = freshStore()
    const result = store.add('components', button)
    expect(result.file).toBe('.praxis/components/button.md')
    expect(result.warnings).toEqual([])
    expect(store.get('components', 'button')?.fields.title).toBe('Button')
    const index = fs.readFileSync(path.join(store.dir, 'index.md'), 'utf8')
    expect(index).toContain('| [Button](components/button.md) | `src/components/button.tsx` | Clickable button with variants. |')
  })

  it('warns about missing files and dangling related entries', () => {
    const store = freshStore()
    store.add('components', button)
    const result = store.add('business-rules', {
      title: 'Max | items',
      summary: 'At most 20 items per cart.',
      rule: 'Reject the 21st item.',
      locations: ['src/stores/cart.ts'],
      related: ['components/button', 'button', 'utilities/nope', 'nope', 'unknown/button'],
    })
    expect(result.warnings).toEqual([
      'src/stores/cart.ts does not exist (yet).',
      'related entry "utilities/nope" does not exist.',
      'related entry "nope" does not exist.',
      'related entry "unknown/button" does not exist.',
    ])
    expect(fs.readFileSync(path.join(store.dir, 'index.md'), 'utf8')).toContain('[Max \\| items]')
  })

  it('numbers architecture decisions and keeps an explicit number', () => {
    const store = freshStore()
    const first = store.add('architecture', { title: 'Use stores', summary: 's', context: 'c', decision: 'd' })
    const second = store.add('architecture', { id: 'routing', title: 'Routing', summary: 's', context: 'c', decision: 'd', status: 'proposed' })
    const third = store.add('architecture', { id: '0009-legacy', title: 'Legacy', summary: 's', context: 'c', decision: 'd' })
    writeFile(store.root, '.praxis/architecture/notes.txt', '')
    const fourth = store.add('architecture', { title: 'Next', summary: 's', context: 'c', decision: 'd' })
    expect([first, second, third, fourth].map((r) => r.entry.id)).toEqual(['0001-use-stores', '0002-routing', '0009-legacy', '0010-next'])
    expect(first.entry.fields.date).toBe('2026-10-15')
    expect(fs.readFileSync(path.join(store.dir, 'index.md'), 'utf8')).toContain('proposed (2026-10-15)')
  })

  it('refuses duplicates, invalid entries, untitled ids and secrets', () => {
    const store = freshStore()
    store.add('components', button)
    expect(() => store.add('components', button)).toThrow('components/button already exists')
    expect(() => store.add('components', { title: 'X' })).toThrow(/Invalid component: summary: Required/)
    expect(() => store.add('glossary', { title: '!!!', summary: 's', definition: 'd' })).toThrow('pass an "id"')
    expect(() =>
      store.add('glossary', { title: 'Token', summary: 's', definition: 'd', aliases: [`ghp_${'a'.repeat(36)}`] }),
    ).toThrow('"aliases" looks like it contains a GitHub token')
    expect(() => store.add('components', [] as unknown as Record<string, unknown>)).toThrow(MemoryError)
  })

  it('updates fields, clears optional ones with null and keeps the id', () => {
    const store = freshStore()
    store.add('components', button)
    const result = store.update('components', 'button', { summary: 'Primary action button.', tags: null, usage: '<Button />', id: 'button' })
    expect(result.entry.fields.summary).toBe('Primary action button.')
    expect(result.entry.fields.tags).toBeUndefined()
    expect(result.entry.sections.usage).toBe('<Button />')
    expect(() => store.update('components', 'button', { id: 'other' })).toThrow('Entry ids cannot change')
    expect(() => store.update('components', 'missing', {})).toThrow('components/missing does not exist')
    expect(() => store.update('components', 'button', { purpose: null })).toThrow(/purpose: Required/)
  })

  it('removes entries and reports entries that still reference them', () => {
    const store = freshStore()
    store.add('components', button)
    store.add('glossary', { title: 'CTA', summary: 'Call to action.', definition: 'A button that…', related: ['components/button'] })
    store.add('glossary', { title: 'Other', summary: 'x', definition: 'y', related: ['button'] })
    store.add('glossary', { title: 'Plain', summary: 'x', definition: 'y' })
    expect(store.remove('components', 'button')).toEqual({ file: '.praxis/components/button.md', referencedBy: ['glossary/cta', 'glossary/other'] })
    expect(store.get('components', 'button')).toBeUndefined()
    expect(() => store.remove('components', 'button')).toThrow('does not exist')
  })
})

describe('MemoryStore — load and search', () => {
  it('reports unreadable files and ids that do not match the file name', () => {
    const store = freshStore()
    store.add('components', button)
    writeFile(store.root, '.praxis/components/broken.md', 'no frontmatter')
    writeFile(store.root, '.praxis/components/renamed.md', '---\nid: other\ntitle: T\nsummary: s\nlocation: a.ts\n---\n')
    writeFile(store.root, '.praxis/components/notes.txt', 'ignored')
    const first = store.load('components')
    expect(first.entries.map((e) => e.id)).toEqual(['button'])
    expect(first.problems).toEqual([
      { file: '.praxis/components/broken.md', message: 'missing frontmatter' },
      { file: '.praxis/components/renamed.md', message: 'id "other" does not match the file name' },
    ])
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw 'raw failure'
    })
    expect(store.load('components').problems[0]).toEqual({ file: '.praxis/components/broken.md', message: 'raw failure' })
  })

  it('ranks entries by how well they match', () => {
    const store = freshStore()
    store.add('components', button)
    store.add('utilities', {
      title: 'formatPrice',
      summary: 'Formats cents as a price.',
      kind: 'function',
      location: 'src/utils/format.ts',
      purpose: 'Price display everywhere, including the button labels.',
    })
    store.add('glossary', { title: 'Price', summary: 'What the customer pays.', definition: 'In cents.' })
    store.add('conventions', { title: 'Naming', summary: 'Kebab-case files.', scope: 'naming', rule: 'Name files in kebab-case.' })
    expect(fs.readFileSync(path.join(store.dir, 'index.md'), 'utf8')).toContain('| [Naming](conventions/naming.md) | naming | Kebab-case files. |')
    expect(store.search('price').map((h) => h.entry.id)).toEqual(['format-price', 'price'])
    expect(store.search('button', { category: 'components' }).map((h) => h.entry.id)).toEqual(['button'])
    expect(store.search('button price', { limit: 1 })).toHaveLength(1)
    expect(store.search('nothing-matches')).toEqual([])
    expect(store.search('price')[0].snippet).toBe('Formats cents as a price.')
  })

  it('exposes weighted fields and lists', () => {
    expect(toList(['a', 1, 'b'])).toEqual(['a', 'b'])
    expect(toList('a')).toEqual([])
    const fields = entryFields({ category: 'glossary', id: 'x', fields: { title: 'T', summary: 'S' }, sections: { definition: 'D' } })
    expect(fields.map((f) => f.weight)).toEqual([4, 3, 2, 1, 1])
  })
})

describe('writeAtomic', () => {
  it('writes through a temporary file and cleans it up on failure', () => {
    const root = makeProject()
    const file = path.join(root, 'a', 'b.md')
    writeAtomic(file, 'one')
    expect(fs.readFileSync(file, 'utf8')).toBe('one')
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('rename failed')
    })
    expect(() => writeAtomic(file, 'two')).toThrow('rename failed')
    expect(fs.readFileSync(file, 'utf8')).toBe('one')
    expect(fs.readdirSync(path.dirname(file))).toEqual(['b.md'])
  })
})
