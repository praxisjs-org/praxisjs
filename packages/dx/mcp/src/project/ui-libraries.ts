import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { readJson } from './files.js'

/**
 * Morphos (headless primitives, `@morphos/*` on npm) and Kosmesis (copy-paste components a CLI copies
 * into the project from a registry). Kosmesis keeps its setup in `components.json` and what it
 * installed in `components.lock.json` (a version and a hash per file); projects set up before the
 * lock existed have only the first, and their components are found by file name.
 */

export const KOSMESIS_DEFAULT_REGISTRY = 'https://kosmesis.praxisjs.org/r'
export const KOSMESIS_DOCS = 'https://kosmesis.praxisjs.org/docs/components'
const FETCH_TIMEOUT_MS = 10_000

export interface KosmesisConfig {
  styleSystem: string
  /** Folder components are installed into, relative to the project root. */
  uiDir: string
  registry: string
  /** `@namespace` -> registry base. */
  registries: Record<string, string>
}

export interface RegistryItem {
  /** `button`, or `@acme/button` for a namespaced registry. */
  address: string
  name: string
  title?: string
  description?: string
  version?: string
  dependencies: string[]
  registryDependencies: string[]
}

export interface InstalledComponent {
  address: string
  name: string
  files: string[]
  version?: string
  /** Tracked in components.lock.json. Untracked components were found by file name only. */
  tracked: boolean
  /** A file differs from the hash recorded when it was installed (or was adopted, unknown origin). */
  edited: boolean
}

export interface RegistryListing {
  registry: string
  items: RegistryItem[]
  error?: string
}

export function hashContent(content: string): string {
  return `sha256-${createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')}`
}

/** -1, 0 or 1 for two `x.y.z` versions (prerelease suffixes are ignored). */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split(/[-+]/)[0].split('.').map((n) => Number.parseInt(n, 10) || 0)
  const [x, y] = [parse(a), parse(b)]
  for (let k = 0; k < 3; k++) {
    const diff = (x[k] ?? 0) - (y[k] ?? 0)
    if (diff !== 0) return Math.sign(diff)
  }
  return 0
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])

export function readKosmesisConfig(root: string): KosmesisConfig | undefined {
  const config = readJson(path.join(root, 'components.json'))
  if (!config) return undefined
  const aliases = (config.aliases ?? {}) as Record<string, unknown>
  const registries = (config.registries ?? {}) as Record<string, unknown>
  return {
    styleSystem: typeof config.styleSystem === 'string' ? config.styleSystem : 'tailwind',
    uiDir: typeof aliases.ui === 'string' ? aliases.ui.replace(/\/+$/, '') : 'src/components/ui',
    registry: typeof config.registry === 'string' ? config.registry : KOSMESIS_DEFAULT_REGISTRY,
    registries: Object.fromEntries(Object.entries(registries).filter((e): e is [string, string] => typeof e[1] === 'string')),
  }
}

function addressName(address: string): string {
  return address.replace(/^@[^/]+\//, '')
}

/** Components Kosmesis installed, with their recorded version and whether their files were edited. */
export function installedComponents(root: string, config: KosmesisConfig): InstalledComponent[] {
  const lock = readJson(path.join(root, 'components.lock.json'))
  const entries = (lock?.components ?? {}) as Record<string, { version?: unknown; adopted?: unknown; files?: unknown }>
  const result: InstalledComponent[] = []
  const tracked = new Set<string>()
  for (const [address, entry] of Object.entries(entries).sort(([a], [b]) => Number(a > b) - Number(a < b))) {
    const files = (entry.files ?? {}) as Record<string, unknown>
    const edited =
      entry.adopted === true ||
      Object.entries(files).some(([file, hash]) => {
        const full = path.join(root, file)
        return !fs.existsSync(full) || hashContent(fs.readFileSync(full, 'utf8')) !== hash
      })
    for (const file of Object.keys(files)) tracked.add(file)
    result.push({
      address,
      name: addressName(address),
      files: Object.keys(files).sort(),
      version: typeof entry.version === 'string' ? entry.version : undefined,
      tracked: true,
      edited,
    })
  }
  const dir = path.join(root, config.uiDir)
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = `${config.uiDir}/${name}`
      if (!/\.tsx?$/.test(name) || tracked.has(file)) continue
      const base = name.replace(/\.tsx?$/, '')
      result.push({ address: base, name: base, files: [file], tracked: false, edited: false })
    }
  }
  return result
}

async function readSource(base: string, file: string, fetchImpl: typeof fetch): Promise<string> {
  if (/^https?:\/\//.test(base)) {
    const url = `${base.replace(/\/+$/, '')}/${file}`
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`)
    return response.text()
  }
  return fs.readFileSync(path.join(base, file), 'utf8')
}

/**
 * Every item a registry serves for a style system, from its `index.json`. A local registry folder
 * without an index is listed from its item files.
 */
export async function listRegistry(
  root: string,
  base: string,
  styleSystem: string,
  namespace?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RegistryListing> {
  const resolved = /^https?:\/\//.test(base) ? base : path.resolve(root, base)
  const toItem = (raw: Record<string, unknown>): RegistryItem => {
    const name = String(raw.name)
    return {
      address: namespace ? `${namespace}/${name}` : name,
      name,
      title: typeof raw.title === 'string' ? raw.title : undefined,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      version: typeof raw.version === 'string' ? raw.version : undefined,
      dependencies: strings(raw.dependencies),
      registryDependencies: strings(raw.registryDependencies),
    }
  }
  try {
    const index = JSON.parse(await readSource(resolved, `${styleSystem}/index.json`, fetchImpl)) as { items?: unknown }
    const items = Array.isArray(index.items) ? (index.items as Array<Record<string, unknown>>) : []
    return { registry: base, items: items.filter((i) => typeof i.name === 'string').map(toItem) }
  } catch (error) {
    const dir = path.join(resolved, styleSystem)
    if (!/^https?:\/\//.test(base) && fs.existsSync(dir)) {
      const items = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json') && f !== 'index.json')
        .sort()
        .flatMap((f) => {
          const raw = readJson(path.join(dir, f))
          return raw && typeof raw.name === 'string' ? [toItem(raw)] : []
        })
      return { registry: base, items }
    }
    return { registry: base, items: [], error: error instanceof Error ? error.message : String(error) }
  }
}

/** The default registry plus every namespaced one the project configured. */
export async function listAllRegistries(root: string, config: KosmesisConfig, fetchImpl: typeof fetch = fetch): Promise<RegistryListing[]> {
  return Promise.all([
    listRegistry(root, config.registry, config.styleSystem, undefined, fetchImpl),
    ...Object.entries(config.registries).map(([namespace, base]) => listRegistry(root, base, config.styleSystem, namespace, fetchImpl)),
  ])
}

export interface MorphosUse {
  name: string
  package: string
  files: string[]
}

/** Morphos exports the project imports, with the files that import each. */
export function morphosUsage(imports: Array<{ file: string; source: string; names: string[] }>): MorphosUse[] {
  const uses = new Map<string, MorphosUse>()
  for (const imp of imports) {
    if (!imp.source.startsWith('@morphos/')) continue
    for (const name of imp.names) {
      const key = `${imp.source}#${name}`
      const use = uses.get(key) ?? { name, package: imp.source, files: [] }
      if (!use.files.includes(imp.file)) use.files.push(imp.file)
      uses.set(key, use)
    }
  }
  return [...uses.values()].sort((a, b) => Number(a.name > b.name) - Number(a.name < b.name))
}

/** Installed `@morphos/*` packages under the project's node_modules. */
export function installedMorphosPackages(root: string): string[] {
  const dir = path.join(root, 'node_modules', '@morphos')
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort().map((name) => `@morphos/${name}`) : []
}

/** What the registries say about one installed component. */
export function componentStatus(component: InstalledComponent, listings: RegistryListing[]): string {
  const item = listings.flatMap((l) => l.items).find((i) => i.address === component.address)
  const parts: string[] = []
  if (!component.tracked) parts.push('untracked: run `kosmesis outdated` to start tracking it')
  else if (component.version) parts.push(`version ${component.version}`)
  else parts.push('version unknown')
  if (item?.version && component.version && compareVersions(item.version, component.version) > 0) parts.push(`${item.version} available`)
  if (!item && listings.every((l) => !l.error)) parts.push('not in the configured registries')
  if (component.edited) parts.push('edited locally')
  return parts.join(', ')
}

/** The "UI libraries" section of the project inspection: Morphos packages and usage, Kosmesis setup and components. */
export async function uiLibrariesReport(
  root: string,
  imports: Array<{ file: string; source: string; names: string[] }>,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const morphos = morphosUsage(imports)
  const packages = installedMorphosPackages(root)
  const kosmesis = readKosmesisConfig(root)
  if (morphos.length === 0 && packages.length === 0 && !kosmesis) return []
  const lines = ['## UI libraries (Morphos, Kosmesis)', '']
  if (packages.length > 0 || morphos.length > 0) {
    lines.push(`- Morphos packages installed: ${packages.length > 0 ? packages.join(', ') : 'none'}`)
    for (const use of morphos) lines.push(`  - \`${use.name}\` (${use.package}) — ${use.files.join(', ')}`)
  }
  if (!kosmesis) {
    lines.push('- Kosmesis: not set up (no components.json); `npx kosmesis init` sets it up')
    return lines
  }
  const listings = await listAllRegistries(root, kosmesis, fetchImpl)
  const registries = [`default ${kosmesis.registry}`, ...Object.entries(kosmesis.registries).map(([ns, base]) => `${ns} ${base}`)]
  lines.push(`- Kosmesis: style system \`${kosmesis.styleSystem}\`, components in \`${kosmesis.uiDir}/\`, registries: ${registries.join('; ')}`)
  for (const listing of listings.filter((l) => l.error)) lines.push(`  - registry ${listing.registry} unreachable (${String(listing.error)}): update status unknown`)
  const installed = installedComponents(root, kosmesis)
  if (installed.length === 0) lines.push('  - no components installed yet')
  for (const component of installed) lines.push(`  - \`${component.address}\`: ${componentStatus(component, listings)}`)
  return lines
}
