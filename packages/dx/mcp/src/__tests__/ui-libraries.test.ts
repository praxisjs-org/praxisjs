import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  compareVersions,
  componentStatus,
  hashContent,
  installedComponents,
  installedMorphosPackages,
  listAllRegistries,
  listRegistry,
  morphosUsage,
  readKosmesisConfig,
  uiLibrariesReport,
} from '../project/ui-libraries.js'

import { makeProject, removeProjects } from './fixtures.js'

afterEach(() => {
  removeProjects()
  vi.restoreAllMocks()
})

const BUTTON = 'export class Button {}\n'
const INDEX = {
  items: [
    { name: 'button', version: '1.2.0', title: 'Button', description: 'A button.', dependencies: ['@morphos/inputs'], registryDependencies: ['spinner'] },
    { name: 'card', version: '1.0.0', description: 'A card.' },
    { name: 'plain' },
    { name: 7 },
  ],
}

function kosmesisProject(extra: Record<string, string> = {}) {
  return makeProject({
    'components.json': JSON.stringify({ styleSystem: 'praxisjs-css', aliases: { ui: 'src/ui/' }, registry: 'registry', registries: { '@acme': 'https://acme.dev/r', bad: 1 } }),
    'components.lock.json': JSON.stringify({
      lockfileVersion: 1,
      components: {
        button: { version: '1.0.0', files: { 'src/ui/button.tsx': hashContent(BUTTON) } },
        '@acme/chart': { files: { 'src/ui/chart.tsx': 'sha256-other' } },
        spinner: { version: '1.0.0', adopted: true, files: { 'src/ui/spinner.tsx': hashContent('x') } },
        gone: { version: '1.0.0', files: { 'src/ui/gone.tsx': 'sha256-x' } },
        empty: { version: '1.0.0' },
      },
    }),
    'src/ui/button.tsx': BUTTON,
    'src/ui/chart.tsx': 'edited',
    'src/ui/spinner.tsx': 'x',
    'src/ui/legacy.tsx': 'export class Legacy {}',
    'src/ui/readme.md': '',
    'registry/praxisjs-css/index.json': JSON.stringify(INDEX),
    ...extra,
  })
}

describe('Kosmesis project data', () => {
  it('reads components.json with defaults', () => {
    const root = kosmesisProject()
    expect(readKosmesisConfig(root)).toEqual({ styleSystem: 'praxisjs-css', uiDir: 'src/ui', registry: 'registry', registries: { '@acme': 'https://acme.dev/r' } })
    expect(readKosmesisConfig(makeProject({ 'components.json': '{}' }))).toEqual({
      styleSystem: 'tailwind',
      uiDir: 'src/components/ui',
      registry: 'https://kosmesis.praxisjs.org/r',
      registries: {},
    })
    expect(readKosmesisConfig(makeProject())).toBeUndefined()
  })

  it('lists installed components with version and edit status, and untracked files', () => {
    const root = kosmesisProject()
    const config = readKosmesisConfig(root)
    if (!config) throw new Error('no config')
    expect(installedComponents(root, config).map((c) => [c.address, c.version, c.tracked, c.edited])).toEqual([
      ['@acme/chart', undefined, true, true],
      ['button', '1.0.0', true, false],
      ['empty', '1.0.0', true, false],
      ['gone', '1.0.0', true, true],
      ['spinner', '1.0.0', true, true],
      ['legacy', undefined, false, false],
    ])
    expect(installedComponents(makeProject(), { ...config, uiDir: 'missing' })).toEqual([])
  })
})

describe('registries', () => {
  it('reads index.json from a local folder or over http, and falls back to item files', async () => {
    const root = kosmesisProject({
      'flat/praxisjs-css/badge.json': JSON.stringify({ name: 'badge', version: '1.0.0' }),
      'flat/praxisjs-css/broken.json': '{',
    })
    const local = await listRegistry(root, 'registry', 'praxisjs-css')
    expect(local.items.map((i) => [i.address, i.version, i.dependencies, i.registryDependencies])).toEqual([
      ['button', '1.2.0', ['@morphos/inputs'], ['spinner']],
      ['card', '1.0.0', [], []],
      ['plain', undefined, [], []],
    ])
    expect((await listRegistry(root, 'flat', 'praxisjs-css', '@me')).items.map((i) => i.address)).toEqual(['@me/badge'])
    expect((await listRegistry(root, 'missing', 'tailwind')).error).toContain('ENOENT')

    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('acme') ? new Response(JSON.stringify({ items: [{ name: 'chart', version: '2.0.0' }] })) : new Response('nope', { status: 500 }),
    ) as unknown as typeof fetch
    const remote = await listRegistry(root, 'https://acme.dev/r/', 'tailwind', '@acme', fetchImpl)
    expect(remote.items[0]).toMatchObject({ address: '@acme/chart', version: '2.0.0' })
    expect((await listRegistry(root, 'https://down.dev', 'tailwind', undefined, fetchImpl)).error).toBe('https://down.dev/tailwind/index.json: HTTP 500')
    expect((await listRegistry(root, 'https://x.dev', 'tailwind', undefined, vi.fn(async () => new Response('{"items": 3}')) as unknown as typeof fetch)).items).toEqual([])
    const thrown = await listRegistry(root, 'https://x.dev', 'tailwind', undefined, vi.fn(() => Promise.reject('offline')) as unknown as typeof fetch)
    expect(thrown.error).toBe('offline')

    const config = readKosmesisConfig(root)
    if (!config) throw new Error('no config')
    const all = await listAllRegistries(root, config, fetchImpl)
    expect(all.map((l) => l.registry)).toEqual(['registry', 'https://acme.dev/r'])
  })

  it('describes each installed component against the registries', async () => {
    const root = kosmesisProject()
    const config = readKosmesisConfig(root)
    if (!config) throw new Error('no config')
    const listings = await listAllRegistries(root, config, vi.fn(async () => new Response(JSON.stringify({ items: [{ name: 'chart', version: '2.0.0' }] }))) as unknown as typeof fetch)
    const status = Object.fromEntries(installedComponents(root, config).map((c) => [c.address, componentStatus(c, listings)]))
    expect(status).toEqual({
      '@acme/chart': 'version unknown, edited locally',
      button: 'version 1.0.0, 1.2.0 available',
      empty: 'version 1.0.0, not in the configured registries',
      gone: 'version 1.0.0, not in the configured registries, edited locally',
      spinner: 'version 1.0.0, not in the configured registries, edited locally',
      legacy: 'untracked: run `kosmesis outdated` to start tracking it, not in the configured registries',
    })
    const offline = [{ registry: 'x', items: [], error: 'down' }]
    expect(componentStatus({ address: 'a', name: 'a', files: [], tracked: true, edited: false, version: '1.0.0' }, offline)).toBe('version 1.0.0')
  })
})

describe('Morphos', () => {
  it('collects imported primitives and installed packages', () => {
    expect(
      morphosUsage([
        { file: 'a.tsx', source: '@morphos/overlays', names: ['Dialog', 'DialogContent'] },
        { file: 'b.tsx', source: '@morphos/overlays', names: ['Dialog'] },
        { file: 'b.tsx', source: '@morphos/overlays', names: ['Dialog'] },
        { file: 'c.tsx', source: '@praxisjs/core', names: ['StatefulComponent'] },
      ]),
    ).toEqual([
      { name: 'Dialog', package: '@morphos/overlays', files: ['a.tsx', 'b.tsx'] },
      { name: 'DialogContent', package: '@morphos/overlays', files: ['a.tsx'] },
    ])
    const root = makeProject({ 'node_modules/@morphos/inputs/package.json': '{}', 'node_modules/@morphos/core/package.json': '{}' })
    expect(installedMorphosPackages(root)).toEqual(['@morphos/core', '@morphos/inputs'])
    expect(installedMorphosPackages(makeProject())).toEqual([])
  })

  it('compares versions', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBe(0)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.1', '1.0')).toBe(1)
    expect(compareVersions('x', '0.0.1')).toBe(-1)
  })
})

describe('uiLibrariesReport', () => {
  it('is empty without Morphos or Kosmesis', async () => {
    expect(await uiLibrariesReport(makeProject(), [])).toEqual([])
  })

  it('reports Morphos usage and that Kosmesis is not set up', async () => {
    const root = makeProject({ 'node_modules/@morphos/overlays/package.json': '{}' })
    expect(await uiLibrariesReport(root, [{ file: 'a.tsx', source: '@morphos/overlays', names: ['Dialog'] }])).toEqual([
      '## UI libraries (Morphos, Kosmesis)',
      '',
      '- Morphos packages installed: @morphos/overlays',
      '  - `Dialog` (@morphos/overlays) — a.tsx',
      '- Kosmesis: not set up (no components.json); `npx kosmesis init` sets it up',
    ])
    expect((await uiLibrariesReport(makeProject(), [{ file: 'a.tsx', source: '@morphos/x', names: ['Y'] }]))[2]).toBe('- Morphos packages installed: none')
  })

  it('reports Kosmesis setup, unreachable registries and component status', async () => {
    const root = kosmesisProject()
    const lines = await uiLibrariesReport(root, [], vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch)
    expect(lines).toContain('- Kosmesis: style system `praxisjs-css`, components in `src/ui/`, registries: default registry; @acme https://acme.dev/r')
    expect(lines).toContain('  - registry https://acme.dev/r unreachable (offline): update status unknown')
    expect(lines).toContain('  - `button`: version 1.0.0, 1.2.0 available')
    fs.rmSync(path.join(root, 'src/ui'), { recursive: true })
    fs.writeFileSync(path.join(root, 'components.lock.json'), '{}')
    expect(await uiLibrariesReport(root, [], vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch)).toContain('  - no components installed yet')
  })
})
