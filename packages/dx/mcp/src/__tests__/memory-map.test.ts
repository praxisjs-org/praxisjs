import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { detectLayout } from '../knowledge/layout.js'
import { findDuplicates, mapProject, reusableItems, structureConvention, uiLibrariesConvention } from '../memory/map.js'
import { MemoryStore } from '../memory/store.js'
import { scanProject } from '../project/scan.js'

import { APP_FILES, makeProject, removeProjects, writeFile } from './fixtures.js'

afterEach(removeProjects)

function appStore() {
  const store = new MemoryStore(makeProject(APP_FILES), () => '2026-10-15')
  store.init()
  return store
}

describe('reusableItems', () => {
  it('leaves out pages, the app root, local classes and tests', () => {
    const names = reusableItems(scanProject(makeProject(APP_FILES))).map((i) => i.name)
    expect(names.sort()).toEqual(
      ['ApiService', 'CardStyles', 'CartStore', 'Counter', 'FancyCounter', 'LogCalls', 'Money', 'Online', 'Traced', 'UserCard', 'formatPrice'].sort(),
    )
  })
})

describe('mapProject', () => {
  it('proposes prefilled entries for unrecorded code', () => {
    const map = mapProject(appStore())
    const byName = new Map(map.proposals.map((p) => [p.item.name, p]))
    expect(byName.get('UserCard')).toMatchObject({
      category: 'components',
      entry: {
        title: 'UserCard',
        summary: "Shows a user's name and avatar.",
        location: 'src/components/user-card.tsx',
        exports: ['UserCard'],
        purpose: "Shows a user's name and avatar.",
        api: 'Props: `{ name: string }`',
      },
    })
    expect(byName.get('Counter')?.entry).toMatchObject({
      summary: 'Undocumented stateful component in src/components/counter.tsx.',
      tags: ['unreviewed'],
      api: 'Props: `start`, `onChange`',
    })
    expect(byName.get('formatPrice')?.entry).toMatchObject({ kind: 'function', api: '`formatPrice(cents: number): string`' })
    expect(byName.get('CartStore')?.entry).toMatchObject({ kind: 'store', summary: 'Items in the shopping cart.' })
    expect(byName.get('Money')?.entry).toMatchObject({ kind: 'class' })
    expect(byName.get('Online')?.entry.api).toBeUndefined()
    expect(map.stale).toEqual([])
    expect(map.recorded).toEqual([])
    expect(map.layout.dirs.component).toBe('src/components')
  })

  it('records proposals, skipping code already recorded by file or by export, with unique ids', () => {
    const store = appStore()
    store.add('components', { id: 'counter', title: 'Counter', summary: 's', location: 'src/components/counter.tsx', exports: ['Counter'], purpose: 'p' })
    store.add('utilities', { title: 'Formatting', summary: 's', kind: 'function', location: 'src/utils/format.ts', purpose: 'p' })
    store.add('glossary', { id: 'user-card', title: 'X', summary: 's', definition: 'd' })
    store.add('components', { id: 'user-card', title: 'Other', summary: 's', location: 'src/components/other.tsx', purpose: 'p' })
    const map = mapProject(store, { record: true })
    expect(map.proposals).toEqual([])
    expect(map.recorded).toContain('.praxis/components/user-card-2.md')
    expect(map.recorded).toContain('.praxis/components/fancy-counter.md')
    expect(map.recorded.some((f) => f.includes('format-price') || f.includes('money'))).toBe(false)
    expect(mapProject(store).proposals).toEqual([])
  })

  it('reports stale entries and where moved code lives now', () => {
    const store = appStore()
    store.add('utilities', { title: 'Cart store', summary: 's', kind: 'store', location: 'src/store.ts', exports: ['CartStore'], purpose: 'p' })
    store.add('utilities', { title: 'Gone', summary: 's', kind: 'function', location: 'src/gone.ts', exports: ['gone'], purpose: 'p' })
    store.add('utilities', { title: 'Format', summary: 's', kind: 'function', location: 'src/utils/format.ts', exports: ['formatPrice', 'CartStore', 'vanished'], purpose: 'p' })
    store.add('components', { title: 'Loose', summary: 's', location: 'src/loose.tsx', purpose: 'p' })
    store.add('business-rules', { title: 'Rule', summary: 's', rule: 'r', locations: ['src/utils/format.ts', 'src/old.ts'] })
    const stale = mapProject(store).stale
    expect(stale).toEqual([
      { entry: 'components/loose', reason: 'src/loose.tsx no longer exists', movedTo: undefined },
      { entry: 'utilities/cart-store', reason: 'src/store.ts no longer exists', movedTo: 'src/stores/cart-store.ts' },
      { entry: 'utilities/format', reason: 'src/utils/format.ts no longer exports CartStore', movedTo: 'src/stores/cart-store.ts' },
      { entry: 'utilities/format', reason: 'src/utils/format.ts no longer exports vanished', movedTo: undefined },
      { entry: 'utilities/gone', reason: 'src/gone.ts no longer exists', movedTo: undefined },
      { entry: 'business-rules/rule', reason: 'src/old.ts no longer exists' },
    ])
  })

  it('treats an unreadable recorded file as exporting nothing', () => {
    const store = appStore()
    fs.symlinkSync(path.join(store.root, 'nowhere'), path.join(store.root, 'src', 'link.ts'))
    fs.mkdirSync(path.join(store.root, 'src', 'dir.ts'))
    store.add('utilities', { title: 'Dir', summary: 's', kind: 'function', location: 'src/dir.ts', exports: ['x'], purpose: 'p' })
    expect(mapProject(store).stale).toEqual([{ entry: 'utilities/dir', reason: 'src/dir.ts no longer exports x', movedTo: undefined }])
  })
})

describe('structureConvention', () => {
  it('describes where each kind lives, with defaults for the missing ones', () => {
    const entry = structureConvention(detectLayout(scanProject(makeProject({ 'src/store.ts': '@Storable()\nexport class S extends ReactiveStore {}' }))))
    expect(entry).toMatchObject({ id: 'project-structure', scope: 'structure', paths: ['src/**'] })
    const rule = String(entry.rule)
    expect(rule).toContain('- Stores: `src/stores/` (existing ones in src/ move there when the next one is added)')
    expect(rule).toContain('- Reusable components: none yet; the first one goes in `src/components/`')
    expect(rule).toContain('Tests live in `__tests__/` folders')
  })

  it('follows the existing folders and colocated tests', () => {
    const root = makeProject(APP_FILES)
    writeFile(root, 'src/utils/format.test.ts', '')
    fs.rmSync(path.join(root, 'src/__tests__'), { recursive: true })
    const rule = String(structureConvention(detectLayout(scanProject(root))).rule)
    expect(rule).toContain('- Reusable components: `src/components/`')
    expect(rule).toContain('Tests sit next to the code they test')
  })
})

describe('findDuplicates', () => {
  it('finds framework, memory and code matches', () => {
    const store = appStore()
    store.add('utilities', { title: 'Price formatter', summary: 'Formats a price for display.', kind: 'function', location: 'src/utils/format.ts', purpose: 'p' })
    store.add('glossary', { title: 'Price', summary: 'What the customer pays, formatted with two decimals.', definition: 'In cents.' })
    writeFile(store.root, 'src/utils/price.ts', 'export const formatPriceRange = async (a: number, b: number) => `${a}-${b}`\nexport const priceFormat = function format(v) { return v }')
    const matches = findDuplicates(store, 'format a price')
    expect(matches.map((m) => `${m.source}:${m.name}`)).toEqual([
      'memory:Price formatter',
      'code:formatPrice',
      'code:formatPriceRange',
      'code:priceFormat',
    ])
    const proposals = mapProject(store).proposals.map((p) => p.entry.api)
    expect(proposals).toContain('`formatPriceRange = async (a: number, b: number) =>`')
    const debounce = findDuplicates(store, 'debounce the search input', 'searchDebounce')
    expect(debounce[0]).toMatchObject({ source: 'framework', name: 'Debounce', where: '@praxisjs/decorators (docs: decorators/timing)' })
  })

  it('works without a project memory and describes undocumented code', () => {
    const store = new MemoryStore(makeProject(APP_FILES))
    const matches = findDuplicates(store, 'api service')
    expect(matches.find((m) => m.source === 'code')).toMatchObject({ name: 'ApiService', summary: 'service (undocumented)', where: 'src/services/api.ts:3' })
    expect(findDuplicates(store, 'zzzz qqqq')).toEqual([])
  })
})

describe('mapProject — UI libraries', () => {
  const UI_FILES = {
    ...APP_FILES,
    'components.json': JSON.stringify({ styleSystem: 'tailwind', aliases: { ui: 'src/components/ui' } }),
    'components.lock.json': JSON.stringify({
      components: { button: { version: '1.2.0', files: { 'src/components/ui/button.tsx': 'sha256-x' } }, card: { files: { 'src/components/ui/card.tsx': 'sha256-y' } } },
    }),
    'src/components/ui/button.tsx': '/** A styled button. More text. */\n@Component()\nexport class Button extends StatefulComponent {\n  @Prop() variant = "default"\n  render() { return null }\n}',
    'src/components/ui/card.tsx': '@Component()\nexport class Card extends StatelessComponent { render() { return null } }',
    'src/components/dialog-panel.tsx': "import { Dialog, DialogContent } from '@morphos/overlays'\n@Component()\nexport class DialogPanel extends StatefulComponent {}",
  }

  it('proposes Kosmesis components with their docs and update workflow', () => {
    const store = new MemoryStore(makeProject(UI_FILES))
    store.init()
    const map = mapProject(store)
    const byName = new Map(map.proposals.map((p) => [p.item.name, p.entry]))
    expect(byName.get('Button')).toMatchObject({ summary: 'A styled button.', tags: ['kosmesis'], api: 'Props: `variant`' })
    expect(String(byName.get('Button')?.purpose)).toContain('Kosmesis component `button` (registry version 1.2.0)')
    expect(String(byName.get('Button')?.purpose)).toContain('https://kosmesis.praxisjs.org/docs/components/button')
    expect(byName.get('Card')).toMatchObject({ summary: 'Kosmesis card component, installed with the kosmesis CLI.' })
    expect(byName.get('Card')?.api).toBeUndefined()
    expect(map.uiLibraries).toBe('missing')
  })

  it('records and refreshes conventions/ui-libraries', () => {
    const store = new MemoryStore(makeProject(UI_FILES))
    store.init()
    const first = mapProject(store, { record: true })
    expect(first.uiLibraries).toBe('recorded')
    expect(first.recorded).toContain('.praxis/conventions/ui-libraries.md')
    const rule = String(store.get('conventions', 'ui-libraries')?.sections.rule)
    expect(rule).toContain('style system `tailwind`')
    expect(rule).toContain('`button`, `card`')
    expect(rule).toContain('`Dialog` (@morphos/overlays), `DialogContent` (@morphos/overlays)')
    expect(mapProject(store).uiLibraries).toBe('current')
    store.update('conventions', 'ui-libraries', { rule: 'old' })
    expect(mapProject(store).uiLibraries).toBe('outdated')
    expect(mapProject(store, { record: true }).uiLibraries).toBe('recorded')
    expect(mapProject(new MemoryStore(makeProject(APP_FILES))).uiLibraries).toBe('none')
  })

  it('describes Morphos-only and Kosmesis-only projects', () => {
    const morphosOnly = uiLibrariesConvention(scanProject(makeProject({ 'src/a.tsx': "import { Tabs } from '@morphos/layout'" })), undefined, [])
    expect(morphosOnly?.paths).toEqual(['src/**'])
    expect(String(morphosOnly?.rule)).not.toContain('Kosmesis')
    const kosmesisOnly = uiLibrariesConvention(scanProject(makeProject()), { styleSystem: 'praxisjs-css', uiDir: 'ui', registry: 'r', registries: {} }, [])
    expect(String(kosmesisOnly?.rule)).toContain('Components live in `ui/`.')
    expect(String(kosmesisOnly?.rule)).not.toContain('Morphos primitives')
  })
})
