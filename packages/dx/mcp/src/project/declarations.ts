import fs from 'node:fs'
import path from 'node:path'

import { readJson } from './files.js'
import { maskSource, matchBracket } from './mask.js'

const MAX_LINES = 40

/** The installed package folder, looking in `root/node_modules` and its parents like Node does. */
export function packageDir(root: string, pkg: string): string | undefined {
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', ...pkg.split('/'))
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
    if (path.dirname(dir) === dir) return undefined
  }
}

export function installedVersion(root: string, pkg: string): string | undefined {
  const dir = packageDir(root, pkg)
  const version = dir ? readJson(path.join(dir, 'package.json'))?.version : undefined
  return typeof version === 'string' ? version : undefined
}

function typesEntry(dir: string): string | undefined {
  const manifest = readJson(path.join(dir, 'package.json')) ?? {}
  const fromExports = (value: unknown): string | undefined => {
    if (typeof value === 'string') return /\.d\.[cm]?ts$/.test(value) ? value : undefined
    if (value === null || typeof value !== 'object') return undefined
    const record = value as Record<string, unknown>
    for (const key of ['types', 'import', 'default', '.']) {
      const found = fromExports(record[key])
      if (found) return found
    }
    return undefined
  }
  const exportsField = manifest.exports
  const candidates = [
    fromExports(exportsField !== null && typeof exportsField === 'object' ? (exportsField as Record<string, unknown>)['.'] : undefined),
    typeof manifest.types === 'string' ? manifest.types : undefined,
    typeof manifest.typings === 'string' ? manifest.typings : undefined,
    'dist/index.d.ts',
    'index.d.ts',
  ]
  return candidates
    .filter((c): c is string => c !== undefined)
    .map((c) => path.join(dir, c))
    .find((file) => fs.existsSync(file))
}

function resolveModule(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  const base = path.resolve(path.dirname(fromFile), specifier)
  const stem = base.replace(/\.(?:[cm]?js|[cm]?ts)$/, '')
  return [`${stem}.d.ts`, `${stem}.d.mts`, `${stem}.d.cts`, path.join(base, 'index.d.ts')].find((f) => fs.existsSync(f))
}

/** The declaration text starting at `start`: up to the `;` that ends it, or the closing `}` of a class/interface body. */
function declarationAt(text: string, masked: string, start: number): string {
  let k = start
  while (k < masked.length) {
    const c = masked[k]
    if (c === ';') return text.slice(start, k + 1)
    if (c === '{' || c === '(' || c === '[') {
      const close = matchBracket(masked, k)
      if (close === -1) return text.slice(start)
      if (c === '{' && /\b(?:class|interface|enum)\b/.test(masked.slice(start, k))) return text.slice(start, close + 1)
      k = close + 1
      continue
    }
    k++
  }
  return text.slice(start, k)
}

function truncate(text: string): string {
  const lines = text
    .split('\n')
    .filter((line) => !/^\s*(?:\/\/# sourceMappingURL|private\b|#)/.test(line))
  return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), '    // …'].join('\n') : lines.join('\n')
}

/**
 * Finds the type declaration of an export in an installed package by following its `.d.ts`
 * re-exports (`export { X } from "./x"`, `export * from "./y"`). Returns every overload.
 */
export function findDeclaration(root: string, pkg: string, name: string): string | undefined {
  const dir = packageDir(root, pkg)
  const entry = dir ? typesEntry(dir) : undefined
  if (!entry) return undefined
  const visited = new Set<string>()

  const search = (file: string, symbol: string): string | undefined => {
    if (visited.has(`${file}#${symbol}`)) return undefined
    visited.add(`${file}#${symbol}`)
    const text = fs.readFileSync(file, 'utf8')
    const masked = maskSource(text)
    const escaped = symbol.replace(/\$/g, '\\$')
    const declaration = new RegExp(
      String.raw`(?:^|\n)[ \t]*((?:export[ \t]+)?(?:default[ \t]+)?(?:declare[ \t]+)?(?:abstract[ \t]+)?(?:function|class|const|let|interface|type|enum)[ \t]+${escaped}\b)`,
      'g',
    )
    const found = [...masked.matchAll(declaration)].map((m) => declarationAt(text, masked, m.index + m[0].indexOf(m[1])).trim())
    if (found.length > 0) return truncate(found.join('\n'))

    for (const match of masked.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}\s*from\s*(['"])/g)) {
      const specifierStart = match.index + match[0].length
      const specifier = text.slice(specifierStart, text.indexOf(match[2], specifierStart))
      for (const part of text.slice(match.index, match.index + match[0].length).replace(/^[^{]*\{|\}[^}]*$/g, '').split(',')) {
        const [original, alias] = part.replace(/\btype\s+/, '').split(/\s+as\s+/).map((s) => s.trim())
        if ((alias || original) !== symbol) continue
        const target = resolveModule(file, specifier)
        const result = target ? search(target, original) : undefined
        if (result) return result
      }
    }
    for (const match of masked.matchAll(/export\s*\*\s*from\s*(['"])/g)) {
      const specifierStart = match.index + match[0].length
      const target = resolveModule(file, text.slice(specifierStart, text.indexOf(match[1], specifierStart)))
      const result = target ? search(target, symbol) : undefined
      if (result) return result
    }
    return undefined
  }

  return search(entry, name)
}
