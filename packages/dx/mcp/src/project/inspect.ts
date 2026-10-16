import fs from 'node:fs'
import path from 'node:path'


import { installedVersion } from './declarations.js'
import { readJson } from './files.js'
import { scanProject, type CodeItem, type ProjectScan } from './scan.js'
import { detectLayout, isPage, routedComponentNames } from '../knowledge/layout.js'
import { compareText } from '../knowledge/text.js'

export interface PackageInfo {
  name: string
  declared: string
  installed?: string
  dev: boolean
}

export interface ProjectInfo {
  root: string
  name?: string
  packages: PackageInfo[]
  tsconfigIssues: string[]
  integrations: string[]
  memory: boolean
  scan: ProjectScan
}

function tsconfigIssues(root: string): string[] {
  const tsconfig = readJson(path.join(root, 'tsconfig.json'))
  if (!tsconfig) return ['no readable tsconfig.json at the project root']
  const options = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>
  const issues: string[] = []
  if (options.jsxImportSource !== '@praxisjs/jsx') issues.push('"jsxImportSource" should be "@praxisjs/jsx"')
  if (options.jsx !== 'react-jsx') issues.push('"jsx" should be "react-jsx"')
  if (options.useDefineForClassFields !== true) issues.push('"useDefineForClassFields" should be true')
  return issues
}

export function inspectProject(root: string): ProjectInfo {
  const manifest = readJson(path.join(root, 'package.json')) ?? {}
  const packages: PackageInfo[] = []
  for (const [field, dev] of [
    ['dependencies', false],
    ['devDependencies', true],
  ] as const) {
    const deps = (manifest[field] ?? {}) as Record<string, unknown>
    for (const [name, declared] of Object.entries(deps)) {
      if (!/^@(?:praxisjs|morphos)\//.test(name) && name !== 'praxisjs' && name !== 'kosmesis') continue
      packages.push({ name, declared: String(declared), installed: installedVersion(root, name), dev })
    }
  }
  packages.sort((a, b) => compareText(a.name, b.name))

  const integrations = [
    ['.claude/skills/praxisjs/SKILL.md', 'Claude Code skill'],
    ['.agents/skills/praxisjs/SKILL.md', 'Codex skill'],
    ['.mcp.json', 'project MCP config (.mcp.json)'],
    ['.codex/config.toml', 'project Codex config (.codex/config.toml)'],
    ['.praxisjs-ai.json', 'AI preferences (.praxisjs-ai.json)'],
  ]
    .filter(([file]) => fs.existsSync(path.join(root, file)))
    .map(([, label]) => label)

  return {
    root,
    name: typeof manifest.name === 'string' ? manifest.name : undefined,
    packages,
    tsconfigIssues: tsconfigIssues(root),
    integrations,
    memory: fs.existsSync(path.join(root, '.praxis', 'index.md')),
    scan: scanProject(root),
  }
}

function itemLine(item: CodeItem): string {
  const extra = [
    item.variant,
    item.route ? `route ${item.route}` : undefined,
    item.props && item.props.length > 0 ? `props: ${item.props.join(', ')}` : undefined,
    item.signature && item.kind !== 'component' ? item.signature : undefined,
  ].filter(Boolean)
  return `- \`${item.name}\` — ${item.file}:${String(item.line)}${extra.length > 0 ? ` (${extra.join('; ')})` : ''}${item.summary ? `: ${item.summary}` : ''}`
}

export function renderProjectInfo(info: ProjectInfo): string {
  const { scan } = info
  const routed = routedComponentNames(scan)
  const out: string[] = [`# ${info.name ?? path.basename(info.root)}`, '', `Root: ${info.root}`, '']

  out.push('## PraxisJS ecosystem packages', '')
  if (info.packages.length === 0) out.push('No @praxisjs/* dependency in package.json — is this a PraxisJS project?')
  for (const p of info.packages) {
    out.push(`- ${p.name} ${p.declared}${p.installed ? ` (installed ${p.installed})` : ' (not installed)'}${p.dev ? ', dev' : ''}`)
  }
  out.push('', '## Configuration', '')
  out.push(info.tsconfigIssues.length === 0 ? '- tsconfig.json: OK for PraxisJS' : `- tsconfig.json: ${info.tsconfigIssues.join('; ')}`)
  out.push(`- AI integrations: ${info.integrations.length > 0 ? info.integrations.join(', ') : 'none'}`)
  out.push(
    `- Project memory (.praxis/): ${info.memory ? 'present — query it with praxisjs_memory_search' : 'not set up — run praxisjs_memory_init'}`,
  )

  const groups: Array<[string, (item: CodeItem) => boolean]> = [
    ['Pages', (i) => isPage(i, routed)],
    ['Components', (i) => i.kind === 'component' && !isPage(i, routed)],
    ['Stores', (i) => i.kind === 'store'],
    ['Composables', (i) => i.kind === 'composable'],
    ['Services', (i) => i.kind === 'service'],
    ['Custom decorators', (i) => i.kind === 'decorator'],
    ['Stylesheets', (i) => i.kind === 'stylesheet'],
    ['Exported helpers and classes', (i) => i.kind === 'function' || i.kind === 'class'],
  ]
  for (const [title, test] of groups) {
    const items = scan.items.filter(test)
    if (items.length === 0) continue
    out.push('', `## ${title} (${String(items.length)})`, '', ...items.map(itemLine))
  }

  if (scan.routes.length > 0) {
    out.push('', '## Routes', '')
    for (const r of scan.routes) {
      out.push(`- \`${r.path}\` → ${r.component ?? '?'}${r.lazy ? ' (lazy)' : ''} — ${r.file}:${String(r.line)}`)
    }
  }

  const layout = detectLayout(scan)
  const folders = Object.entries(layout.dirs).map(([kind, dir]) => `- ${kind}: ${dir}/`)
  out.push('', '## Folder layout', '', ...(folders.length > 0 ? folders : ['- no source files found']))
  out.push(`- tests: ${layout.tests === 'none' ? 'none yet' : layout.tests === 'folder' ? '__tests__/ folders' : 'next to the code'}`)
  out.push('', `${String(scan.files.length)} source files scanned${scan.truncated ? ' (limit reached, the rest was skipped)' : ''}.`)
  return out.join('\n')
}
