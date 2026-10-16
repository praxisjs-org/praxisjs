import fs from 'node:fs'
import path from 'node:path'

import { mapProject } from './map.js'
import { CATEGORY_SPECS, isCategory, slugify, type Category, type Entry } from './schema.js'
import { MemoryError, toList, type EntryInput, type MemoryStore } from './store.js'
import { detectLayout, isPage, routedComponentNames } from '../knowledge/layout.js'
import { isTestFile } from '../project/files.js'
import { scanProject } from '../project/scan.js'
import { installedComponents, morphosUsage, readKosmesisConfig } from '../project/ui-libraries.js'


/** One focused analysis pass of the memory bootstrap, sized for one agent or subagent. */
export interface BootstrapPass {
  id: string
  title: string
  goal: string
  categories: Category[]
  files: string[]
  steps: string[]
}

export interface BootstrapPlan {
  root: string
  existing: Record<string, number>
  unrecorded: number
  stale: number
  layout: string
  passes: BootstrapPass[]
}

const MAX_FILES = 60

function existingFiles(root: string, files: string[]): string[] {
  return files.filter((f) => fs.existsSync(path.join(root, f)))
}

function unique(files: string[]): string[] {
  return [...new Set(files)].sort()
}

/**
 * Splits a first full analysis of the project into independent passes, each with the files to read
 * and the memory categories it writes, so agents that support subagents can run them in parallel.
 */
export function bootstrapPlan(store: MemoryStore): BootstrapPlan {
  const scan = scanProject(store.root)
  const layout = detectLayout(scan)
  const routed = routedComponentNames(scan)
  const map = mapProject(store)
  const { entries } = store.load()
  const existing = Object.fromEntries(
    (Object.keys(CATEGORY_SPECS) as Category[]).map((c) => [c, entries.filter((e) => e.category === c).length]),
  )
  const kosmesis = readKosmesisConfig(store.root)
  const ui = kosmesis ? installedComponents(store.root, kosmesis) : []
  const morphos = morphosUsage(scan.imports)
  const filesOf = (test: (kind: string, file: string) => boolean) =>
    unique(scan.items.filter((i) => test(i.kind, i.file) && !isPage(i, routed) && i.name !== 'App').map((i) => i.file))
  const tests = scan.files.filter((f) => isTestFile(f))
  const configs = existingFiles(store.root, [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'eslint.config.mjs',
    'eslint.config.js',
    '.praxisjs-ai.json',
    'components.json',
    'components.lock.json',
  ])
  const writeRules = [
    'Write only through praxisjs_memory_upsert (dryRun: true first, then for real); never touch .praxis/ files.',
    'Search first (praxisjs_memory_search) so an existing entry is updated, not duplicated; set `location` (and `locations`/`paths`) so every entry links to its source.',
    'Only record what the code shows. Put what you could not infer in your summary as questions for the user.',
  ]

  const passes: BootstrapPass[] = [
    {
      id: 'ui-components',
      title: 'UI components and their APIs',
      goal: 'Record every reusable UI component: purpose, props/API, usage, and which Morphos primitive or Kosmesis component it builds on.',
      categories: ['components'],
      files: unique([...filesOf((k) => k === 'component'), ...ui.flatMap((c) => c.files)]),
      steps: [
        'Read each component; skip pages and the app root.',
        ui.length > 0
          ? `Kosmesis components installed in ${String(kosmesis?.uiDir)}: tag them "kosmesis", summary from the Kosmesis docs (praxisjs_search_docs with library "kosmesis").`
          : 'No Kosmesis components found.',
        morphos.length > 0 ? `Morphos primitives in use: ${morphos.map((m) => m.name).join(', ')}.` : 'No Morphos imports found.',
      ],
    },
    {
      id: 'utilities',
      title: 'Composables, stores, services, decorators and helpers',
      goal: 'Record every reusable non-UI piece with its kind, API and when to use it.',
      categories: ['utilities'],
      files: filesOf((k) => k !== 'component'),
      steps: ['Use the matching `kind` (composable, store, service, decorator, function, class, stylesheet).', 'Document the public API and one real usage.'],
    },
    {
      id: 'routes-pages',
      title: 'Routes and pages',
      goal: 'Describe the navigation: routes, guards, lazy pages, layouts, and what each page is for.',
      categories: ['architecture', 'conventions'],
      files: unique([
        ...scan.routes.map((r) => r.file),
        ...scan.items.filter((i) => isPage(i, routed)).map((i) => i.file),
      ]),
      steps: ['One architecture entry for the routing setup; a convention entry for how new pages are added (where, how registered).'],
    },
    {
      id: 'business-rules',
      title: 'Business rules',
      goal: 'Find domain rules enforced in code, comments and tests (limits, permissions, validations, invariants).',
      categories: ['business-rules', 'glossary'],
      files: unique([...filesOf((k) => k === 'store' || k === 'service' || k === 'function'), ...tests]),
      steps: [
        'Each rule: what it says, why (if visible), and `locations` where it is enforced or tested.',
        'Record domain words the code uses as glossary entries.',
        'List rules you suspect but could not confirm as questions for the user.',
      ],
    },
    {
      id: 'architecture',
      title: 'Architecture and data flow',
      goal: 'Record the decisions the code embodies: state management, data fetching, DI, rendering/SSG, styling approach.',
      categories: ['architecture'],
      files: unique([
        ...existingFiles(store.root, ['src/main.tsx', 'src/main.ts', 'src/app.tsx', 'src/app/app.tsx']),
        ...filesOf((k) => k === 'store' || k === 'service'),
        ...configs.filter((f) => f.startsWith('vite')),
      ]),
      steps: ['One ADR-style entry per decision (context, decision, consequences), status "accepted" for what is already in the code.'],
    },
    {
      id: 'conventions',
      title: 'Folder organization and conventions',
      goal: 'Confirm conventions/project-structure and record coding, naming, styling and testing conventions the code follows.',
      categories: ['conventions'],
      files: configs.filter((f) => !f.startsWith('components')),
      steps: [
        layout.style === 'feature-slice'
          ? `Feature-slice project (features: ${layout.features.join(', ')}): keep its index.ts and shared/ rules.`
          : `Layout by kind: ${Object.entries(layout.dirs).map(([k, d]) => `${k} → ${d}/`).join(', ') || 'no source folders yet'}.`,
        'Update conventions/project-structure if it no longer matches; record other conventions with the right scope.',
      ],
    },
    {
      id: 'dependencies',
      title: 'Dependencies and UI libraries',
      goal: 'Record which PraxisJS packages, Morphos packages and Kosmesis setup the project relies on, and the rules for using them.',
      categories: ['conventions', 'architecture'],
      files: configs.filter((f) => f === 'package.json' || f.startsWith('components')),
      steps: [
        kosmesis
          ? `Kosmesis: style system ${kosmesis.styleSystem}, components in ${kosmesis.uiDir}, ${String(ui.length)} installed. Record a convention to add components with the kosmesis CLI there.`
          : 'Kosmesis is not set up (no components.json).',
        'Note third-party dependencies a PraxisJS package already covers, as questions for the user.',
      ],
    },
    {
      id: 'tests-tooling',
      title: 'Tests and tooling',
      goal: 'Record how the project is tested and built: runner, environment, decorator lowering, coverage, scripts.',
      categories: ['conventions'],
      files: unique([...tests, ...configs.filter((f) => f.startsWith('vite') || f === 'package.json')]),
      steps: ['A conventions entry with scope "testing"; note missing test setup as a gap.'],
    },
  ]
  for (const pass of passes) {
    pass.steps.push(...writeRules)
    if (pass.files.length > MAX_FILES) {
      pass.steps.unshift(`${String(pass.files.length)} files: the first ${String(MAX_FILES)} are listed; use praxisjs_inspect_project for the rest.`)
      pass.files = pass.files.slice(0, MAX_FILES)
    }
  }

  return {
    root: store.root,
    existing,
    unrecorded: map.proposals.length,
    stale: map.stale.length,
    layout: layout.style,
    passes,
  }
}

export interface UpsertItem {
  category: unknown
  entry: unknown
}

export interface UpsertResult {
  category: string
  id?: string
  status: 'add' | 'update' | 'unchanged' | 'needs-confirmation' | 'invalid'
  changed?: string[]
  message?: string
}

const LIST_KEYS = new Set(['tags', 'related', 'exports', 'locations', 'paths', 'aliases', 'supersedes'])
const PROTECTED_KEYS = new Set(['title', 'summary'])

/** The existing entry an input describes: same id, same source location and export, or same title. */
function findExisting(entries: Entry[], category: Category, input: EntryInput): Entry | undefined {
  const same = entries.filter((e) => e.category === category)
  if (typeof input.id === 'string') return same.find((e) => e.id === input.id)
  if (typeof input.location === 'string') {
    const exports = toList(input.exports)
    const byLocation = same.find(
      (e) =>
        e.fields.location === input.location &&
        (exports.length === 0 || toList(e.fields.exports).length === 0 || exports.some((x) => toList(e.fields.exports).includes(x))),
    )
    if (byLocation) return byLocation
  }
  const slug = typeof input.title === 'string' ? slugify(input.title) : ''
  return same.find((e) => e.id === slug || e.id.endsWith(`-${slug}`) || String(e.fields.title).toLowerCase() === String(input.title).toLowerCase())
}

/**
 * Adds or updates many entries at once, for the memory bootstrap. Lists are merged, and rewriting a
 * reviewed entry's title, summary or any non-empty section needs `confirmRewrite`, so re-running an
 * analysis never silently replaces what people wrote. `dryRun` reports what would happen.
 */
export function upsertEntries(
  store: MemoryStore,
  items: UpsertItem[],
  options: { dryRun?: boolean; confirmRewrite?: boolean } = {},
): UpsertResult[] {
  if (!options.dryRun) store.assertCurrentFormat()
  const results: UpsertResult[] = []
  for (const item of items) {
    const category = item.category
    if (!isCategory(category)) {
      results.push({ category: String(category), status: 'invalid', message: 'unknown category' })
      continue
    }
    if (item.entry === null || typeof item.entry !== 'object' || Array.isArray(item.entry)) {
      results.push({ category, status: 'invalid', message: '"entry" must be an object of entry fields' })
      continue
    }
    const input = item.entry as EntryInput
    const current = findExisting(store.load(category).entries, category, input)
    try {
      if (!current) {
        store.validate(category, input)
        const id = options.dryRun ? (typeof input.id === 'string' ? input.id : slugify(String(input.title))) : store.add(category, input).entry.id
        results.push({ category, id, status: 'add' })
        continue
      }

      const reviewed = !toList(current.fields.tags).includes('unreviewed')
      const merged: EntryInput = { ...current.fields, ...current.sections }
      const changed: string[] = []
      const rewrites: string[] = []
      for (const [key, value] of Object.entries(input)) {
        if (key === 'id') continue
        const old = merged[key]
        const next = LIST_KEYS.has(key) ? [...new Set([...toList(old), ...toList(value)])] : value
        if (JSON.stringify(old) === JSON.stringify(next)) continue
        changed.push(key)
        const isSection = CATEGORY_SPECS[category].sections.some((s) => s.key === key)
        if (reviewed && typeof old === 'string' && old.trim() !== '' && (isSection || PROTECTED_KEYS.has(key))) rewrites.push(key)
        merged[key] = next
      }
      if (!reviewed && changed.some((k) => CATEGORY_SPECS[category].sections.some((s) => s.key === k)) && !toList(input.tags).includes('unreviewed')) {
        merged.tags = toList(merged.tags).filter((t) => t !== 'unreviewed')
        if (!changed.includes('tags')) changed.push('tags')
      }
      if (changed.length === 0) {
        results.push({ category, id: current.id, status: 'unchanged' })
        continue
      }
      if (rewrites.length > 0 && !options.confirmRewrite) {
        results.push({
          category,
          id: current.id,
          status: 'needs-confirmation',
          changed: rewrites,
          message: 'would rewrite text people may have written; ask the user, then pass confirmRewrite: true',
        })
        continue
      }
      store.validate(category, merged)
      if (!options.dryRun) {
        const changes = Object.fromEntries(changed.map((k) => [k, merged[k]]))
        store.update(category, current.id, changes)
      }
      results.push({ category, id: current.id, status: 'update', changed })
    } catch (error) {
      if (!(error instanceof MemoryError)) throw error
      results.push({ category, id: current?.id, status: 'invalid', message: error.message })
    }
  }
  return results
}
