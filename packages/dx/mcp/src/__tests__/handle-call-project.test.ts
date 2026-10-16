import fs from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MemoryStore } from '../memory/store.js'

import { APP_FILES, makeProject, removeProjects, writeFile } from './fixtures.js'

const mockFetchDocs = vi.fn()

vi.mock('../tools/fetch-docs.js', () => ({ fetchDocs: mockFetchDocs }))

const { handleCall } = await import('../handle-call.js')

const FULL_DOCS = `# Timing (/docs/decorators/timing)

Rate control.

## \`@Debounce(ms)\` [#debouncems]

Delays method execution until calls settle.
`

let root: string
const context = () => ({ root: () => root })
const store = () => new MemoryStore(root)
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const result = await handleCall(name, args, context())
  return { text: result.content[0].text, isError: result.isError === true }
}

beforeEach(() => {
  mockFetchDocs.mockReset()
  mockFetchDocs.mockResolvedValue(FULL_DOCS)
  root = makeProject(APP_FILES)
})

afterEach(removeProjects)

describe('docs tools', () => {
  it('searches the docs', async () => {
    const found = await call('praxisjs_search_docs', { query: 'debounce', limit: 3, includeChangelog: true })
    expect(found.text).toContain('- decorators/timing#debouncems — Timing › `@Debounce(ms)`')
    expect(found.text).toContain('praxisjs_get_page')
    expect((await call('praxisjs_search_docs', { query: 'rate control' })).text).toContain('- decorators/timing — Timing › Timing')
    expect((await call('praxisjs_search_docs', { query: 'zebra' })).text).toContain('No docs section matches "zebra"')
    expect(await call('praxisjs_search_docs', { query: '  ' })).toEqual({ text: 'Error: "query" argument is required.', isError: true })
  })

  it('describes an API with its installed signature and docs section', async () => {
    writeFile(root, 'node_modules/@praxisjs/decorators/package.json', JSON.stringify({ types: 'index.d.ts' }))
    writeFile(root, 'node_modules/@praxisjs/decorators/index.d.ts', 'export declare function Debounce(ms: number): MethodDecorator;')
    const text = (await call('praxisjs_api_reference', { symbol: '@Debounce' })).text
    expect(text).toContain('# Debounce — @praxisjs/decorators')
    expect(text).toContain("import { Debounce } from '@praxisjs/decorators'")
    expect(text).toContain('export declare function Debounce(ms: number): MethodDecorator;')
    expect(text).toContain('## Docs: `@Debounce(ms)`')
  })

  it('flags reactive and stateful-only APIs, truncates long sections and survives docs failures', async () => {
    mockFetchDocs.mockResolvedValueOnce(`# State (/docs/decorators/state)\n\n## \`@State()\`\n\n${'x'.repeat(4100)}`)
    const text = (await call('praxisjs_api_reference', { symbol: 'State' })).text
    expect(text).toContain('(reactive: read it inside a JSX arrow) (StatefulComponent only)')
    expect(text).toContain('is not installed in this project')
    expect(text).toContain('\n…')
    mockFetchDocs.mockRejectedValueOnce(new Error('offline'))
    expect((await call('praxisjs_api_reference', { symbol: 'Lazy' })).text).toContain('# Lazy — @praxisjs/router')
  })

  it('suggests close names for an unknown symbol', async () => {
    expect((await call('praxisjs_api_reference', { symbol: 'Debounced' })).text).toBe(
      'No PraxisJS export is named "Debounced". Did you mean: Debounce (@praxisjs/decorators)?',
    )
    expect((await call('praxisjs_api_reference', { symbol: 'Zzz' })).text).toContain('Try praxisjs_search_docs')
  })

  it('lists APIs by kind and package, with signatures when asked', async () => {
    writeFile(root, 'node_modules/@praxisjs/composables/package.json', JSON.stringify({ types: 'index.d.ts' }))
    writeFile(root, 'node_modules/@praxisjs/composables/index.d.ts', 'export declare class WindowSize extends Composable {\n  width: number;\n}')
    const text = (await call('praxisjs_list_apis', { kind: 'composable', signatures: true })).text
    expect(text.startsWith('## @praxisjs/composables')).toBe(true)
    expect(text).toContain('- `WindowSize` (composable) — Reactive window width and height. [docs: composables/dom]\n  `class WindowSize extends Composable {`')
    expect((await call('praxisjs_list_apis', { package: '@praxisjs/fsm' })).text).toContain('`StateMachine`')
    expect((await call('praxisjs_list_apis', { package: 'nope' })).text).toBe('No PraxisJS export matches these filters.')
    const all = (await call('praxisjs_list_apis')).text
    expect(all.indexOf('## @praxisjs/composables')).toBeLessThan(all.indexOf('## @praxisjs/core'))
  })
})

describe('project tools', () => {
  it('inspects the project', async () => {
    expect((await call('praxisjs_inspect_project')).text).toContain('# demo-app')
  })

  it('validates source text, a file and a folder', async () => {
    expect((await call('praxisjs_validate_file', { source: 'class A extends StatefulComponent { render() {} }' })).text).toBe(
      '- source.tsx:1 error [missing-component] A extends StatefulComponent but has no @Component() decorator. (docs: essentials/components)',
    )
    expect((await call('praxisjs_validate_file', { source: 'export const a = 1', filename: 'a.ts' })).text).toBe('No problems found.')
    expect((await call('praxisjs_validate_file', { path: 'src/components/user-card.tsx' })).text).toBe('1 file checked: no problems found.')
    writeFile(root, 'src/components/bad.tsx', '@Component()\nclass Bad extends StatefulComponent {\n  @State() accessor x = 1\n  render() { return null }\n}')
    writeFile(root, 'src/components/bad.test.tsx', 'class T extends StatefulComponent {}')
    const folder = (await call('praxisjs_validate_file', { path: 'src' })).text
    expect(folder).toMatch(/^\d+ files checked, 1 finding\(s\):/)
    expect(folder).toContain('- src/components/bad.tsx:3 error [accessor-keyword]')
    expect(await call('praxisjs_validate_file', { path: 'src/missing.ts' })).toEqual({ text: 'Error: src/missing.ts does not exist.', isError: true })
    expect((await call('praxisjs_validate_file', { path: '../outside' })).isError).toBe(true)
    expect((await call('praxisjs_validate_file', {})).text).toBe('Error: "path" argument is required.')
  })
})

describe('scaffold tool', () => {
  it('plans a file with its test, docs, notes and similar code', async () => {
    const text = (await call('praxisjs_scaffold', { kind: 'component', name: 'Counter', stateful: true, route: '/ignored' })).text
    expect(text).toContain('File: src/components/counter.tsx (ALREADY EXISTS — edit it instead of creating another)')
    expect(text).toContain('```tsx\nimport { StatefulComponent }')
    expect(text).toContain('Test: src/__tests__/counter.test.tsx\n\n```tsx')
    expect(text).toContain('Read before writing: essentials/components, decorators/state, essentials/reactivity (praxisjs_get_page).')
    expect(text).toContain('Note: No Vitest config found')
    expect(text).toContain('Similar things that may already cover it:\n- [code] Counter — src/components/counter.tsx:4')
    expect(text).toContain('After creating it, validate with praxisjs_validate_file')
  })

  it('uses ts fences for non-JSX files and skips empty sections', async () => {
    writeFile(root, '.praxisjs-ai.json', JSON.stringify({ tests: false }))
    const text = (await call('praxisjs_scaffold', { kind: 'function', name: 'zz-qq' })).text
    expect(text).toBe('File: src/utils/zz-qq.ts\n\n```ts\n/** What zzQq does and when to use it. */\nexport function zzQq(): void {\n}\n```\n\nAfter creating it, validate with praxisjs_validate_file and record it with praxisjs_memory_add.')
    writeFile(root, '.praxisjs-ai.json', '{}')
    writeFile(root, 'src/__tests__/zz-qq.test.ts', '')
    expect((await call('praxisjs_scaffold', { kind: 'store', name: 'ZzQq' })).text).toContain('Test: src/__tests__/zz-qq.test.ts (already exists)\n\n```ts')
  })

  it('rejects an unknown kind or a missing name', async () => {
    expect((await call('praxisjs_scaffold', { kind: 'widget', name: 'X' })).text).toContain('"kind" must be one of: page, component')
    expect((await call('praxisjs_scaffold', { kind: 'component' })).text).toBe('Error: "name" argument is required.')
  })
})

describe('tool coverage', () => {
  it('handles every tool it defines', async () => {
    const { TOOL_DEFINITIONS } = await import('../tool-definitions.js')
    for (const tool of TOOL_DEFINITIONS) {
      expect((await call(tool.name, {})).text).not.toContain('Unknown tool')
    }
  })
})

describe('memory tools', () => {
  it('asks for init before anything else', async () => {
    for (const tool of ['praxisjs_memory_list', 'praxisjs_memory_search', 'praxisjs_memory_add', 'praxisjs_memory_map']) {
      expect((await call(tool, { query: 'x', category: 'components', entry: {} })).text).toContain('run praxisjs_memory_init first')
    }
  })

  it('initializes once, records the project structure and reports unrecorded code', async () => {
    const first = (await call('praxisjs_memory_init')).text
    expect(first).toContain('Created .praxis/README.md, .praxis/index.md.')
    expect(first).toContain('Recorded .praxis/conventions/project-structure.md.')
    expect(first).toContain('reusable item(s) not recorded yet')
    expect(first).toContain("- components: UserCard (component) — src/components/user-card.tsx:5: Shows a user's name and avatar.")
    expect(first).toContain('- utilities: ApiService (service) — src/services/api.ts:3 (undocumented)')
    const second = (await call('praxisjs_memory_init')).text
    expect(second).toContain('.praxis/ already exists; README.md and index.md refreshed.')
    expect(second).not.toContain('Recorded')
  })

  it('adds, reads, searches, updates and removes entries', async () => {
    await call('praxisjs_memory_init')
    const added = await call('praxisjs_memory_add', {
      category: 'business-rules',
      entry: { title: 'Cart limit', summary: 'At most 20 items.', rule: 'Reject the 21st item.', locations: ['src/missing.ts'] },
    })
    expect(added.text).toBe('Added .praxis/business-rules/cart-limit.md.\nWarning: src/missing.ts does not exist (yet).')
    await call('praxisjs_memory_add', { category: 'glossary', entry: { title: 'Cart', summary: 'Items to buy.', definition: 'd', tags: ['shop'], related: ['business-rules/cart-limit'] } })

    const got = (await call('praxisjs_memory_get', { category: 'business-rules', id: 'cart-limit' })).text
    expect(got).toBe('# Cart limit\n\nbusiness-rules/cart-limit — At most 20 items.\n\n- locations: src/missing.ts\n\n## Rule\n\nReject the 21st item.')
    expect(await call('praxisjs_memory_get', { category: 'glossary', id: 'nope' })).toEqual({ text: 'Error: glossary/nope does not exist.', isError: true })

    await call('praxisjs_memory_add', { category: 'utilities', entry: { title: 'Api', summary: 'HTTP client.', kind: 'service', location: 'src/services/api.ts', exports: ['ApiService'], purpose: 'p' } })
    expect((await call('praxisjs_memory_get', { category: 'utilities', id: 'api' })).text).toContain('- kind: service\n- location: src/services/api.ts\n- exports: ApiService')
    expect((await call('praxisjs_memory_list', { category: 'utilities' })).text).toBe('- utilities/api — **Api**: HTTP client. (src/services/api.ts)')
    writeFile(root, '.praxis/glossary/empty-list.md', '---\nid: empty-list\ntitle: E\nsummary: s\naliases: []\n---\n\n## Definition\n\nd\n')
    expect((await call('praxisjs_memory_get', { category: 'glossary', id: 'empty-list' })).text).not.toContain('aliases')
    fs.rmSync(path.join(root, '.praxis/glossary/empty-list.md'))
    expect((await call('praxisjs_memory_list', { tag: 'shop' })).text).toBe('- glossary/cart — **Cart**: Items to buy.')
    expect((await call('praxisjs_memory_list', { category: 'architecture' })).text).toBe('No entries.')
    writeFile(root, '.praxis/glossary/broken.md', 'oops')
    expect((await call('praxisjs_memory_list', { category: 'glossary' })).text).toContain('- .praxis/glossary/broken.md: missing frontmatter')
    fs.rmSync(path.join(root, '.praxis/glossary/broken.md'))

    expect((await call('praxisjs_memory_search', { query: 'cart', category: 'glossary', limit: 5 })).text).toBe('- glossary/cart — **Cart**: Items to buy.\n  Items to buy.')
    expect((await call('praxisjs_memory_search', { query: 'structure' })).text).toContain('conventions/project-structure')
    expect((await call('praxisjs_memory_search', { query: 'zebra' })).text).toBe('Nothing in the project memory matches "zebra".')

    expect((await call('praxisjs_memory_update', { category: 'business-rules', id: 'cart-limit', changes: { summary: 'At most 30 items.' } })).text).toContain(
      'Updated .praxis/business-rules/cart-limit.md.',
    )
    expect((await call('praxisjs_memory_remove', { category: 'business-rules', id: 'cart-limit' })).text).toBe(
      'Removed .praxis/business-rules/cart-limit.md.\nStill referenced by: glossary/cart (update their "related").',
    )
    expect((await call('praxisjs_memory_remove', { category: 'glossary', id: 'cart' })).text).toBe('Removed .praxis/glossary/cart.md.')
  })

  it('validates tool arguments', async () => {
    await call('praxisjs_memory_init')
    expect((await call('praxisjs_memory_get', { category: 'nope', id: 'x' })).text).toContain('"category" must be one of: components, utilities')
    expect((await call('praxisjs_memory_add', { category: 'glossary', entry: 'text' })).text).toBe('Error: "entry" must be an object of entry fields.')
    expect((await call('praxisjs_memory_update', { category: 'glossary', id: 'x', changes: [] })).text).toBe('Error: "changes" must be an object of entry fields.')
    expect((await call('praxisjs_memory_update', { category: 'glossary', id: 'x', changes: null })).isError).toBe(true)
    expect((await call('praxisjs_memory_search', { query: 'x', category: 'bad' })).isError).toBe(true)
    expect((await call('praxisjs_memory_list', { category: 'bad' })).isError).toBe(true)
  })

  it('maps the code, records proposals and reports stale entries', async () => {
    await call('praxisjs_memory_init')
    expect((await call('praxisjs_memory_map', { record: true })).text).toMatch(/^Recorded \d+ entries:\n- \.praxis\//)
    expect((await call('praxisjs_memory_map', { record: true })).text).toBe('Nothing new to record.')
    expect((await call('praxisjs_memory_map')).text).toBe('Every reusable component and utility found in the code is recorded.')
    fs.renameSync(path.join(root, 'src/stores/cart-store.ts'), path.join(root, 'src/cart-store.ts'))
    fs.rmSync(path.join(root, 'src/services/api.ts'))
    const map = (await call('praxisjs_memory_map')).text
    expect(map).toContain('1 reusable item(s) not recorded yet')
    expect(map).toContain('2 stale entries:')
    expect(map).toContain('- utilities/cart-store: src/stores/cart-store.ts no longer exists; now found in src/cart-store.ts (update its location)')
    expect(map).toContain('- utilities/api-service: src/services/api.ts no longer exists; remove the entry if the code is gone')
    fs.rmSync(path.join(root, 'src/cart-store.ts'))
    await call('praxisjs_memory_remove', { category: 'utilities', id: 'api-service' })
    expect((await call('praxisjs_memory_map')).text).toContain('1 stale entry:')
  })

  it('checks for duplicates with or without a memory', async () => {
    const none = (await call('praxisjs_memory_check_duplicate', { description: 'zebra quagga' })).text
    expect(none).toBe(
      'Nothing similar found in PraxisJS, the project memory (not set up) or the code. Write it in the folder conventions/project-structure names, then record it with praxisjs_memory_add.',
    )
    await call('praxisjs_memory_init')
    expect((await call('praxisjs_memory_check_duplicate', { description: 'zebra quagga' })).text).toContain('the project memory or the code')
    await call('praxisjs_memory_add', { category: 'utilities', entry: { title: 'Price formatter', summary: 'Formats prices.', kind: 'function', location: 'src/utils/format.ts', purpose: 'p' } })
    const found = (await call('praxisjs_memory_check_duplicate', { description: 'format price', name: 'formatPrice' })).text
    expect(found).toContain('Recorded in the project memory:\n- Price formatter — utilities/price-formatter (src/utils/format.ts): Formats prices. (match 100%)')
    expect(found).toContain('Found in the project code:\n- formatPrice — src/utils/format.ts:2')
    expect(found).toContain('Reuse or extend one of these')
    expect((await call('praxisjs_memory_check_duplicate', { description: 'debounce search input' })).text).toContain('PraxisJS already ships:\n- Debounce')
  })
})

describe('errors', () => {
  it('reports thrown values that are not errors', async () => {
    const result = await handleCall('praxisjs_inspect_project', {}, {
      root: () => {
        throw 'no root'
      },
    })
    expect(result).toEqual({ content: [{ type: 'text', text: 'Error: no root' }], isError: true })
  })

  it('uses the working directory by default', async () => {
    const result = await handleCall('praxisjs_list_apis', { package: 'nope' })
    expect(result.content[0].text).toBe('No PraxisJS export matches these filters.')
  })
})

describe('Morphos and Kosmesis', () => {
  const registryIndex = JSON.stringify({
    items: [
      { name: 'button', version: '1.2.0', description: 'A styled button.', dependencies: ['@morphos/inputs'], registryDependencies: ['spinner'] },
      { name: 'card', version: '1.0.0', title: 'Card' },
      { name: 'empty' },
    ],
  })

  function withKosmesis() {
    writeFile(root, 'components.json', JSON.stringify({ styleSystem: 'tailwind', aliases: { ui: 'src/components/ui' }, registry: 'registry', registries: { '@acme': 'https://acme.example/r' } }))
    writeFile(root, 'registry/tailwind/index.json', registryIndex)
    writeFile(root, 'components.lock.json', JSON.stringify({ components: { button: { version: '1.0.0', files: { 'src/components/ui/button.tsx': 'sha256-x' } } } }))
    writeFile(root, 'src/components/ui/button.tsx', '@Component()\nexport class Button extends StatefulComponent { render() { return null } }')
    writeFile(root, 'src/components/ui/legacy.tsx', 'export class Legacy {}')
    writeFile(root, 'src/components/panel.tsx', "import { Dialog } from '@morphos/overlays'\nexport class Panel {}")
    writeFile(root, 'node_modules/@morphos/overlays/package.json', JSON.stringify({ types: 'index.d.ts' }))
    writeFile(root, 'node_modules/@morphos/overlays/index.d.ts', 'export declare class Dialog { open(): void }')
  }

  it('reads the Morphos and Kosmesis docs', async () => {
    await call('praxisjs_overview', { library: 'morphos' })
    await call('praxisjs_full_docs', { library: 'kosmesis' })
    await call('praxisjs_get_page', { page: 'components/button', library: 'kosmesis' })
    expect(mockFetchDocs.mock.calls.map((c) => c[0])).toEqual([
      { format: 'overview', library: 'morphos' },
      { format: 'full', library: 'kosmesis' },
      { format: 'page', page: 'components/button', library: 'kosmesis' },
    ])
    expect((await call('praxisjs_search_docs', { query: 'debounce', library: 'morphos' })).text).toContain('library: "morphos"')
    expect((await call('praxisjs_overview', { library: 'react' })).text).toBe('Error: "library" must be one of: praxisjs, morphos, kosmesis.')
  })

  it('finds Morphos exports in the installed packages', async () => {
    withKosmesis()
    const text = (await call('praxisjs_api_reference', { symbol: 'Dialog' })).text
    expect(text).toContain('# Dialog — @morphos/overlays (Morphos)')
    expect(text).toContain('export declare class Dialog { open(): void }')
    expect((await call('praxisjs_api_reference', { symbol: 'Nothing' })).text).toContain('No PraxisJS export is named "Nothing"')
  })

  it('reports UI libraries in the project inspection', async () => {
    withKosmesis()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const text = (await call('praxisjs_inspect_project')).text
    expect(text).toContain('## UI libraries (Morphos, Kosmesis)')
    expect(text).toContain('  - `Dialog` (@morphos/overlays) — src/components/panel.tsx')
    expect(text).toContain('  - `button`: version 1.0.0, 1.2.0 available, edited locally')
    vi.unstubAllGlobals()
  })

  it('lists registry components with their install status', async () => {
    withKosmesis()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [{ name: 'chart', version: '2.0.0', description: 'Charts.' }] }))))
    const all = (await call('praxisjs_ui_components')).text
    expect(all).toContain('Kosmesis (tailwind), components in src/components/ui/.')
    expect(all).toContain('- `button` 1.2.0 — A styled button. [deps: @morphos/inputs, registry:spinner] (installed: version 1.0.0, 1.2.0 available, edited locally)')
    expect(all).toContain('- `card` 1.0.0 — Card')
    expect(all).toContain('- `empty` — ')
    expect(all).toContain('- `@acme/chart` 2.0.0 — Charts.')
    expect(all).toContain('Installed but not in any reachable registry:\n- `legacy`')
    const installed = (await call('praxisjs_ui_components', { installed: true })).text
    expect(installed).toContain('`button`')
    expect(installed).not.toContain('`card`')
    expect(installed).toContain('No matching components.')
    const query = (await call('praxisjs_ui_components', { query: 'styled button' })).text
    expect(query).toContain('`button`')
    expect(query).not.toContain('`card`')
    expect(query).not.toContain('Installed but not')
    vi.unstubAllGlobals()
  })

  it('lists the public registry when Kosmesis is not set up, and reports unreachable registries', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const text = (await call('praxisjs_ui_components')).text
    expect(text).toContain('Kosmesis is not set up in this project')
    expect(text).toContain('## https://kosmesis.praxisjs.org/r\nUnreachable: offline')
    vi.unstubAllGlobals()
  })

  it('records the UI libraries convention on init', async () => {
    withKosmesis()
    const text = (await call('praxisjs_memory_init')).text
    expect(text).toContain('Recorded .praxis/conventions/ui-libraries.md.')
    expect(text).toContain('praxisjs_memory_bootstrap_plan')
    store().update('conventions', 'ui-libraries', { rule: 'old' })
    expect((await call('praxisjs_memory_map')).text).toContain('conventions/ui-libraries no longer matches')
    expect((await call('praxisjs_memory_map', { record: true })).text).toContain('Recorded conventions/ui-libraries')
    store().remove('conventions', 'ui-libraries')
    expect((await call('praxisjs_memory_map')).text).toContain('conventions/ui-libraries is missing')
  })
})

describe('feature-slice tools', () => {
  it('passes the feature to the scaffold', async () => {
    writeFile(root, 'src/features/cart/index.ts', 'export {}')
    expect((await call('praxisjs_scaffold', { kind: 'store', name: 'Cart', feature: 'cart' })).text).toContain('File: src/features/cart/stores/cart.ts')
  })
})

describe('memory bootstrap, upsert and migration tools', () => {
  it('plans the bootstrap', async () => {
    await call('praxisjs_memory_init')
    const text = (await call('praxisjs_memory_bootstrap_plan')).text
    expect(text).toContain('# Memory bootstrap plan (by-kind layout)')
    expect(text).toContain('## 1. UI components and their APIs (`ui-components`)')
    expect(text).toContain('Writes: components')
    expect(text).toContain('Run the passes below in parallel')
    expect(text).toMatch(/stale entries\./)
    store().add('utilities', { title: 'Gone', summary: 's', kind: 'function', location: 'src/gone.ts', purpose: 'p' })
    expect((await call('praxisjs_memory_bootstrap_plan')).text).toMatch(/1 stale entry\./)
    fs.rmSync(path.join(root, 'src'), { recursive: true })
    expect((await call('praxisjs_memory_bootstrap_plan')).text).toContain('Files: none found for this pass.')
  })

  it('upserts entries', async () => {
    await call('praxisjs_memory_init')
    const entries = [
      { category: 'glossary', entry: { title: 'Cart', summary: 'Items to buy.', definition: 'd' } },
      { category: 'glossary', entry: { title: 'Bad' } },
      'not an object',
    ]
    expect((await call('praxisjs_memory_upsert', { entries, dryRun: true })).text).toBe(
      [
        'Dry run: 1 add, 2 invalid.',
        '',
        '- glossary/cart: add',
        '- glossary/?: invalid — Invalid glossary term: summary: Required; definition: Required',
        '- undefined/?: invalid — unknown category',
      ].join('\n'),
    )
    expect((await call('praxisjs_memory_upsert', { entries: entries.slice(0, 1) })).text).toBe('Done: 1 add.\n\n- glossary/cart: add')
    expect((await call('praxisjs_memory_upsert', { entries: [{ category: 'glossary', entry: { title: 'Cart', definition: 'new' } }], confirmRewrite: true })).text).toBe(
      'Done: 1 update.\n\n- glossary/cart: update (definition)',
    )
    expect((await call('praxisjs_memory_upsert', { entries: [] })).isError).toBe(true)
  })

  it('migrates an old memory, dry run first', async () => {
    writeFile(root, '.praxis/index.md', '# old\n')
    writeFile(root, '.praxis/glossary/cart.md', '---\nid: cart\ntitle: Cart\nsummary: s\n---\n## Definition\nd\n')
    writeFile(root, '.praxis/glossary/bad.md', 'oops')
    writeFile(root, '.praxis/glossary/old-name.md', '---\nid: term\ntitle: Term\nsummary: s\n---\n## Definition\nd\n')
    expect((await call('praxisjs_memory_add', { category: 'glossary', entry: { title: 'X', summary: 's', definition: 'd' } })).text).toContain('run praxisjs_memory_migrate')
    const dry = (await call('praxisjs_memory_migrate')).text
    expect(dry).toBe(
      [
        'Dry run: would migrate .praxis/ from format 0 to 1: 3 change(s), 0 entries already current.',
        '- glossary/bad.md: invalid (missing frontmatter)',
        '- glossary/cart.md: rewrite',
        '- glossary/old-name.md: rename → glossary/term.md',
        '',
        'Run praxisjs_memory_migrate({ dryRun: false }) to apply. Invalid entries are kept as they are; fix them afterwards.',
      ].join('\n'),
    )
    expect((await call('praxisjs_memory_migrate', { dryRun: false })).text).toContain('Migrated .praxis/ from format 0 to 1')
    expect((await call('praxisjs_memory_migrate')).text).toContain('2 entries already current')
  })
})
