import fs from 'node:fs'
import path from 'node:path'

import { slugify, type Category, type Entry } from './schema.js'
import { toList, type EntryInput, type MemoryStore } from './store.js'
import { API_CATALOG } from '../knowledge/api-catalog.js'
import { DEFAULT_LAYOUT, detectLayout, isPage, routedComponentNames, type DetectedLayout, type LayoutKind } from '../knowledge/layout.js'
import { compareText, score, terms } from '../knowledge/text.js'
import { readOutline, scanProject, type CodeItem, type ProjectScan } from '../project/scan.js'
import { installedComponents, KOSMESIS_DOCS, morphosUsage, readKosmesisConfig, type InstalledComponent, type KosmesisConfig } from '../project/ui-libraries.js'



export interface Proposal {
  category: 'components' | 'utilities'
  entry: EntryInput
  item: CodeItem
}

export interface StaleEntry {
  entry: string
  reason: string
  /** Where the code seems to live now, when it was found elsewhere. */
  movedTo?: string
}

export interface MapResult {
  scan: ProjectScan
  proposals: Proposal[]
  stale: StaleEntry[]
  recorded: string[]
  layout: DetectedLayout
  /** State of `conventions/ui-libraries` against the Morphos/Kosmesis usage found in the code. */
  uiLibraries: 'none' | 'missing' | 'outdated' | 'current' | 'recorded'
}

/** Reusable code: exported, not a page, not the app root, not a test. */
export function reusableItems(scan: ProjectScan): CodeItem[] {
  const routed = routedComponentNames(scan)
  return scan.items.filter(
    (item) => item.exported && !isPage(item, routed) && !(item.kind === 'component' && item.name === 'App'),
  )
}

function kosmesisProposal(item: CodeItem, component: InstalledComponent): Proposal {
  const version = component.version ? ` ${component.version}` : ''
  return {
    category: 'components',
    item,
    entry: {
      title: item.name,
      summary: item.summary?.split(/(?<=\.)\s/)[0].slice(0, 240) ?? `Kosmesis ${component.address} component${version}, installed with the kosmesis CLI.`,
      location: item.file,
      exports: [item.name],
      purpose: [
        `Kosmesis component \`${component.address}\`${version ? ` (registry version${version})` : ''}, copied into the project by \`kosmesis add ${component.address}\`. It is project code and may be edited.`,
        `Docs: ${KOSMESIS_DOCS}/${component.name}. Before upgrading it, run \`kosmesis outdated\`, then \`kosmesis update ${component.address}\` (it shows the diff and keeps local edits unless confirmed).`,
      ].join('\n\n'),
      ...(item.props && item.props.length > 0 ? { api: `Props: ${item.props.map((p) => `\`${p}\``).join(', ')}` } : {}),
      tags: ['kosmesis'],
    },
  }
}

function proposalFor(item: CodeItem, kosmesis: Map<string, InstalledComponent>): Proposal {
  const installed = kosmesis.get(item.file)
  if (installed && item.kind === 'component') return kosmesisProposal(item, installed)
  const category = item.kind === 'component' ? 'components' : 'utilities'
  const documented = item.summary !== undefined
  const describe = item.kind === 'component' ? `${String(item.variant)} component` : item.kind
  const summary = (item.summary ?? `Undocumented ${describe} in ${item.file}.`).split(/(?<=\.)\s/)[0].slice(0, 240)
  const api = [
    item.signature === undefined ? undefined : `\`${item.name}${/^[(<]/.test(item.signature) ? '' : ' = '}${item.signature}\``,
    item.props && item.props.length > 0 ? `Props: ${item.props.map((p) => `\`${p}\``).join(', ')}` : undefined,
  ].filter(Boolean)
  const entry: EntryInput = {
    title: item.name,
    summary,
    location: item.file,
    exports: [item.name],
    purpose: item.summary ?? `TODO: describe what ${item.name} is for and when to use it.`,
    ...(api.length > 0 ? { api: api.join('\n\n') } : {}),
    ...(documented ? {} : { tags: ['unreviewed'] }),
  }
  // Scanner kinds other than `component` are all utility kinds.
  if (category === 'utilities') entry.kind = item.kind
  return { category, entry, item }
}

function recordedKey(file: string, name: string): string {
  return `${file}#${name}`
}

/**
 * Compares the code with the memory: reusable code with no entry yet (proposals), and entries whose
 * file or export is gone (stale), pointing at the new location when the export moved.
 */
export function mapProject(store: MemoryStore, options: { record?: boolean } = {}): MapResult {
  const scan = scanProject(store.root)
  const { entries } = store.load()
  const codeEntries = entries.filter((e) => e.category === 'components' || e.category === 'utilities')

  const recordedKeys = new Set<string>()
  const recordedFiles = new Set<string>()
  for (const e of codeEntries) {
    const location = String(e.fields.location)
    const exports = toList(e.fields.exports)
    if (exports.length === 0) recordedFiles.add(location)
    for (const name of exports) recordedKeys.add(recordedKey(location, name))
  }

  const kosmesisConfig = readKosmesisConfig(store.root)
  const installed = kosmesisConfig ? installedComponents(store.root, kosmesisConfig) : []
  const byFile = new Map(installed.flatMap((c) => c.files.map((f) => [f, c] as const)))
  const reusable = reusableItems(scan)
  const proposals = reusable
    .filter((item) => !recordedKeys.has(recordedKey(item.file, item.name)) && !recordedFiles.has(item.file))
    .map((item) => proposalFor(item, byFile))

  const byName = new Map<string, CodeItem[]>()
  for (const item of scan.items) byName.set(item.name, [...(byName.get(item.name) ?? []), item])
  const stale: StaleEntry[] = []
  for (const e of entries) stale.push(...staleness(store.root, e, byName))

  const recorded: string[] = []
  const ui = uiLibrariesConvention(scan, kosmesisConfig, installed)
  const current = entries.find((e) => e.category === 'conventions' && e.id === 'ui-libraries')
  let uiLibraries: MapResult['uiLibraries'] = ui ? (current ? (current.sections.rule === ui.rule ? 'current' : 'outdated') : 'missing') : 'none'
  if (options.record) {
    for (const proposal of proposals) {
      const id = uniqueId(store, proposal.category, String(proposal.entry.title))
      const result = store.add(proposal.category, { ...proposal.entry, id })
      recorded.push(result.file)
    }
    if (ui && uiLibraries !== 'current') {
      const { id: _id, ...changes } = ui
      recorded.push((current ? store.update('conventions', 'ui-libraries', changes) : store.add('conventions', ui)).file)
      uiLibraries = 'recorded'
    }
  }
  return { scan, proposals: options.record ? [] : proposals, stale, recorded, layout: detectLayout(scan), uiLibraries }
}

/**
 * A conventions entry describing the UI building blocks the project uses (Morphos primitives,
 * Kosmesis components) and the rules for using them; undefined when it uses neither.
 */
export function uiLibrariesConvention(
  scan: ProjectScan,
  kosmesis: KosmesisConfig | undefined,
  installed: InstalledComponent[],
): EntryInput | undefined {
  const morphos = morphosUsage(scan.imports)
  if (!kosmesis && morphos.length === 0) return undefined
  const lines: string[] = []
  if (kosmesis) {
    lines.push(
      `Kosmesis is set up (components.json, style system \`${kosmesis.styleSystem}\`). Components live in \`${kosmesis.uiDir}/\`${installed.length > 0 ? `: ${installed.map((c) => `\`${c.address}\``).join(', ')}` : ''}.`,
      '- Before building a UI piece, check the installed Kosmesis components and the registry (praxisjs_ui_components); add one with `npx kosmesis add <name>`, never by copying files.',
      '- Installed components are project code and may be edited; check `kosmesis outdated` and use `kosmesis update` before upgrading them.',
    )
  }
  if (morphos.length > 0) {
    lines.push(
      `Morphos primitives in use: ${morphos.map((m) => `\`${m.name}\` (${m.package})`).join(', ')}.`,
      '- Compose or wrap Morphos primitives; never edit @morphos/* in node_modules. Follow the Morphos docs for accessibility (data-* attributes, ARIA).',
    )
  }
  return {
    id: 'ui-libraries',
    title: 'UI libraries',
    summary: 'Which Morphos primitives and Kosmesis components the project builds its UI from, and how to use them.',
    scope: 'code',
    paths: kosmesis ? [`${kosmesis.uiDir}/**`] : ['src/**'],
    rule: lines.join('\n'),
    rationale: 'Reusing accessible primitives and registry components keeps the UI consistent and avoids rebuilding what already exists.',
  }
}

function uniqueId(store: MemoryStore, category: Category, title: string): string {
  const base = slugify(title)
  let id = base
  for (let n = 2; fs.existsSync(store.fileOf(category, id)); n++) id = `${base}-${String(n)}`
  return id
}

function staleness(root: string, e: Entry, byName: Map<string, CodeItem[]>): StaleEntry[] {
  const label = `${e.category}/${e.id}`
  const result: StaleEntry[] = []
  const location = e.fields.location
  if (typeof location === 'string') {
    const exports = toList(e.fields.exports)
    if (!fs.existsSync(path.join(root, location))) {
      const moved = exports.flatMap((name) => byName.get(name) ?? []).map((item) => item.file)
      result.push({
        entry: label,
        reason: `${location} no longer exists`,
        movedTo: moved.length > 0 ? [...new Set(moved)].join(', ') : undefined,
      })
    } else if (exports.length > 0) {
      const o = readOutline(root, location)
      const present = new Set(o?.exports ?? [])
      for (const name of exports.filter((n) => !present.has(n))) {
        const elsewhere = (byName.get(name) ?? []).map((item) => item.file).filter((f) => f !== location)
        result.push({
          entry: label,
          reason: `${location} no longer exports ${name}`,
          movedTo: elsewhere.length > 0 ? [...new Set(elsewhere)].join(', ') : undefined,
        })
      }
    }
  }
  for (const p of toList(e.fields.locations)) {
    if (!fs.existsSync(path.join(root, p))) result.push({ entry: label, reason: `${p} no longer exists` })
  }
  return result
}

/** A conventions entry describing where each kind of file lives, from the project as it is today. */
/** The feature-slice rules a feature-slice project is held to. */
export const FEATURE_SLICE_RULES = [
  '- `src/app/`: bootstrap, root component, router and global providers.',
  '- `src/features/<feature>/`: `components/`, `stores/`, `composables/`, `services/`, `routes.ts`, `index.ts` (the feature\'s public API), `__tests__/`.',
  '- `src/shared/`: `ui/` (installed Kosmesis components and wrappers around Morphos primitives), `lib/`, `config/`, `types/`.',
  '- Features import each other only through the other feature\'s `index.ts`; no deep imports into another slice.',
  '- `shared/` never imports from `features/`.',
  '- Tests and styles sit with the feature they belong to.',
]

function featureSliceConvention(layout: DetectedLayout): EntryInput {
  return {
    id: 'project-structure',
    title: 'Project structure',
    summary: 'Feature-slice layout: code lives in its feature, shared code in src/shared, features talk through index.ts.',
    scope: 'structure',
    paths: ['src/**'],
    rule: [
      `This project is organized in feature slices. Features: ${layout.features.map((f) => `\`${f}\``).join(', ')}.`,
      '',
      ...FEATURE_SLICE_RULES,
      '',
      'File names are kebab-case and named after their main export (`UserCard` → `user-card.tsx`), one component per file.',
    ].join('\n'),
    rationale:
      'Each feature can be understood, changed and removed on its own; the index.ts boundary keeps features from depending on each other\'s internals.',
  }
}

export function structureConvention(layout: DetectedLayout): EntryInput {
  if (layout.style === 'feature-slice') return featureSliceConvention(layout)
  const labels: Record<LayoutKind, string> = {
    page: 'Pages (routed components)',
    component: 'Reusable components',
    store: 'Stores',
    composable: 'Composables',
    service: 'Services',
    decorator: 'Custom decorators',
    function: 'Helpers and other utilities',
    stylesheet: 'Stylesheets and design tokens',
    test: 'Tests',
  }
  const lines = (Object.keys(labels) as LayoutKind[]).map((kind) => {
    const found = layout.dirs[kind]
    if (found) return `- ${labels[kind]}: \`${found}/\``
    const loose = layout.counts[kind]?.map(([dir]) => `${dir}/`)
    return loose
      ? `- ${labels[kind]}: \`${DEFAULT_LAYOUT[kind]}/\` (existing ones in ${loose.join(', ')} move there when the next one is added)`
      : `- ${labels[kind]}: none yet; the first one goes in \`${DEFAULT_LAYOUT[kind]}/\``
  })
  return {
    id: 'project-structure',
    title: 'Project structure',
    summary: 'Where each kind of file lives. New files follow it; files found elsewhere are moved here.',
    scope: 'structure',
    paths: ['src/**'],
    rule: [
      'Put new code in the folder that already holds code of the same kind:',
      '',
      ...lines,
      '',
      'File names are kebab-case and named after their main export (`UserCard` → `user-card.tsx`), one component per file.',
      layout.tests === 'colocated'
        ? 'Tests sit next to the code they test (`name.test.ts`).'
        : 'Tests live in `__tests__/` folders (`src/__tests__/name.test.ts`).',
    ].join('\n'),
    rationale:
      'A predictable layout lets people and agents find existing code before writing new code. Code found in an unexpected place is moved to the folder above (ask before moving many files).',
  }
}

export interface DuplicateMatch {
  source: 'framework' | 'memory' | 'code'
  name: string
  where: string
  summary: string
  coverage: number
  score: number
}

/**
 * Answers "is there already something that does X?" from three places: PraxisJS itself, the
 * project memory and the project's code.
 */
export function findDuplicates(store: MemoryStore, description: string, name?: string, limit = 5): DuplicateMatch[] {
  const q = terms(`${description} ${name ?? ''}`)
  const matches: DuplicateMatch[] = []

  for (const api of API_CATALOG) {
    const result = score(q, [
      { text: api.name, weight: 4 },
      { text: api.keywords ?? '', weight: 3 },
      { text: api.summary, weight: 2 },
    ])
    if (result.score > 0) {
      matches.push({ source: 'framework', name: api.name, where: `${api.package} (docs: ${api.docs})`, summary: api.summary, ...result })
    }
  }

  if (store.exists()) {
    // Only code can be a duplicate: rules, decisions and conventions are context, not candidates.
    const query = description + (name ? ` ${name}` : '')
    const hits = [
      ...store.search(query, { category: 'components', limit: 50 }),
      ...store.search(query, { category: 'utilities', limit: 50 }),
    ]
    for (const hit of hits) {
      matches.push({
        source: 'memory',
        name: String(hit.entry.fields.title),
        where: `${hit.entry.category}/${hit.entry.id} (${String(hit.entry.fields.location)})`,
        summary: String(hit.entry.fields.summary),
        score: hit.score,
        coverage: hit.coverage,
      })
    }
  }

  for (const item of reusableItems(scanProject(store.root))) {
    const result = score(q, [
      { text: item.name, weight: 4 },
      { text: item.summary ?? '', weight: 2 },
      { text: `${item.file} ${item.signature ?? ''}`, weight: 1 },
    ])
    if (result.score > 0) {
      matches.push({ source: 'code', name: item.name, where: `${item.file}:${String(item.line)}`, summary: item.summary ?? `${item.kind} (undocumented)`, ...result })
    }
  }

  // A single shared word ("format") is not a duplicate: ask for two matching words when the query has them.
  const size = new Set(q).size
  const needed = Math.min(2, size)
  const bySource = (source: DuplicateMatch['source']) =>
    matches
      .filter((m) => m.source === source && m.coverage >= 0.5 && m.coverage * size >= needed)
      .sort((a, b) => b.score - a.score || b.coverage - a.coverage || compareText(a.name, b.name))
      .slice(0, limit)
  return [...bySource('framework'), ...bySource('memory'), ...bySource('code')]
}
