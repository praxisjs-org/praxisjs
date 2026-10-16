import fs from 'node:fs'
import path from 'node:path'

import { API_CATALOG, findApi, type ApiEntry } from './knowledge/api-catalog.js'
import { compareText, score, terms } from './knowledge/text.js'
import { bootstrapPlan, upsertEntries, type UpsertItem } from './memory/bootstrap.js'
import { findDuplicates, mapProject, structureConvention, uiLibrariesConvention } from './memory/map.js'
import { migrateMemory } from './memory/migrate.js'
import { CATEGORIES, CATEGORY_SPECS, isCategory, type Category, type Entry } from './memory/schema.js'
import { MEMORY_DIR, MemoryError, MemoryStore, toList } from './memory/store.js'
import { findDeclaration } from './project/declarations.js'
import { insideProject, isTestFile, listSourceFiles, toPosix } from './project/files.js'
import { inspectProject, renderProjectInfo } from './project/inspect.js'
import { planScaffold, SCAFFOLD_KINDS, type ScaffoldKind } from './project/scaffold.js'
import {
  componentStatus,
  installedComponents,
  installedMorphosPackages,
  KOSMESIS_DEFAULT_REGISTRY,
  KOSMESIS_DOCS,
  listAllRegistries,
  readKosmesisConfig,
  uiLibrariesReport,
} from './project/ui-libraries.js'
import { validateSource, type Diagnostic } from './project/validate.js'
import { fetchDocs, type DocsLibrary } from './tools/fetch-docs.js'
import { searchDocs, sectionsAbout } from './tools/search-docs.js'

export interface TextResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: true
  [key: string]: unknown
}

export interface CallContext {
  /** The project the tools work on. */
  root: () => string
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

// The command is returned as text an assistant may run, so names are checked strictly rather than
// only by prefix: "@praxisjs/router; rm -rf ." starts with "@praxisjs/" too.
const PACKAGE_NAME = /^(?:@(?:praxisjs|morphos)\/[a-z0-9][a-z0-9-]*|create-praxisjs|praxisjs|kosmesis)$/

const MAX_VALIDATED_FILES = 300

const defaultContext: CallContext = { root: () => process.cwd() }

function buildInstallCommand(packages: string[], manager: PackageManager, dev: boolean): string {
  const pkgList = packages.join(' ')
  switch (manager) {
    case 'pnpm':
      return `pnpm add${dev ? ' -D' : ''} ${pkgList}`
    case 'yarn':
      return `yarn add${dev ? ' -D' : ''} ${pkgList}`
    case 'bun':
      return `bun add${dev ? ' -d' : ''} ${pkgList}`
    default:
      return `npm install${dev ? ' -D' : ''} ${pkgList}`
  }
}

const text = (value: string): TextResult => ({ content: [{ type: 'text', text: value }] })
const error = (value: string): TextResult => ({ content: [{ type: 'text', text: `Error: ${value}` }], isError: true })

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.trim() === '') throw new MemoryError(`"${key}" argument is required.`)
  return value
}

function requireCategory(args: Record<string, unknown>): Category {
  const value = args.category
  if (!isCategory(value)) throw new MemoryError(`"category" must be one of: ${CATEGORIES.join(', ')}.`)
  return value
}

function requireRecord(args: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = args[key]
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new MemoryError(`"${key}" must be an object of entry fields.`)
  }
  return value as Record<string, unknown>
}

function renderEntry(entry: Entry): string {
  const spec = CATEGORY_SPECS[entry.category]
  const lines = [`# ${String(entry.fields.title)}`, '', `${entry.category}/${entry.id} — ${String(entry.fields.summary)}`, '']
  for (const field of spec.fields) {
    if (field.key === 'title' || field.key === 'summary') continue
    const value = entry.fields[field.key]
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue
    lines.push(`- ${field.key}: ${Array.isArray(value) ? value.join(', ') : value}`)
  }
  for (const section of spec.sections) {
    const value = entry.sections[section.key]
    if (value) lines.push('', `## ${section.heading}`, '', value)
  }
  return lines.join('\n')
}

function entryLine(entry: Entry): string {
  const location = entry.fields.location
  return `- ${entry.category}/${entry.id} — **${String(entry.fields.title)}**: ${String(entry.fields.summary)}${typeof location === 'string' ? ` (${location})` : ''}`
}

function writeReport(action: string, result: { file: string; warnings: string[] }): string {
  return [`${action} ${result.file}.`, ...result.warnings.map((w) => `Warning: ${w}`)].join('\n')
}

function renderDiagnostics(file: string, diagnostics: Diagnostic[]): string[] {
  return diagnostics.map((d) => `- ${file}:${String(d.line)} ${d.severity} [${d.rule}] ${d.message} (docs: ${d.docs})`)
}

function validatePath(root: string, target: string): string {
  const full = insideProject(root, target)
  if (!fs.existsSync(full)) throw new MemoryError(`${target} does not exist.`)
  const files = fs.statSync(full).isDirectory()
    ? listSourceFiles(full, MAX_VALIDATED_FILES)
        .filter((f) => !isTestFile(f) && /\.[cm]?[jt]sx?$/.test(f))
        .map((f) => toPosix(path.relative(root, path.join(full, f))))
    : [toPosix(path.relative(root, full))]
  const lines: string[] = []
  let count = 0
  for (const file of files) {
    const diagnostics = validateSource(fs.readFileSync(path.join(root, file), 'utf8'), file)
    count += diagnostics.length
    lines.push(...renderDiagnostics(file, diagnostics))
  }
  const checked = `${String(files.length)} file${files.length === 1 ? '' : 's'} checked`
  return count === 0 ? `${checked}: no problems found.` : [`${checked}, ${String(count)} finding(s):`, '', ...lines].join('\n')
}

async function apiReference(root: string, symbol: string): Promise<string> {
  const matches = findApi(symbol)
  if (matches.length === 0) {
    const lower = symbol.replace(/^@/, '').toLowerCase()
    const near = API_CATALOG.filter((e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()))
    const bare = symbol.trim().replace(/^@/, '').replace(/\(\)$/, '')
    for (const pkg of installedMorphosPackages(root)) {
      const declaration = findDeclaration(root, pkg, bare)
      if (declaration) {
        return [
          `# ${bare} — ${pkg} (Morphos)`,
          '',
          `- import: \`import { ${bare} } from '${pkg}'\``,
          `- docs: praxisjs_search_docs({ library: "morphos", query: "${bare}" })`,
          '',
          `Signature (installed version):\n\n\`\`\`ts\n${declaration}\n\`\`\``,
        ].join('\n')
      }
    }
    return [
      `No PraxisJS export is named "${symbol}".`,
      near.length > 0 ? `Did you mean: ${near.map((e) => `${e.name} (${e.package})`).join(', ')}?` : 'Try praxisjs_search_docs with what it should do.',
    ].join(' ')
  }
  const blocks: string[] = []
  for (const entry of matches) {
    const declaration = findDeclaration(root, entry.package, entry.name)
    const sections = await sectionsAbout(entry.name, entry.docs).catch(() => [])
    blocks.push(
      [
        `# ${entry.name} — ${entry.package}`,
        '',
        entry.summary,
        '',
        `- kind: ${entry.kind}${entry.reactive ? ' (reactive: read it inside a JSX arrow)' : ''}${entry.statefulOnly ? ' (StatefulComponent only)' : ''}`,
        `- import: \`import { ${entry.name} } from '${entry.package}'\``,
        `- docs: ${entry.docs} (praxisjs_get_page)`,
        '',
        declaration
          ? `Signature (installed version):\n\n\`\`\`ts\n${declaration}\n\`\`\``
          : `${entry.package} is not installed in this project, so no signature is available: read the docs page.`,
        ...sections.map((s) => `\n## Docs: ${s.heading}\n\n${s.text.length > 4000 ? `${s.text.slice(0, 4000)}\n…` : s.text}`),
      ].join('\n'),
    )
  }
  return blocks.join('\n\n---\n\n')
}

function listApis(root: string, args: Record<string, unknown>): string {
  const entries = API_CATALOG.filter(
    (e) => (args.kind === undefined || e.kind === args.kind) && (args.package === undefined || e.package === args.package),
  )
  if (entries.length === 0) return 'No PraxisJS export matches these filters.'
  const lines: string[] = []
  let current = ''
  for (const entry of [...entries].sort((a: ApiEntry, b: ApiEntry) => compareText(a.package, b.package))) {
    if (entry.package !== current) {
      current = entry.package
      lines.push('', `## ${current}`, '')
    }
    lines.push(`- \`${entry.name}\` (${entry.kind}) — ${entry.summary} [docs: ${entry.docs}]`)
    if (args.signatures === true) {
      const declaration = findDeclaration(root, entry.package, entry.name)
      if (declaration) lines.push(`  \`${declaration.split('\n')[0].replace(/^export declare /, '')}\``)
    }
  }
  return lines.join('\n').trim()
}

function memoryInit(store: MemoryStore): string {
  const created = store.init()
  const lines = [created.length > 0 ? `Created ${created.join(', ')}.` : `${MEMORY_DIR}/ already exists; README.md and index.md refreshed.`]
  const before = mapProject(store)
  if (!store.get('conventions', 'project-structure')) {
    lines.push(writeReport('Recorded', store.add('conventions', structureConvention(before.layout))))
  }
  const kosmesis = readKosmesisConfig(store.root)
  const ui = uiLibrariesConvention(before.scan, kosmesis, kosmesis ? installedComponents(store.root, kosmesis) : [])
  if (ui && !store.get('conventions', 'ui-libraries')) lines.push(writeReport('Recorded', store.add('conventions', ui)))
  lines.push('', renderMap(mapProject(store), false))
  lines.push('', 'For a full first analysis (components, rules, architecture…), follow praxisjs_memory_bootstrap_plan.')
  return lines.join('\n')
}

function renderBootstrapPlan(plan: ReturnType<typeof bootstrapPlan>): string {
  const existing = Object.entries(plan.existing).map(([category, count]) => `${category} ${String(count)}`).join(', ')
  const lines = [
    `# Memory bootstrap plan (${plan.layout} layout)`,
    '',
    `Memory now: ${existing}. ${String(plan.unrecorded)} reusable item(s) unrecorded, ${String(plan.stale)} stale entr${plan.stale === 1 ? 'y' : 'ies'}.`,
    '',
    'Run the passes below in parallel (one subagent each) when your agent supports subagents, otherwise one after another. Each pass ends with a summary of what it recorded and the questions it could not answer; collect them for the user.',
  ]
  for (const [k, pass] of plan.passes.entries()) {
    lines.push('', `## ${String(k + 1)}. ${pass.title} (\`${pass.id}\`)`, '', pass.goal, '', `Writes: ${pass.categories.join(', ')}`)
    lines.push(...pass.steps.map((step) => `- ${step}`))
    lines.push(pass.files.length > 0 ? `Files: ${pass.files.join(', ')}` : 'Files: none found for this pass.')
  }
  return lines.join('\n')
}

function renderUpsert(results: ReturnType<typeof upsertEntries>, dryRun: boolean): string {
  const lines = results.map(
    (r) =>
      `- ${r.category}/${r.id ?? '?'}: ${r.status}${r.changed && r.changed.length > 0 ? ` (${r.changed.join(', ')})` : ''}${r.message ? ` — ${r.message}` : ''}`,
  )
  const counts = ['add', 'update', 'unchanged', 'needs-confirmation', 'invalid']
    .map((status) => [status, results.filter((r) => r.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${String(n)} ${status}`)
  return [`${dryRun ? 'Dry run' : 'Done'}: ${counts.join(', ')}.`, '', ...lines].join('\n')
}

function renderMigration(report: ReturnType<typeof migrateMemory>): string {
  const changes = report.steps.filter((s) => s.action !== 'unchanged')
  const lines = [
    `${report.applied ? 'Migrated' : 'Dry run: would migrate'} .praxis/ from format ${String(report.from)} to ${String(report.to)}: ${String(changes.length)} change(s), ${String(report.steps.length - changes.length)} entr${report.steps.length - changes.length === 1 ? 'y' : 'ies'} already current.`,
    ...changes.map((s) => `- ${s.file}: ${s.action}${s.to ? ` → ${s.to}` : ''}${s.reason ? ` (${s.reason})` : ''}`),
  ]
  if (!report.applied) lines.push('', 'Run praxisjs_memory_migrate({ dryRun: false }) to apply. Invalid entries are kept as they are; fix them afterwards.')
  return lines.join('\n')
}

async function uiComponents(root: string, args: Record<string, unknown>): Promise<string> {
  const config = readKosmesisConfig(root)
  const effective = config ?? { styleSystem: 'tailwind', uiDir: 'src/components/ui', registry: KOSMESIS_DEFAULT_REGISTRY, registries: {} }
  const listings = await listAllRegistries(root, effective)
  const installed = config ? installedComponents(root, config) : []
  const byAddress = new Map(installed.map((c) => [c.address, c]))
  const query = typeof args.query === 'string' ? terms(args.query) : []
  const lines: string[] = config
    ? [`Kosmesis (${effective.styleSystem}), components in ${effective.uiDir}/.`]
    : ['Kosmesis is not set up in this project (no components.json): listing the public registry (tailwind). Run `npx kosmesis init` before adding components.']
  for (const listing of listings) {
    lines.push('', `## ${listing.registry}`)
    if (listing.error) {
      lines.push(`Unreachable: ${listing.error}`)
      continue
    }
    const items = listing.items.filter((item) => {
      if (args.installed === true && !byAddress.has(item.address)) return false
      return query.length === 0 || score(query, [{ text: `${item.name} ${item.title ?? ''} ${item.description ?? ''}`, weight: 1 }]).coverage >= 0.5
    })
    if (items.length === 0) lines.push('No matching components.')
    for (const item of items) {
      const mine = byAddress.get(item.address)
      const deps = [...item.dependencies, ...item.registryDependencies.map((d) => `registry:${d}`)]
      lines.push(
        `- \`${item.address}\`${item.version ? ` ${item.version}` : ''} — ${item.description ?? item.title ?? ''}${deps.length > 0 ? ` [deps: ${deps.join(', ')}]` : ''}${mine ? ` (installed: ${componentStatus(mine, listings)})` : ''}`,
      )
    }
  }
  const unlisted = installed.filter((c) => !listings.some((l) => l.items.some((i) => i.address === c.address)))
  if (unlisted.length > 0 && args.query === undefined) {
    lines.push('', 'Installed but not in any reachable registry:', ...unlisted.map((c) => `- \`${c.address}\`: ${componentStatus(c, listings)}`))
  }
  lines.push('', `Docs: praxisjs_get_page({ library: "kosmesis", page: "components/<name>" }) or ${KOSMESIS_DOCS}/<name>. Add with \`npx kosmesis add <name>\`; update with \`kosmesis outdated\` then \`kosmesis update <name>\`.`)
  return lines.join('\n')
}

function docsLibrary(args: Record<string, unknown>): DocsLibrary | undefined {
  const value = args.library
  if (value === undefined) return undefined
  if (value === 'praxisjs' || value === 'morphos' || value === 'kosmesis') return value
  throw new MemoryError('"library" must be one of: praxisjs, morphos, kosmesis.')
}

function renderMap(map: ReturnType<typeof mapProject>, recorded: boolean): string {
  const lines: string[] = []
  if (recorded) {
    lines.push(map.recorded.length > 0 ? `Recorded ${String(map.recorded.length)} entries:` : 'Nothing new to record.')
    lines.push(...map.recorded.map((f) => `- ${f}`))
    if (map.recorded.length > 0) lines.push('Complete the entries tagged "unreviewed" (purpose, usage) with praxisjs_memory_update.')
  } else if (map.proposals.length === 0) {
    lines.push('Every reusable component and utility found in the code is recorded.')
  } else {
    lines.push(`${String(map.proposals.length)} reusable item(s) not recorded yet (record them with praxisjs_memory_map { record: true } or one by one with praxisjs_memory_add):`)
    for (const p of map.proposals) {
      lines.push(`- ${p.category}: ${p.item.name} (${p.item.kind}) — ${p.item.file}:${String(p.item.line)}${p.item.summary ? `: ${p.item.summary}` : ' (undocumented)'}`)
    }
  }
  const uiStatus: Record<string, string | undefined> = {
    missing: 'conventions/ui-libraries is missing: praxisjs_memory_map { record: true } records it.',
    outdated: 'conventions/ui-libraries no longer matches the Morphos/Kosmesis usage in the code: praxisjs_memory_map { record: true } updates it.',
    recorded: 'Recorded conventions/ui-libraries from the Morphos/Kosmesis usage in the code.',
  }
  const ui = uiStatus[map.uiLibraries]
  if (ui) lines.push('', ui)
  if (map.stale.length > 0) {
    lines.push('', `${String(map.stale.length)} stale entr${map.stale.length === 1 ? 'y' : 'ies'}:`)
    for (const s of map.stale) {
      lines.push(`- ${s.entry}: ${s.reason}${s.movedTo ? `; now found in ${s.movedTo} (update its location)` : '; remove the entry if the code is gone'}`)
    }
  }
  return lines.join('\n')
}

function memoryStore(context: CallContext, requireInit = true): MemoryStore {
  const store = new MemoryStore(context.root())
  if (requireInit && !store.exists()) throw new MemoryError('The project memory is not set up yet: run praxisjs_memory_init first.')
  return store
}

export async function handleCall(
  name: string,
  args: Record<string, unknown>,
  context: CallContext = defaultContext,
): Promise<TextResult> {
  try {
    switch (name) {
      case 'praxisjs_overview':
        return text(await fetchDocs({ format: 'overview', library: docsLibrary(args) }))

      case 'praxisjs_full_docs':
        return text(await fetchDocs({ format: 'full', library: docsLibrary(args) }))

      case 'praxisjs_get_page': {
        const page = args.page
        if (typeof page !== 'string' || !page) return error('"page" argument is required.')
        return text(await fetchDocs({ format: 'page', page, library: docsLibrary(args) }))
      }

      case 'praxisjs_search_docs': {
        const query = requireString(args, 'query')
        const library = docsLibrary(args)
        const hits = await searchDocs(query, {
          limit: typeof args.limit === 'number' ? args.limit : undefined,
          includeChangelog: args.includeChangelog === true,
          library,
        })
        if (hits.length === 0) return text(`No docs section matches "${query}". Try other words, or praxisjs_overview for the page list.`)
        return text(
          hits
            .map((h) => `- ${h.slug}${h.anchor ? `#${h.anchor}` : ''} — ${h.page} › ${h.heading}\n  ${h.snippet}`)
            .join('\n') + `\n\nRead a page with praxisjs_get_page({ page: "<slug>"${library ? `, library: "${library}"` : ''} }).`,
        )
      }

      case 'praxisjs_api_reference':
        return text(await apiReference(context.root(), requireString(args, 'symbol')))

      case 'praxisjs_list_apis':
        return text(listApis(context.root(), args))

      case 'praxisjs_get_install_command': {
        const raw = args.packages
        if (!Array.isArray(raw) || raw.length === 0) return error('"packages" must be a non-empty array.')
        const packages = [...new Set(raw.map(String))]
        const invalid = packages.filter((p) => !PACKAGE_NAME.test(p))
        if (invalid.length > 0) return error(`only PraxisJS ecosystem packages (@praxisjs/*, @morphos/*, praxisjs, create-praxisjs, kosmesis) are accepted. Invalid: ${invalid.join(', ')}`)
        const manager = (args.manager as PackageManager | undefined) ?? 'npm'
        return text(buildInstallCommand(packages, manager, args.dev !== false))
      }

      case 'praxisjs_inspect_project': {
        const root = context.root()
        const info = inspectProject(root)
        const ui = await uiLibrariesReport(root, info.scan.imports)
        return text([renderProjectInfo(info), ...(ui.length > 0 ? ['', ...ui] : [])].join('\n'))
      }

      case 'praxisjs_ui_components':
        return text(await uiComponents(context.root(), args))

      case 'praxisjs_validate_file': {
        if (typeof args.source === 'string') {
          const filename = typeof args.filename === 'string' ? args.filename : 'source.tsx'
          const diagnostics = validateSource(args.source, filename)
          return text(diagnostics.length === 0 ? 'No problems found.' : renderDiagnostics(filename, diagnostics).join('\n'))
        }
        return text(validatePath(context.root(), requireString(args, 'path')))
      }

      case 'praxisjs_scaffold': {
        const kind = args.kind
        if (typeof kind !== 'string' || !(SCAFFOLD_KINDS as readonly string[]).includes(kind)) {
          return error(`"kind" must be one of: ${SCAFFOLD_KINDS.join(', ')}.`)
        }
        const root = context.root()
        const plan = planScaffold(root, {
          kind: kind as ScaffoldKind,
          name: requireString(args, 'name'),
          route: typeof args.route === 'string' ? args.route : undefined,
          stateful: typeof args.stateful === 'boolean' ? args.stateful : undefined,
          feature: typeof args.feature === 'string' ? args.feature : undefined,
        })
        const store = new MemoryStore(root)
        const similar = findDuplicates(store, requireString(args, 'name'), undefined, 3)
        const lines = [
          `File: ${plan.file}${plan.exists ? ' (ALREADY EXISTS — edit it instead of creating another)' : ''}`,
          '',
          `\`\`\`${plan.file.endsWith('x') ? 'tsx' : 'ts'}`,
          plan.code.trimEnd(),
          '```',
        ]
        if (plan.test) {
          lines.push('', `Test: ${plan.test.file}${plan.test.exists ? ' (already exists)' : ''}`, '', `\`\`\`${plan.test.file.endsWith('x') ? 'tsx' : 'ts'}`, plan.test.code.trimEnd(), '```')
        }
        if (plan.docs.length > 0) lines.push('', `Read before writing: ${plan.docs.join(', ')} (praxisjs_get_page).`)
        lines.push(...plan.notes.map((n) => `Note: ${n}`))
        if (similar.length > 0) {
          lines.push('', 'Similar things that may already cover it:', ...similar.map((m) => `- [${m.source}] ${m.name} — ${m.where}: ${m.summary}`))
        }
        lines.push('', 'After creating it, validate with praxisjs_validate_file and record it with praxisjs_memory_add.')
        return text(lines.join('\n'))
      }

      case 'praxisjs_memory_init':
        return text(memoryInit(memoryStore(context, false)))

      case 'praxisjs_memory_list': {
        const store = memoryStore(context)
        const { entries, problems } = store.load(args.category === undefined ? undefined : requireCategory(args))
        const tag = typeof args.tag === 'string' ? args.tag : undefined
        const shown = tag ? entries.filter((e) => toList(e.fields.tags).includes(tag)) : entries
        const lines = shown.length > 0 ? shown.map(entryLine) : ['No entries.']
        if (problems.length > 0) {
          lines.push('', 'Unreadable entry files (fix them by removing and re-adding the entry):', ...problems.map((p) => `- ${p.file}: ${p.message}`))
        }
        return text(lines.join('\n'))
      }

      case 'praxisjs_memory_get': {
        const category = requireCategory(args)
        const id = requireString(args, 'id')
        const entry = memoryStore(context).get(category, id)
        return entry ? text(renderEntry(entry)) : error(`${category}/${id} does not exist.`)
      }

      case 'praxisjs_memory_search': {
        const query = requireString(args, 'query')
        const hits = memoryStore(context).search(query, {
          category: args.category === undefined ? undefined : requireCategory(args),
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        })
        if (hits.length === 0) return text(`Nothing in the project memory matches "${query}".`)
        return text(hits.map((h) => `${entryLine(h.entry)}\n  ${h.snippet}`).join('\n'))
      }

      case 'praxisjs_memory_check_duplicate': {
        const description = requireString(args, 'description')
        const store = new MemoryStore(context.root())
        const matches = findDuplicates(store, description, typeof args.name === 'string' ? args.name : undefined)
        if (matches.length === 0) {
          return text(
            `Nothing similar found in PraxisJS, the project memory${store.exists() ? '' : ' (not set up)'} or the code. Write it in the folder conventions/project-structure names, then record it with praxisjs_memory_add.`,
          )
        }
        const labels = { framework: 'PraxisJS already ships', memory: 'Recorded in the project memory', code: 'Found in the project code' }
        const lines: string[] = []
        for (const source of ['framework', 'memory', 'code'] as const) {
          const group = matches.filter((m) => m.source === source)
          if (group.length === 0) continue
          lines.push(`${labels[source]}:`, ...group.map((m) => `- ${m.name} — ${m.where}: ${m.summary} (match ${String(Math.round(m.coverage * 100))}%)`), '')
        }
        lines.push('Reuse or extend one of these when it fits; write new code only when none does.')
        return text(lines.join('\n'))
      }

      case 'praxisjs_memory_add': {
        const store = memoryStore(context)
        return text(writeReport('Added', store.add(requireCategory(args), requireRecord(args, 'entry'))))
      }

      case 'praxisjs_memory_update': {
        const store = memoryStore(context)
        const category = requireCategory(args)
        return text(writeReport('Updated', store.update(category, requireString(args, 'id'), requireRecord(args, 'changes'))))
      }

      case 'praxisjs_memory_remove': {
        const result = memoryStore(context).remove(requireCategory(args), requireString(args, 'id'))
        return text(
          [`Removed ${result.file}.`, ...(result.referencedBy.length > 0 ? [`Still referenced by: ${result.referencedBy.join(', ')} (update their "related").`] : [])].join('\n'),
        )
      }

      case 'praxisjs_memory_upsert': {
        const entries = args.entries
        if (!Array.isArray(entries) || entries.length === 0) return error('"entries" must be a non-empty array of { category, entry }.')
        const items = entries.map((e: unknown) => (e !== null && typeof e === 'object' ? (e as UpsertItem) : { category: undefined, entry: undefined }))
        const dryRun = args.dryRun === true
        return text(renderUpsert(upsertEntries(memoryStore(context), items, { dryRun, confirmRewrite: args.confirmRewrite === true }), dryRun))
      }

      case 'praxisjs_memory_bootstrap_plan':
        return text(renderBootstrapPlan(bootstrapPlan(memoryStore(context))))

      case 'praxisjs_memory_migrate':
        return text(renderMigration(migrateMemory(memoryStore(context), { dryRun: args.dryRun !== false })))

      case 'praxisjs_memory_map': {
        const store = memoryStore(context)
        return text(renderMap(mapProject(store, { record: args.record === true }), args.record === true))
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught)
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
  }
}
