import fs from 'node:fs'
import path from 'node:path'


import { readJson } from './files.js'
import { scanProject } from './scan.js'
import { DEFAULT_LAYOUT, detectLayout, FEATURE_SLICE_LAYOUT, fileBaseName, SHARED_SLICE_LAYOUT, type DetectedLayout, type LayoutKind } from '../knowledge/layout.js'

export const SCAFFOLD_KINDS = ['page', 'component', 'store', 'composable', 'service', 'decorator', 'function', 'stylesheet'] as const

export type ScaffoldKind = (typeof SCAFFOLD_KINDS)[number]

export interface ScaffoldOptions {
  kind: ScaffoldKind
  name: string
  /** Pages: the route path. */
  route?: string
  /** Components: `false` for a StatelessComponent. */
  stateful?: boolean
  /** Feature-slice projects: the feature it belongs to; leave out for shared code. */
  feature?: string
}

export interface ScaffoldPlan {
  file: string
  exists: boolean
  code: string
  test?: { file: string; exists: boolean; code: string }
  docs: string[]
  notes: string[]
}

const DOCS: Record<ScaffoldKind, string[]> = {
  page: ['essentials/components', 'ecosystem/router'],
  component: ['essentials/components', 'decorators/state', 'essentials/reactivity'],
  store: ['ecosystem/store'],
  composable: ['advanced/custom-composables', 'composables'],
  service: ['ecosystem/di'],
  decorator: ['advanced/custom-decorators'],
  function: [],
  stylesheet: ['css/stylesheets'],
}

function pascal(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toUpperCase())
}

function camel(name: string): string {
  const p = pascal(name)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

function relativeImport(fromFile: string, toFile: string): string {
  const rel = path.posix.relative(path.posix.dirname(fromFile), toFile).replace(/\.tsx?$/, '')
  return rel.startsWith('.') ? rel : `./${rel}`
}

function componentCode(name: string, stateful: boolean, styled: boolean, route?: string): string {
  const css = fileBaseName(name)
  if (!stateful) {
    return `import { StatelessComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'

export interface ${name}Props {
  label: string
}

@Component()
export class ${name} extends StatelessComponent<${name}Props> {
  render() {
    return <div class="${css}">{this.props.label}</div>
  }
}
`
  }
  const imports = [
    `import { StatefulComponent } from '@praxisjs/core'`,
    styled ? `import { Stylesheet, Styled } from '@praxisjs/css'` : undefined,
    `import { Component, Prop, State } from '@praxisjs/decorators'`,
    route ? `import { Route } from '@praxisjs/router'` : undefined,
  ].filter(Boolean)
  const styles = styled
    ? `
class ${name}Styles extends Stylesheet {
  $root = this.css({ display: 'flex', flexDirection: 'column', gap: '8px' })
}
`
    : ''
  return `${imports.join('\n')}
${styles}
${route ? `@Route('${route}')\n` : ''}@Component()
export class ${name} extends StatefulComponent {
  @Prop() title = ''
  @State() count = 0
${styled ? `\n  @Styled(${name}Styles)\n  $s!: ${name}Styles\n` : ''}
  render() {
    return (
      <section class=${styled ? '{this.$s.$root}' : `"${css}"`}>
        <h2>{() => this.title}</h2>
        <button onClick={() => this.count++}>{() => this.count}</button>
      </section>
    )
  }
}
`
}

function code(kind: ScaffoldKind, name: string, options: { stateful: boolean; styled: boolean; route?: string }): string {
  switch (kind) {
    case 'page':
      return componentCode(name, true, options.styled, options.route)
    case 'component':
      return componentCode(name, options.stateful, options.styled)
    case 'store':
      return `import { State } from '@praxisjs/decorators'
import { ReactiveStore, Storable } from '@praxisjs/store'

@Storable()
export class ${name} extends ReactiveStore {
  @State() items: string[] = []

  add(item: string) {
    this.items = [...this.items, item]
  }
}
`
    case 'service':
      return `import { Injectable } from '@praxisjs/di'

@Injectable()
export class ${name} {
}
`
    case 'composable':
      return `import { Composable } from '@praxisjs/core'
import { signal } from '@praxisjs/core/internal'

export class ${name} extends Composable {
  declare value: number

  setup() {
    const value = signal(0)
    return { value }
  }
}
`
    case 'decorator':
      return `import { createMethodDecorator } from '@praxisjs/decorators'

export function ${name}() {
  return createMethodDecorator({
    label: '@${name}()',
    setup(original) {
      return function (this: object, ...args: unknown[]) {
        return original.apply(this, args)
      }
    },
  })
}
`
    case 'stylesheet':
      return `import { Stylesheet } from '@praxisjs/css'

export class ${name} extends Stylesheet {
  $root = this.css({ display: 'flex' })
}
`
    case 'function':
      return `/** What ${name} does and when to use it. */
export function ${name}(): void {
}
`
  }
}

function testCode(kind: ScaffoldKind, name: string, importPath: string): string {
  if (kind === 'page' || kind === 'component') {
    return `// @vitest-environment jsdom
import { render } from '@praxisjs/runtime'
import { describe, expect, it } from 'vitest'

import { ${name} } from '${importPath}'

describe('${name}', () => {
  it('renders', () => {
    const container = document.createElement('div')
    const dispose = render(() => <${name} />, container)
    expect(container.firstElementChild).not.toBeNull()
    dispose()
  })
})
`
  }
  return `import { describe, expect, it } from 'vitest'

import { ${name} } from '${importPath}'

describe('${name}', () => {
  it('exists', () => {
    expect(${name}).toBeDefined()
  })
})
`
}

/** Folder and test folder for a new file in a feature-slice project, plus what to tell the agent. */
function featureSliceTarget(kind: LayoutKind, layout: DetectedLayout, feature: string | undefined, notes: string[]): { dir: string; testDir: string } {
  const known = `existing features: ${layout.features.join(', ')}`
  if (feature) {
    const slug = fileBaseName(feature)
    if (!layout.features.includes(slug)) {
      notes.push(`New feature "${slug}" (${known}): create src/features/${slug}/index.ts exporting its public API.`)
    }
    if (kind === 'page') notes.push(`Add the route to src/features/${slug}/routes.ts and export what other code needs from src/features/${slug}/index.ts.`)
    const dir = FEATURE_SLICE_LAYOUT[kind].replace('<feature>', slug)
    return { dir, testDir: dir.startsWith('src/features/') ? `src/features/${slug}/__tests__` : `${dir}/__tests__` }
  }
  const shared = SHARED_SLICE_LAYOUT[kind] ?? (FEATURE_SLICE_LAYOUT[kind].startsWith('src/shared') ? FEATURE_SLICE_LAYOUT[kind] : undefined)
  if (shared) {
    notes.push(`Feature-slice project: placed in ${shared}/ as shared code. If it belongs to one feature, pass feature (${known}).`)
    return { dir: shared, testDir: `${shared}/__tests__` }
  }
  notes.push(`Feature-slice project: pass the feature this ${kind} belongs to (${known}).`)
  return { dir: FEATURE_SLICE_LAYOUT[kind], testDir: 'src/features/<feature>/__tests__' }
}

/**
 * Where a new file of `kind` goes in this project and a starting point for it: the folder the project
 * already uses for that kind (or the PraxisJS default), a kebab-case file name, and a test file when
 * the project writes tests.
 */
export function planScaffold(root: string, options: ScaffoldOptions): ScaffoldPlan {
  const name = options.kind === 'function' ? camel(options.name) : pascal(options.name)
  const scan = scanProject(root)
  const layout = detectLayout(scan)
  const prefs = readJson(path.join(root, '.praxisjs-ai.json')) ?? {}
  const jsx = options.kind === 'page' || options.kind === 'component'
  const kind = options.kind as LayoutKind
  const notes: string[] = []
  const slice = layout.style === 'feature-slice' ? featureSliceTarget(kind, layout, options.feature, notes) : undefined
  const dir = slice?.dir ?? layout.dirs[kind] ?? DEFAULT_LAYOUT[kind]
  const file = `${dir}/${fileBaseName(name)}.${jsx ? 'tsx' : 'ts'}`

  const usesRouteDecorator = scan.items.some((item) => item.route !== undefined)
  const route = options.kind === 'page' ? (options.route ?? `/${fileBaseName(name).replace(/-page$/, '')}`) : undefined
  if (options.kind === 'page' && !usesRouteDecorator && !slice) {
    const router = scan.routes.at(0)?.file
    notes.push(
      router
        ? `Register the page in the @Router([...]) table in ${router}: { path: '${String(route)}', component: ${name} } (or Lazy(() => import('${relativeImport(router, file)}')) to split it out).`
        : `No router found: install @praxisjs/router (praxisjs_get_install_command) and read ecosystem/router before adding pages.`,
    )
  }
  if (!slice && !layout.dirs[kind]) {
    const loose = layout.counts[kind]?.map(([d]) => `${d}/`)
    notes.push(
      loose
        ? `Existing ${options.kind} code sits loose in ${loose.join(', ')}; new ones go in ${dir}/ (move the existing ones there too, with the user's consent).`
        : `The project has no ${options.kind} yet: ${dir}/ is the PraxisJS default. Record the choice with praxisjs_memory_update on conventions/project-structure.`,
    )
  }
  if (options.kind === 'decorator') {
    notes.push('Pick the builder for what the decorator targets (createFieldDecorator, createMethodDecorator, createLifecycleMethodDecorator, createGetterDecorator, createWritableGetterDecorator, createGetterObserverDecorator, createClassDecorator) and prefer its setup form; never use the accessor keyword.')
  }
  if (options.kind === 'composable') {
    notes.push('Composables may import signal/computed from @praxisjs/core/internal; components never do.')
  }

  const styled = prefs.css === 'praxisjs-css' && jsx && options.stateful !== false
  const result: ScaffoldPlan = {
    file,
    exists: fs.existsSync(path.join(root, file)),
    code: code(options.kind, name, { stateful: options.stateful !== false, styled, route: usesRouteDecorator ? route : undefined }),
    docs: DOCS[options.kind],
    notes,
  }

  if (prefs.tests !== false) {
    const testDir = slice?.testDir ?? (layout.tests === 'colocated' ? dir : (layout.dirs.test ?? DEFAULT_LAYOUT.test))
    const testFile = `${testDir}/${fileBaseName(name)}.test.${jsx ? 'tsx' : 'ts'}`
    result.test = {
      file: testFile,
      exists: fs.existsSync(path.join(root, testFile)),
      code: testCode(options.kind, name, relativeImport(testFile, file)),
    }
    if (!['vitest.config.ts', 'vitest.config.mts', 'vite.config.ts'].some((f) => fs.existsSync(path.join(root, f)))) {
      notes.push('No Vitest config found: tests need decoratorLoweringPlugin() from @praxisjs/vite-plugin (tooling/vite-plugin, "Using decorators in Vitest").')
    }
  }
  return result
}
