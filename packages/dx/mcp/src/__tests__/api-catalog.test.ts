import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { API_CATALOG, API_KINDS, CATALOG_PACKAGES, apiNames, findApi } from '../knowledge/api-catalog.js'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const docsRoot = path.join(repo, 'docs/content/docs')

/** Source folder of every workspace package, by package name. */
function packageSources(): Map<string, string> {
  const map = new Map<string, string>()
  for (const group of fs.readdirSync(path.join(repo, 'packages'))) {
    const groupDir = path.join(repo, 'packages', group)
    if (!fs.statSync(groupDir).isDirectory()) continue
    for (const name of fs.readdirSync(groupDir)) {
      const manifest = path.join(groupDir, name, 'package.json')
      if (!fs.existsSync(manifest)) continue
      const { name: pkg } = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name: string }
      map.set(pkg, path.join(groupDir, name, 'src'))
    }
  }
  return map
}

function resolveModule(fromFile: string, specifier: string, srcRoot: string): string | undefined {
  const base = specifier.startsWith('@/') ? path.join(srcRoot, specifier.slice(2)) : path.resolve(path.dirname(fromFile), specifier)
  const stem = base.replace(/\.js$/, '')
  return [`${stem}.ts`, `${stem}.tsx`, path.join(stem, 'index.ts')].find((f) => fs.existsSync(f))
}

/** Runtime (non-type) exports of a module, following `export … from` inside the package. */
function valueExports(file: string, srcRoot: string, seen = new Set<string>()): Set<string> {
  const names = new Set<string>()
  if (seen.has(file)) return names
  seen.add(file)
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  for (const m of text.matchAll(/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|enum)\s+([\w$]+)/gm)) {
    names.add(m[1])
  }
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/gm)) {
    for (const part of m[1].split(',')) {
      const spec = part.trim()
      if (spec === '' || spec.startsWith('type ')) continue
      names.add(spec.split(/\s+as\s+/).at(-1) ?? spec)
    }
  }
  for (const m of text.matchAll(/^export\s*\*\s*from\s*['"]([^'"]+)['"]/gm)) {
    const target = resolveModule(file, m[1], srcRoot)
    if (target) for (const name of valueExports(target, srcRoot, seen)) names.add(name)
  }
  return names
}

function docsPages(dir = docsRoot, prefix = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return docsPages(path.join(dir, entry.name), `${prefix}${entry.name}/`)
    if (!entry.name.endsWith('.mdx')) return []
    const name = entry.name.slice(0, -4)
    return [name === 'index' ? prefix.slice(0, -1) : `${prefix}${name}`]
  })
}

describe('API_CATALOG', () => {
  const sources = packageSources()

  it.each(CATALOG_PACKAGES)('lists exactly the runtime exports of %s', (pkg) => {
    const src = sources.get(pkg)
    expect(src, `${pkg} is not a workspace package`).toBeDefined()
    const actual = [...valueExports(path.join(String(src), 'index.ts'), String(src))].filter((n) => !n.startsWith('_$')).sort()
    const listed = API_CATALOG.filter((e) => e.package === pkg).map((e) => e.name).sort()
    expect(listed).toEqual(actual)
  })

  it('points every entry at an existing docs page', () => {
    const pages = new Set(docsPages())
    expect(API_CATALOG.filter((e) => !pages.has(e.docs)).map((e) => `${e.name}: ${e.docs}`)).toEqual([])
  })

  it('has one entry per name and package, with known kinds', () => {
    const keys = API_CATALOG.map((e) => `${e.package}#${e.name}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(API_CATALOG.every((e) => (API_KINDS as readonly string[]).includes(e.kind))).toBe(true)
  })

  it('finds entries by name, with or without @ and ()', () => {
    expect(findApi('@State').map((e) => e.package)).toEqual(['@praxisjs/decorators'])
    expect(findApi(' Debounce() ').map((e) => e.name)).toEqual(['Debounce'])
    expect(findApi('Lazy').map((e) => e.package).sort()).toEqual(['@praxisjs/decorators', '@praxisjs/router'])
    expect(findApi('Nope')).toEqual([])
    expect(apiNames((e) => e.kind === 'composable').has('WindowSize')).toBe(true)
  })
})
