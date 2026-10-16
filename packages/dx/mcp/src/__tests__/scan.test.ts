import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_LAYOUT, detectLayout, fileBaseName, isPage, layoutKind, routedComponentNames } from '../knowledge/layout.js'
import { readOutline, scanProject } from '../project/scan.js'

import { APP_FILES, makeProject, removeProjects } from './fixtures.js'

afterEach(removeProjects)

describe('scanProject', () => {
  it('classifies components, stores, composables, services, decorators, stylesheets and helpers', () => {
    const scan = scanProject(makeProject(APP_FILES))
    const summary = scan.items.map((i) => `${i.kind}:${i.name}${i.variant ? `:${i.variant}` : ''}${i.exported ? '' : ':local'}`)
    expect(summary.sort()).toEqual(
      [
        'component:App:stateful',
        'component:About:stateful',
        'component:Counter:stateful',
        'component:FancyCounter:stateful',
        'component:Hidden:stateful:local',
        'component:Home:stateful',
        'component:UserCard:stateless',
        'composable:Online',
        'decorator:LogCalls',
        'decorator:Traced',
        'function:formatPrice',
        'class:Money',
        'service:ApiService',
        'store:CartStore',
        'stylesheet:CardStyles',
        'stylesheet:Local:local',
      ].sort(),
    )
    expect(scan.files).not.toContain('node_modules/ignored/index.ts')
    expect(scan.files).toContain('src/__tests__/format.test.ts')
    expect(scan.truncated).toBe(false)
  })

  it('reads props, routes, summaries and signatures', () => {
    const scan = scanProject(makeProject(APP_FILES))
    const byName = new Map(scan.items.map((i) => [i.name, i]))
    expect(byName.get('Counter')?.props).toEqual(['start', 'onChange'])
    expect(byName.get('UserCard')?.props).toEqual(['{ name: string }'])
    expect(byName.get('UserCard')?.summary).toBe("Shows a user's name and avatar.")
    expect(byName.get('About')?.route).toBe('/about')
    expect(byName.get('formatPrice')?.signature).toBe('(cents: number): string')
    expect(scan.routes).toEqual([
      { path: '/', component: 'Home', file: 'src/app.tsx', line: 7, lazy: false },
      { path: '/about', component: './pages/about', file: 'src/app.tsx', line: 8, lazy: true },
      { path: '/about', component: 'About', file: 'src/pages/about.tsx', line: 5, lazy: false },
    ])
  })

  it('reports a stateless component without props type and an unrouted class', () => {
    const root = makeProject({
      'src/a.tsx': `@Component()\nexport class Plain extends StatelessComponent {}\n@Router()\nexport class NoRoutes extends StatefulComponent {}\n@Router([{ name: 'x' }, { path: \`/t\` }])\nexport class R extends StatefulComponent {}`,
    })
    const scan = scanProject(root)
    expect(scan.items.find((i) => i.name === 'Plain')?.props).toEqual([])
    expect(scan.routes).toEqual([{ path: '/t', component: undefined, file: 'src/a.tsx', line: 5, lazy: false }])
  })

  it('returns undefined for a file it cannot read, and skips it', () => {
    const root = makeProject({
      'src/behavior.ts': 'export class Tracking extends ClassBehavior {}\nexport declare function declared(): void',
    })
    fs.symlinkSync(path.join(root, 'missing-target.ts'), path.join(root, 'src', 'broken.ts'))
    expect(readOutline(root, 'missing.ts')).toBeUndefined()
    const scan = scanProject(root)
    expect(scan.files).toContain('src/broken.ts')
    expect(scan.items.map((i) => `${i.kind}:${i.name}`)).toEqual(['function:declared'])
  })
})

describe('layout', () => {
  it('finds the folder each kind lives in and where tests go', () => {
    const scan = scanProject(makeProject(APP_FILES))
    const layout = detectLayout(scan)
    expect(layout.dirs).toEqual({
      page: 'src/pages',
      component: 'src/components',
      store: 'src/stores',
      composable: 'src/composables',
      service: 'src/services',
      decorator: 'src/decorators',
      function: 'src/utils',
      stylesheet: 'src/styles',
      test: 'src/__tests__',
    })
    expect(layout.tests).toBe('folder')
  })

  it('does not treat a lone top-level file as the folder for its kind', () => {
    const scan = scanProject(
      makeProject({
        'src/store.ts': '@Storable()\nexport class A extends ReactiveStore {}',
        'src/a.test.ts': '',
        'src/helpers.ts': 'export function a() {}\nexport function b() {}',
        'src/widgets/a.tsx': '@Component()\nexport class A1 extends StatefulComponent {}',
        'src/components/b.tsx': '@Component()\nexport class B1 extends StatefulComponent {}',
      }),
    )
    const layout = detectLayout(scan)
    expect(layout.dirs.store).toBeUndefined()
    expect(layout.counts.store).toEqual([['src', 1]])
    expect(layout.dirs.function).toBe('src')
    expect(layout.counts.component).toEqual([
      ['src/components', 1],
      ['src/widgets', 1],
    ])
    expect(layout.tests).toBe('colocated')
    expect(detectLayout(scanProject(makeProject())).tests).toBe('none')
  })

  it('tells pages from components', () => {
    const scan = scanProject(makeProject(APP_FILES))
    const routed = routedComponentNames(scan)
    expect([...routed].sort()).toEqual(['About', 'Home'])
    const item = (name: string) => scan.items.filter((i) => i.name === name)[0]
    expect(isPage(item('Home'), routed)).toBe(true)
    expect(isPage(item('Counter'), routed)).toBe(false)
    expect(isPage(item('CartStore'), routed)).toBe(false)
    expect(layoutKind(item('Money'), routed)).toBe('function')
    expect(layoutKind(item('About'), routed)).toBe('page')
    expect(layoutKind(item('CartStore'), routed)).toBe('store')
    expect(isPage({ ...item('Counter'), file: 'src/views/x.tsx' }, new Set())).toBe(true)
  })

  it('builds kebab-case file names', () => {
    expect(fileBaseName('UserCard')).toBe('user-card')
    expect(fileBaseName('HTMLParser')).toBe('html-parser')
    expect(fileBaseName('formatPrice')).toBe('format-price')
    expect(fileBaseName('cart store')).toBe('cart-store')
    expect(DEFAULT_LAYOUT.component).toBe('src/components')
  })
})
