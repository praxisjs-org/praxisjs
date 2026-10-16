import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'storybook-static',
  'public',
])

const SOURCE_FILE = /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/
const DECLARATION_FILE = /\.d\.[cm]?ts$/
const TEST_FILE = /(?:^|\/)__tests__\/|\.(?:test|spec|stories|story)\.[^/]+$/

export const MAX_SOURCE_FILES = 5000

/**
 * The project the server works on. An explicit `PRAXISJS_PROJECT_ROOT` wins, then the project
 * directory Claude Code passes to the servers it starts (`CLAUDE_PROJECT_DIR`), then the first root
 * the client announced, then the working directory. From there the nearest folder with a
 * `package.json` is used, so a server started from `src/` still serves the whole project.
 */
export function resolveProjectRoot(
  env: Record<string, string | undefined>,
  cwd: string,
  clientRoots: string[] = [],
): string {
  const fromEnv = [env.PRAXISJS_PROJECT_ROOT, env.CLAUDE_PROJECT_DIR].find((value) => value !== undefined && value !== '')
  const start = fromEnv ?? clientRoots.map(rootPath).find(Boolean) ?? cwd
  const resolved = path.resolve(cwd, start)
  for (let dir = resolved; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir
    if (path.dirname(dir) === dir) return resolved
  }
}

function rootPath(uri: string): string | undefined {
  if (!uri.startsWith('file://')) return undefined
  try {
    return fileURLToPath(uri)
  } catch {
    return undefined
  }
}

export function toPosix(file: string): string {
  return file.split(path.sep).join('/')
}

export function isTestFile(file: string): boolean {
  return TEST_FILE.test(file)
}

/** Source files under `root` as sorted POSIX paths relative to it, skipping build output and dot-folders. */
export function listSourceFiles(root: string, limit = MAX_SOURCE_FILES): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((a, b) => Number(a.name > b.name) - Number(a.name < b.name))
    for (const entry of entries) {
      if (files.length >= limit) return
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(full)
      } else if (SOURCE_FILE.test(entry.name) && !DECLARATION_FILE.test(entry.name)) {
        files.push(toPosix(path.relative(root, full)))
      }
    }
  }
  walk(root)
  return files
}

/**
 * Resolves a project-relative path and refuses anything that leaves the project, so a tool argument
 * such as `../../etc/passwd` cannot read or write outside it.
 */
export function insideProject(root: string, relative: string): string {
  const full = path.resolve(root, relative)
  const back = path.relative(root, full)
  if (back === '' || back.startsWith('..') || path.isAbsolute(back)) {
    throw new Error(`"${relative}" is outside the project root.`)
  }
  return full
}

/** Drops comments and trailing commas, which `tsconfig.json` files commonly have. */
export function stripJsonc(text: string): string {
  let result = ''
  for (let k = 0; k < text.length; k++) {
    const c = text[k]
    if (c === '"') {
      const start = k
      for (k++; k < text.length && text[k] !== '"'; k++) if (text[k] === '\\') k++
      result += text.slice(start, k + 1)
    } else if (c === '/' && text[k + 1] === '/') {
      while (k < text.length && text[k] !== '\n') k++
      result += '\n'
    } else if (c === '/' && text[k + 1] === '*') {
      const end = text.indexOf('*/', k + 2)
      k = end === -1 ? text.length : end + 1
    } else {
      result += c
    }
  }
  return result.replace(/,(\s*[}\]])/g, '$1')
}

export function readJson(file: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(stripJsonc(fs.readFileSync(file, 'utf8')))
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}
