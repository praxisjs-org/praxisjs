import path from 'node:path'

import { compareText } from './text.js'

import type { CodeItem, ProjectScan } from '../project/scan.js'

/** Kinds of files a PraxisJS app is made of, as the scaffold and structure tools see them. */
export const LAYOUT_KINDS = [
  'page',
  'component',
  'store',
  'composable',
  'service',
  'decorator',
  'function',
  'stylesheet',
  'test',
] as const

export type LayoutKind = (typeof LAYOUT_KINDS)[number]

/**
 * Where each kind goes in a project that has not settled it yet. It extends the create-praxisjs
 * templates (`src/app.tsx`, `src/pages/`, `src/services/`, `src/store.ts`) with one folder per kind.
 */
export const DEFAULT_LAYOUT: Record<LayoutKind, string> = {
  page: 'src/pages',
  component: 'src/components',
  store: 'src/stores',
  composable: 'src/composables',
  service: 'src/services',
  decorator: 'src/decorators',
  function: 'src/utils',
  stylesheet: 'src/styles',
  test: 'src/__tests__',
}

const PAGE_DIR = /(?:^|\/)(?:pages|routes|views)(?:\/|$)/
const TOP_LEVEL = new Set(['.', 'src'])

export function isPage(item: CodeItem, routedComponents: Set<string>): boolean {
  return item.kind === 'component' && (item.route !== undefined || routedComponents.has(item.name) || PAGE_DIR.test(item.file))
}

export function layoutKind(item: CodeItem, routedComponents: Set<string>): LayoutKind {
  if (isPage(item, routedComponents)) return 'page'
  if (item.kind === 'class') return 'function'
  return item.kind
}

/**
 * Feature-slice layout, one possible organization (never imposed): each feature owns its UI, state
 * and routes and exposes a public API through `index.ts`; `shared/` holds what features share.
 */
export const FEATURE_SLICE_LAYOUT: Record<LayoutKind, string> = {
  page: 'src/features/<feature>/components',
  component: 'src/features/<feature>/components',
  store: 'src/features/<feature>/stores',
  composable: 'src/features/<feature>/composables',
  service: 'src/features/<feature>/services',
  decorator: 'src/shared/lib',
  function: 'src/shared/lib',
  stylesheet: 'src/features/<feature>/components',
  test: 'src/features/<feature>/__tests__',
}

/** Where a kind goes in `src/shared/` when it belongs to no single feature. */
export const SHARED_SLICE_LAYOUT: Partial<Record<LayoutKind, string>> = {
  component: 'src/shared/ui',
  stylesheet: 'src/shared/ui',
  composable: 'src/shared/lib',
  service: 'src/shared/lib',
  store: 'src/shared/lib',
}

const FEATURE_FILE = /^src\/features\/([^/]+)\//

/** The features of a feature-slice project (`src/features/<feature>/…`), sorted. */
export function detectFeatures(files: string[]): string[] {
  return [...new Set(files.flatMap((f) => FEATURE_FILE.exec(f)?.[1] ?? []))].sort()
}

export interface DetectedLayout {
  /** `feature-slice` when the sources are organized in `src/features/<feature>/`. */
  style: 'by-kind' | 'feature-slice'
  features: string[]
  /** Folder that holds most files of each kind, when the project has any. */
  dirs: Partial<Record<LayoutKind, string>>
  /** Files per folder for each kind, most used first. */
  counts: Partial<Record<LayoutKind, Array<[string, number]>>>
  /** Whether tests sit in `__tests__` folders, next to the code, or nowhere yet. */
  tests: 'folder' | 'colocated' | 'none'
}

export function routedComponentNames(scan: ProjectScan): Set<string> {
  return new Set(scan.routes.flatMap((route) => (route.component && !route.lazy ? [route.component] : [])))
}

export function detectLayout(scan: ProjectScan): DetectedLayout {
  const routed = routedComponentNames(scan)
  const counts: Partial<Record<LayoutKind, Map<string, number>>> = {}
  const add = (kind: LayoutKind, file: string) => {
    const dir = path.posix.dirname(file)
    const map = (counts[kind] ??= new Map<string, number>())
    map.set(dir, (map.get(dir) ?? 0) + 1)
  }
  for (const item of scan.items) {
    if (item.kind === 'component' && item.name === 'App') continue
    add(layoutKind(item, routed), item.file)
  }
  for (const route of scan.routes) {
    if (route.lazy && route.component) {
      add('page', path.posix.normalize(path.posix.join(path.posix.dirname(route.file), route.component)))
    }
  }

  const testFiles = scan.files.filter((file) => /\.(?:test|spec)\.[^/]+$/.test(file))
  for (const file of testFiles) add('test', file)
  const tests = testFiles.length === 0 ? 'none' : testFiles.some((f) => f.includes('/__tests__/')) ? 'folder' : 'colocated'

  const dirs: DetectedLayout['dirs'] = {}
  const sorted: DetectedLayout['counts'] = {}
  for (const kind of LAYOUT_KINDS) {
    const map = counts[kind]
    if (!map) continue
    const entries = [...map].sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
    sorted[kind] = entries
    // A lone file at the top of the sources (the templates' src/store.ts) is not a folder convention.
    const folder = entries.find(([dir, count]) => !TOP_LEVEL.has(dir) || count > 1)
    if (folder) dirs[kind] = folder[0]
  }
  const features = detectFeatures(scan.files)
  return { style: features.length > 0 ? 'feature-slice' : 'by-kind', features, dirs, counts: sorted, tests }
}

/** Kebab-case file name for a PascalCase or camelCase symbol: `UserCard` → `user-card`. */
export function fileBaseName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
