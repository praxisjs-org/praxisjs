import { afterEach, describe, expect, it } from 'vitest'

import { bootstrapPlan, upsertEntries } from '../memory/bootstrap.js'
import { MemoryStore } from '../memory/store.js'

import { APP_FILES, makeProject, removeProjects, writeFile } from './fixtures.js'

afterEach(removeProjects)

function store(files: Record<string, string> = APP_FILES) {
  const s = new MemoryStore(makeProject(files), () => '2026-10-16')
  s.init()
  return s
}

describe('bootstrapPlan', () => {
  it('splits the analysis into focused passes with their files', () => {
    const s = store({
      ...APP_FILES,
      'components.json': JSON.stringify({ aliases: { ui: 'src/components/ui' } }),
      'src/components/ui/button.tsx': '@Component()\nexport class Button extends StatefulComponent {}',
      'src/components/dialog-panel.tsx': "import { Dialog } from '@morphos/overlays'\n@Component()\nexport class DialogPanel extends StatefulComponent {}",
    })
    s.add('glossary', { title: 'Cart', summary: 's', definition: 'd' })
    const plan = bootstrapPlan(s)
    expect(plan.passes.map((p) => p.id)).toEqual([
      'ui-components',
      'utilities',
      'routes-pages',
      'business-rules',
      'architecture',
      'conventions',
      'dependencies',
      'tests-tooling',
    ])
    expect(plan.existing.glossary).toBe(1)
    expect(plan.unrecorded).toBeGreaterThan(0)
    expect(plan.layout).toBe('by-kind')
    const pass = (id: string) => plan.passes.find((p) => p.id === id)
    expect(pass('ui-components')?.files).toEqual([
      'src/components/counter.tsx',
      'src/components/dialog-panel.tsx',
      'src/components/ui/button.tsx',
      'src/components/user-card.tsx',
    ])
    expect(pass('ui-components')?.steps.join('\n')).toContain('Kosmesis components installed in src/components/ui')
    expect(pass('ui-components')?.steps.join('\n')).toContain('Morphos primitives in use: Dialog')
    expect(pass('routes-pages')?.files).toEqual(['src/app.tsx', 'src/pages/about.tsx', 'src/pages/home.tsx'])
    expect(pass('business-rules')?.files).toContain('src/__tests__/format.test.ts')
    expect(pass('dependencies')?.files).toEqual(['package.json', 'components.json'])
    expect(pass('dependencies')?.steps[0]).toContain('style system tailwind, components in src/components/ui, 1 installed')
    expect(pass('utilities')?.steps.at(-1)).toContain('Only record what the code shows')
  })

  it('describes projects without UI libraries, feature-slice projects, and long file lists', () => {
    const many = Object.fromEntries(Array.from({ length: 70 }, (_, k) => [`src/features/shop/lib/f${String(k)}.ts`, `export function f${String(k)}() {}`]))
    const plan = bootstrapPlan(store({ 'package.json': '{}', ...many }))
    const pass = (id: string) => plan.passes.find((p) => p.id === id)
    expect(plan.layout).toBe('feature-slice')
    expect(pass('ui-components')?.steps).toContain('No Kosmesis components found.')
    expect(pass('ui-components')?.steps).toContain('No Morphos imports found.')
    expect(pass('conventions')?.steps[0]).toContain('Feature-slice project (features: shop)')
    expect(pass('dependencies')?.steps[0]).toBe('Kosmesis is not set up (no components.json).')
    expect(pass('utilities')?.files).toHaveLength(60)
    expect(pass('utilities')?.steps[0]).toBe('70 files: the first 60 are listed; use praxisjs_inspect_project for the rest.')
    expect(bootstrapPlan(store({})).passes.find((p) => p.id === 'conventions')?.steps[0]).toBe('Layout by kind: no source folders yet.')
  })
})

describe('upsertEntries', () => {
  const button = { title: 'Button', summary: 'A button.', location: 'src/components/button.tsx', exports: ['Button'], purpose: 'Clicks.' }

  it('adds new entries, and only reports in a dry run', () => {
    const s = store({})
    expect(upsertEntries(s, [{ category: 'components', entry: button }], { dryRun: true })).toEqual([{ category: 'components', id: 'button', status: 'add' }])
    expect(s.get('components', 'button')).toBeUndefined()
    expect(upsertEntries(s, [{ category: 'components', entry: { ...button, id: 'btn' } }], { dryRun: true })[0].id).toBe('btn')
    expect(upsertEntries(s, [{ category: 'components', entry: button }])).toEqual([{ category: 'components', id: 'button', status: 'add' }])
    expect(s.get('components', 'button')?.fields.title).toBe('Button')
  })

  it('updates the matching entry, merges lists and leaves identical ones alone', () => {
    const s = store({})
    upsertEntries(s, [{ category: 'components', entry: { ...button, tags: ['ui'] } }])
    expect(upsertEntries(s, [{ category: 'components', entry: { title: 'Other title', location: 'src/components/button.tsx', exports: ['Button'], tags: ['form'], usage: '<Button />' } }])).toEqual([
      { category: 'components', id: 'button', status: 'needs-confirmation', changed: ['title'], message: expect.stringContaining('confirmRewrite') as unknown as string },
    ])
    expect(upsertEntries(s, [{ category: 'components', entry: { location: 'src/components/button.tsx', tags: ['form'], usage: '<Button />' } }])).toEqual([
      { category: 'components', id: 'button', status: 'update', changed: ['tags', 'usage'] },
    ])
    expect(s.get('components', 'button')?.fields.tags).toEqual(['form', 'ui'])
    expect(upsertEntries(s, [{ category: 'components', entry: { ...button, tags: ['ui'] } }])).toEqual([{ category: 'components', id: 'button', status: 'unchanged' }])
    expect(upsertEntries(s, [{ category: 'components', entry: { id: 'button', purpose: 'Every action.' } }], { confirmRewrite: true })[0]).toMatchObject({ status: 'update', changed: ['purpose'] })
    expect(upsertEntries(s, [{ category: 'components', entry: { id: 'button', purpose: 'Other.' } }], { dryRun: true, confirmRewrite: true })[0]).toMatchObject({ status: 'update' })
    expect(s.get('components', 'button')?.sections.purpose).toBe('Every action.')
  })

  it('fills unreviewed entries freely and drops their unreviewed tag', () => {
    const s = store({})
    s.add('utilities', { title: 'Fmt', summary: 'Undocumented.', kind: 'function', location: 'src/f.ts', exports: ['fmt'], purpose: 'TODO', tags: ['unreviewed'] })
    expect(upsertEntries(s, [{ category: 'utilities', entry: { location: 'src/f.ts', exports: ['fmt'], summary: 'Formats.', purpose: 'Formatting.' } }])[0]).toMatchObject({
      status: 'update',
      changed: ['summary', 'purpose', 'tags'],
    })
    expect(s.get('utilities', 'fmt')?.fields.tags).toBeUndefined()
    s.add('utilities', { title: 'Keep', summary: 's', kind: 'function', location: 'src/k.ts', purpose: 'TODO', tags: ['unreviewed', 'x'] })
    upsertEntries(s, [{ category: 'utilities', entry: { location: 'src/k.ts', purpose: 'Real.', tags: ['unreviewed'] } }])
    expect(s.get('utilities', 'keep')?.fields.tags).toEqual(['unreviewed', 'x'])
    s.add('utilities', { title: 'Tagged', summary: 's', kind: 'function', location: 'src/t.ts', purpose: 'TODO', tags: ['unreviewed'] })
    expect(upsertEntries(s, [{ category: 'utilities', entry: { location: 'src/t.ts', purpose: 'Real.', tags: ['y'] } }])[0].changed).toEqual(['purpose', 'tags'])
  })

  it('matches by title, including numbered decisions, and reports invalid input', () => {
    const s = store({})
    s.add('architecture', { title: 'Use stores', summary: 's', context: 'c', decision: 'd' })
    expect(upsertEntries(s, [{ category: 'architecture', entry: { title: 'Use stores', consequences: 'More files.' } }])[0]).toMatchObject({ id: '0001-use-stores', status: 'update' })
    s.add('glossary', { title: 'Cart Item', id: 'line', summary: 's', definition: 'd' })
    expect(upsertEntries(s, [{ category: 'glossary', entry: { title: 'Cart Item', aliases: ['line item'] } }])[0]).toMatchObject({ id: 'line', status: 'update' })
    expect(upsertEntries(s, [{ category: 'glossary', entry: { title: 'cart item', definition: 'other' } }])[0]).toMatchObject({ id: 'line', status: 'needs-confirmation' })
    expect(upsertEntries(s, [{ category: 'components', entry: { location: 'src/new.tsx', title: 'New' } }])[0]).toMatchObject({ status: 'invalid' })
    expect(upsertEntries(s, [{ category: 'glossary', entry: { id: 'line', definition: '' } }], { confirmRewrite: true })[0]).toMatchObject({ status: 'invalid', id: 'line' })
    expect(upsertEntries(s, [{ category: 'nope', entry: {} }, { category: 'glossary', entry: [] }])).toEqual([
      { category: 'nope', status: 'invalid', message: 'unknown category' },
      { category: 'glossary', status: 'invalid', message: '"entry" must be an object of entry fields' },
    ])
  })

  it('refuses to write to a memory in an older format, but still plans', () => {
    const s = store({})
    writeFile(s.root, '.praxis/index.md', '# old\n')
    expect(() => upsertEntries(s, [{ category: 'components', entry: button }])).toThrow('praxisjs_memory_migrate')
    expect(upsertEntries(s, [{ category: 'components', entry: button }], { dryRun: true })[0].status).toBe('add')
  })

  it('rethrows unexpected errors', () => {
    const s = store({})
    const broken = new Proxy({}, { ownKeys: () => { throw new RangeError('boom') } })
    expect(() => upsertEntries(s, [{ category: 'components', entry: broken }])).toThrow(RangeError)
  })
})
