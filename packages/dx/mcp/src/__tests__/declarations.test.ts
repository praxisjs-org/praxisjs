import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findDeclaration, installedVersion, packageDir } from '../project/declarations.js'

import { makeProject, removeProjects } from './fixtures.js'

afterEach(removeProjects)

const pkg = (name: string, manifest: Record<string, unknown>) => ({
  [`node_modules/${name}/package.json`]: JSON.stringify({ name, version: '1.2.3', ...manifest }),
})

describe('packageDir / installedVersion', () => {
  it('finds packages in the project or a parent node_modules', () => {
    const root = makeProject({ ...pkg('@praxisjs/core', {}), 'app/package.json': '{}' })
    expect(packageDir(path.join(root, 'app'), '@praxisjs/core')).toBe(path.join(root, 'node_modules', '@praxisjs', 'core'))
    expect(installedVersion(path.join(root, 'app'), '@praxisjs/core')).toBe('1.2.3')
    expect(packageDir(root, '@praxisjs/missing')).toBeUndefined()
    expect(installedVersion(root, '@praxisjs/missing')).toBeUndefined()
  })

  it('ignores a manifest without a version', () => {
    const root = makeProject({ 'node_modules/x/package.json': '{"name":"x"}' })
    expect(installedVersion(root, 'x')).toBeUndefined()
  })
})

describe('findDeclaration', () => {
  it('follows named and star re-exports through the types entry', () => {
    const root = makeProject({
      ...pkg('@praxisjs/decorators', { exports: { '.': { import: { types: './dist/index.d.mts' } } } }),
      'node_modules/@praxisjs/decorators/dist/index.d.mts': [
        `export { Debounce } from "./timing/index.js";`,
        `export { inner as Renamed, type T } from './renamed';`,
        `export * from "./all";`,
        `export * from "external-package";`,
        `export { Missing } from "./nope";`,
        `export { Loop } from "./loop";`,
      ].join('\n'),
      'node_modules/@praxisjs/decorators/dist/timing/index.d.ts': `export { Debounce } from './debounce'`,
      'node_modules/@praxisjs/decorators/dist/timing/debounce.d.ts':
        '/** Delays. */\nexport declare function Debounce(ms: number): MethodDecorator;\nexport declare function Debounce(ms: number, opts: object): MethodDecorator;\n//# sourceMappingURL=debounce.d.ts.map',
      'node_modules/@praxisjs/decorators/dist/renamed.d.ts': 'declare const inner: (a: string) => void;\nexport { inner };',
      'node_modules/@praxisjs/decorators/dist/all/index.d.ts': [
        'export declare class Big extends Base {',
        '    private secret;',
        '    #hidden;',
        ...Array.from({ length: 45 }, (_, k) => `    m${String(k)}(): void;`),
        '}',
        'export interface Shape { a: string }',
        'export type Alias = { b: string };',
      ].join('\n'),
      'node_modules/@praxisjs/decorators/dist/loop.d.ts': `export { Loop } from "./loop";`,
    })
    expect(findDeclaration(root, '@praxisjs/decorators', 'Debounce')).toBe(
      'export declare function Debounce(ms: number): MethodDecorator;\nexport declare function Debounce(ms: number, opts: object): MethodDecorator;',
    )
    expect(findDeclaration(root, '@praxisjs/decorators', 'Renamed')).toBe('declare const inner: (a: string) => void;')
    const big = findDeclaration(root, '@praxisjs/decorators', 'Big') ?? ''
    expect(big.split('\n')).toHaveLength(41)
    expect(big).not.toContain('secret')
    expect(big).not.toContain('#hidden')
    expect(big.endsWith('// …')).toBe(true)
    expect(findDeclaration(root, '@praxisjs/decorators', 'Shape')).toBe('export interface Shape { a: string }')
    expect(findDeclaration(root, '@praxisjs/decorators', 'Alias')).toBe('export type Alias = { b: string };')
    expect(findDeclaration(root, '@praxisjs/decorators', 'Missing')).toBeUndefined()
    expect(findDeclaration(root, '@praxisjs/decorators', 'Loop')).toBeUndefined()
    expect(findDeclaration(root, '@praxisjs/decorators', 'Nothing')).toBeUndefined()
  })

  it('reads types, typings and the default entries', () => {
    const root = makeProject({
      ...pkg('a', { types: 'types.d.ts' }),
      'node_modules/a/types.d.ts': 'export declare const A: number',
      ...pkg('b', { typings: 'lib/b.d.ts' }),
      'node_modules/b/lib/b.d.ts': 'export declare const B: string;',
      ...pkg('c', { exports: './dist/index.js' }),
      'node_modules/c/dist/index.d.ts': 'export declare enum C { X }',
      ...pkg('d', { exports: { '.': { default: './d.js' } } }),
      'node_modules/d/index.d.ts': 'export declare function D(): void;',
      ...pkg('e', { exports: null }),
      ...pkg('f', { exports: { '.': { types: 1 } } }),
      'node_modules/f/dist/index.d.ts': 'export declare const F = 1;',
      'node_modules/h/package.json': '{ broken',
      'node_modules/h/index.d.ts': 'export declare const H = 1;',
    })
    expect(findDeclaration(root, 'h', 'H')).toBe('export declare const H = 1;')
    expect(findDeclaration(root, 'a', 'A')).toBe('export declare const A: number')
    expect(findDeclaration(root, 'b', 'B')).toBe('export declare const B: string;')
    expect(findDeclaration(root, 'c', 'C')).toBe('export declare enum C { X }')
    expect(findDeclaration(root, 'd', 'D')).toBe('export declare function D(): void;')
    expect(findDeclaration(root, 'e', 'E')).toBeUndefined()
    expect(findDeclaration(root, 'f', 'F')).toBe('export declare const F = 1;')
    expect(findDeclaration(root, 'missing', 'X')).toBeUndefined()
  })

  it('stops at an unbalanced declaration', () => {
    const root = makeProject({ ...pkg('g', { types: 'g.d.ts' }), 'node_modules/g/g.d.ts': 'export declare function G(a: string' })
    expect(findDeclaration(root, 'g', 'G')).toBe('export declare function G(a: string')
  })
})
