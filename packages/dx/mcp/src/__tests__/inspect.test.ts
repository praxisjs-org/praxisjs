import { afterEach, describe, expect, it } from 'vitest'

import { inspectProject, renderProjectInfo } from '../project/inspect.js'

import { APP_FILES, makeProject, removeProjects } from './fixtures.js'

afterEach(removeProjects)

describe('inspectProject', () => {
  it('reports packages, configuration, integrations and code', () => {
    const root = makeProject({
      ...APP_FILES,
      'node_modules/@praxisjs/core/package.json': JSON.stringify({ version: '2.3.1' }),
      '.claude/skills/praxisjs/SKILL.md': '',
      '.mcp.json': '{}',
      '.praxis/index.md': '',
    })
    const info = inspectProject(root)
    expect(info.name).toBe('demo-app')
    expect(info.packages).toEqual([
      { name: '@praxisjs/core', declared: '^2.3.0', installed: '2.3.1', dev: false },
      { name: '@praxisjs/decorators', declared: '^1.8.0', installed: undefined, dev: false },
      { name: '@praxisjs/vite-plugin', declared: '^4.1.0', installed: undefined, dev: true },
    ])
    expect(info.tsconfigIssues).toEqual([])
    expect(info.integrations).toEqual(['Claude Code skill', 'project MCP config (.mcp.json)'])
    expect(info.memory).toBe(true)

    const text = renderProjectInfo(info)
    expect(text).toContain('# demo-app')
    expect(text).toContain('- @praxisjs/core ^2.3.0 (installed 2.3.1)')
    expect(text).toContain('- @praxisjs/vite-plugin ^4.1.0 (not installed), dev')
    expect(text).toContain('- tsconfig.json: OK for PraxisJS')
    expect(text).toContain('- Project memory (.praxis/): present')
    expect(text).toContain('## Pages (2)')
    expect(text).toContain("- `UserCard` — src/components/user-card.tsx:5 (stateless; props: { name: string }): Shows a user's name and avatar.")
    expect(text).toContain('- `About` — src/pages/about.tsx:5 (stateful; route /about)')
    expect(text).toContain('- `formatPrice` — src/utils/format.ts:2 ((cents: number): string): Formats a price in cents.')
    expect(text).toContain('- `/about` → ./pages/about (lazy) — src/app.tsx:8')
    expect(text).toContain('- component: src/components/')
    expect(text).toContain('- tests: __tests__/ folders')
    expect(text).toMatch(/\d+ source files scanned\.$/)
  })

  it('describes a project that is not set up for PraxisJS', () => {
    const root = makeProject({
      'package.json': JSON.stringify({ dependencies: { '@morphos/overlays': '^1.0.0', react: '^18.0.0' }, devDependencies: { praxisjs: '^1.0.0', kosmesis: '^0.5.0' } }),
      'tsconfig.json': '{ "compilerOptions": { "jsx": "preserve" } }',
      'src/a.test.ts': '',
      'src/app.tsx': "@Router([{ path: '/redirect', redirect: '/' }])\n@Component()\nexport class App extends StatefulComponent {}",
    })
    const info = inspectProject(root)
    expect(info.tsconfigIssues).toEqual([
      '"jsxImportSource" should be "@praxisjs/jsx"',
      '"jsx" should be "react-jsx"',
      '"useDefineForClassFields" should be true',
    ])
    const text = renderProjectInfo(info)
    expect(text).toContain('- praxisjs ^1.0.0 (not installed), dev')
    expect(text).toContain('- @morphos/overlays ^1.0.0 (not installed)')
    expect(text).toContain('- kosmesis ^0.5.0 (not installed), dev')
    expect(text).not.toContain('- react ^18')
    expect(text).toContain('- AI integrations: none')
    expect(text).toContain('not set up — run praxisjs_memory_init')
    expect(text).toContain('- tests: next to the code')
    expect(text).toContain('- `/redirect` → ? — src/app.tsx:1')
  })

  it('handles a folder without package.json, tsconfig or sources', () => {
    const root = makeProject({ 'tsconfig.json': '{}' })
    const info = inspectProject(root)
    expect(info.name).toBeUndefined()
    expect(info.tsconfigIssues).toHaveLength(3)
    const text = renderProjectInfo({ ...info, scan: { ...info.scan, truncated: true } })
    expect(text).toContain('No @praxisjs/* dependency in package.json')
    expect(text).toContain('- no source files found')
    expect(text).toContain('- tests: none yet')
    expect(text).toContain('(limit reached, the rest was skipped)')
    expect(inspectProject(makeProject()).tsconfigIssues).toEqual(['no readable tsconfig.json at the project root'])
  })
})
