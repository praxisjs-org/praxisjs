import fs from 'node:fs'
import path from 'node:path'

import { isTestFile, listSourceFiles, MAX_SOURCE_FILES } from './files.js'
import { outline, type ClassInfo, type FunctionInfo, type Outline } from './outline.js'

/** A reusable piece of the project's own code, as found by the scanner. */
export interface CodeItem {
  kind: 'component' | 'store' | 'composable' | 'service' | 'decorator' | 'function' | 'stylesheet' | 'class'
  name: string
  file: string
  line: number
  exported: boolean
  summary?: string
  signature?: string
  /** Components: `stateful` or `stateless`. */
  variant?: 'stateful' | 'stateless'
  /** Components: `@Prop()` fields, or the props type of a `StatelessComponent<Props>`. */
  props?: string[]
  route?: string
}

export interface RouteInfo {
  path: string
  component?: string
  file: string
  line: number
  lazy: boolean
}

export interface ProjectScan {
  root: string
  files: string[]
  truncated: boolean
  items: CodeItem[]
  routes: RouteInfo[]
  /** Package imports (not relative ones) of every source file that is not a test. */
  imports: Array<{ file: string; source: string; names: string[] }>
}

const COMPONENT_BASES = new Set(['StatefulComponent', 'StatelessComponent'])
const STYLESHEET_BASES = new Set(['Stylesheet', 'ReactiveStylesheet', 'TokenSheet'])
const DECORATOR_BUILDER = /\bcreate[A-Z]\w*Decorator\s*\(|DecoratorContext\b/

export function readOutline(root: string, file: string): Outline | undefined {
  try {
    return outline(fs.readFileSync(path.join(root, file), 'utf8'), { jsx: file.endsWith("x") })
  } catch {
    return undefined
  }
}

function classItem(cls: ClassInfo, file: string, componentNames: Set<string>): CodeItem | undefined {
  const decorators = new Set(cls.decorators.map((d) => d.name))
  const base = { name: cls.name, file, line: cls.line, exported: cls.exported, summary: cls.doc }
  const isComponent =
    decorators.has('Component') || COMPONENT_BASES.has(cls.base ?? '') || componentNames.has(cls.base ?? '')
  if (isComponent) {
    const stateless = cls.base === 'StatelessComponent'
    const route = cls.decorators.find((d) => d.name === 'Route')?.args
    return {
      ...base,
      kind: 'component',
      variant: stateless ? 'stateless' : 'stateful',
      props: stateless
        ? cls.baseTypeArgs
          ? [cls.baseTypeArgs]
          : []
        : cls.members
            .filter((m) => m.decorators.some((d) => d.name === 'Prop' || d.name === 'FunctionProp'))
            .map((m) => m.name),
      route: route ? stringLiteral(route) : undefined,
    }
  }
  if (decorators.has('Storable') || cls.base === 'ReactiveStore') return { ...base, kind: 'store' }
  if (cls.base === 'Composable') return { ...base, kind: 'composable' }
  if (decorators.has('Injectable')) return { ...base, kind: 'service' }
  if (STYLESHEET_BASES.has(cls.base ?? '')) return { ...base, kind: 'stylesheet' }
  if (cls.base === 'ClassBehavior') return undefined
  return cls.exported ? { ...base, kind: 'class' } : undefined
}

function functionItem(fn: FunctionInfo, file: string, text: string): CodeItem | undefined {
  if (!fn.exported || fn.name === 'default') return undefined
  const body = fn.body ? text.slice(fn.body[0], fn.body[1]) : ''
  return {
    kind: DECORATOR_BUILDER.test(body) || DECORATOR_BUILDER.test(fn.signature) ? 'decorator' : 'function',
    name: fn.name,
    file,
    line: fn.line,
    exported: true,
    summary: fn.doc,
    signature: fn.signature,
  }
}

function stringLiteral(text: string): string | undefined {
  return /^\s*(['"`])(.*?)\1/.exec(text)?.[2]
}

/** Route objects in a `@Router([...])` argument: every `{ … }` whose own keys include `path`. */
function routerRoutes(cls: ClassInfo, o: Outline, file: string): RouteInfo[] {
  const router = cls.decorators.find((d) => d.name === 'Router')
  if (router?.args === undefined) return []
  const argStart = o.text.indexOf(router.args, router.start)
  const masked = o.masked.slice(argStart, argStart + router.args.length)
  const routes: RouteInfo[] = []
  for (let k = 0; k < masked.length; k++) {
    if (masked[k] !== '{') continue
    let depth = 0
    let own = ''
    let end = k
    for (; end < masked.length; end++) {
      const c = masked[end]
      if ('{[('.includes(c)) depth++
      own += depth <= 1 ? router.args[end] : ' '
      if ('}])'.includes(c)) depth--
      if (depth === 0) break
    }
    const routePath = /\bpath\s*:\s*(['"`])(.*?)\1/.exec(own)?.[2]
    if (routePath === undefined) continue
    const lazy = /\bcomponent\s*:\s*Lazy\s*\(/.test(router.args.slice(k, end))
    const lazyImport = /\bimport\s*\(\s*(['"`])(.*?)\1/.exec(router.args.slice(k, end))?.[2]
    const component = lazy ? lazyImport : /\bcomponent\s*:\s*([\w$.]+)/.exec(own)?.[1]
    routes.push({ path: routePath, component, file, line: o.lineAt(argStart + k), lazy })
  }
  return routes
}

/** Scans every source file for components, stores, composables, services, decorators and helpers. */
export function scanProject(root: string): ProjectScan {
  const files = listSourceFiles(root)
  const outlines = new Map<string, Outline>()
  for (const file of files) {
    if (isTestFile(file)) continue
    const o = readOutline(root, file)
    if (o) outlines.set(file, o)
  }

  // Classes that extend another project component (`class Admin extends Page`) are components too.
  const componentNames = new Set<string>()
  for (let grew = true; grew; ) {
    grew = false
    for (const o of outlines.values()) {
      for (const cls of o.classes) {
        if (componentNames.has(cls.name)) continue
        const isComponent =
          cls.decorators.some((d) => d.name === 'Component') ||
          COMPONENT_BASES.has(cls.base ?? '') ||
          componentNames.has(cls.base ?? '')
        if (isComponent) {
          componentNames.add(cls.name)
          grew = true
        }
      }
    }
  }

  const items: CodeItem[] = []
  const routes: RouteInfo[] = []
  const imports: ProjectScan['imports'] = []
  for (const [file, o] of outlines) {
    for (const imp of o.imports) {
      if (!imp.source.startsWith('.')) imports.push({ file, source: imp.source, names: imp.names })
    }
    for (const cls of o.classes) {
      const item = classItem(cls, file, componentNames)
      if (item) items.push(item)
      routes.push(...routerRoutes(cls, o, file))
      if (item?.route !== undefined) {
        routes.push({ path: item.route, component: cls.name, file, line: cls.line, lazy: false })
      }
    }
    for (const fn of o.functions) {
      const item = functionItem(fn, file, o.text)
      if (item) items.push(item)
    }
  }
  return { root, files, truncated: files.length >= MAX_SOURCE_FILES, items, routes, imports }
}
