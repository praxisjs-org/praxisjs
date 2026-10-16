import { describe, expect, it } from 'vitest'

import { docBefore, outline } from '../project/outline.js'

describe('outline — imports', () => {
  it('collects value names, skipping type-only specifiers and aliases', () => {
    const o = outline(
      [
        `import Default, { a, b as c, type T, type U as V } from 'pkg'`,
        `import * as ns from "ns"`,
        `import type { Only } from './types'`,
        `import type Def from './def'`,
        `import './side-effect'`,
        `const lazy = import('./lazy')`,
        `const url = import.meta.url`,
      ].join('\n'),
    )
    expect(o.imports).toEqual([
      { source: 'pkg', names: ['Default', 'a', 'b'], typeOnly: false, line: 1 },
      { source: 'ns', names: ['ns'], typeOnly: false, line: 2 },
      { source: './types', names: ['Only'], typeOnly: true, line: 3 },
      { source: './def', names: ['Def'], typeOnly: true, line: 4 },
      { source: './side-effect', names: [], typeOnly: false, line: 5 },
    ])
  })

  it('keeps a default import named "type"', () => {
    expect(outline(`import type, { x } from 'm';`).imports[0]).toMatchObject({ names: ['type', 'x'], typeOnly: false })
  })

  it('survives an import cut off at the end of the file', () => {
    expect(outline('import { a }').imports[0]).toMatchObject({ source: '', names: ['a'] })
  })
})

describe('outline — exports', () => {
  it('collects every exported name', () => {
    const o = outline(
      [
        `export { a, b as c } from './x'`,
        `export { d };`,
        `export type { E } from './e'`,
        `export * from './all'`,
        `export * as ns from './ns';`,
        `export const { f, g: h } = obj, k = 1`,
        `export const [m] = arr;`,
        `export let n: number = 1`,
        `export interface I { a: string }`,
        `export type T = { a: string }`,
        `export enum En { A }`,
        `export declare const decl: string`,
        `export default value`,
      ].join('\n'),
    )
    expect(o.exports.sort()).toEqual(['E', 'I', 'T', 'En', 'a', 'c', 'd', 'decl', 'default', 'f', 'h', 'k', 'm', 'n'].sort())
  })

  it('records a default-exported class and function', () => {
    expect(outline('export default class {}').exports).toEqual(['default'])
    expect(outline('export default async function () {}').exports).toEqual(['default'])
    expect(outline('export default abstract class Base {}').classes[0]).toMatchObject({ name: 'Base', isDefault: true, isAbstract: true })
  })

  it('skips unexported declarations and stray tokens', () => {
    const o = outline(`interface I {}\ntype T = string\nconst x = 1;\nfoo(); [1, 2]; { block() }\nlet;\nconst = 1`)
    expect(o.exports).toEqual([])
    expect(o.functions).toEqual([])
  })
})

describe('outline — classes', () => {
  const source = `
/** A counter. */
@Component()
@ns.Deco<string>('x', { y: 1 })
@Bare
export class Counter extends StatefulComponent {
  static count = 0
  static { init() }
  @State() value = 1
  @Prop() label!: string
  @Debug() @State()
  multi = [1,
    2]
  accessor raw = 0
  private readonly ro?: string
  declare declared: number
  [key: string]: unknown
  'quoted-name' = 1
  #secret = 2
  get double(): number { return this.value * 2 }
  set double(v) { this.value = v / 2 }
  get = 1
  static async load<T>(id: T): Promise<{ id: T }> { return { id } }
  *gen() { yield 1 }
  overload(a: string): void;
  overload(a: unknown) {}
  arrow = () => {
    return 1
  }
  chained = foo
    .bar()
  semicolon = 1; next = 2
  render() {
    return <p>{() => this.value}</p>
  }
}
`

  it('reads decorators, base class and members', () => {
    const o = outline(source, { jsx: true })
    expect(o.classes).toHaveLength(1)
    const cls = o.classes[0]
    expect(cls).toMatchObject({ name: 'Counter', exported: true, isDefault: false, isAbstract: false, base: 'StatefulComponent', doc: 'A counter.' })
    expect(cls.decorators.map((d) => [d.name, d.args])).toEqual([
      ['Component', ''],
      ['ns.Deco', `'x', { y: 1 }`],
      ['Bare', undefined],
    ])
    expect(cls.members.map((m) => `${m.isStatic ? 'static ' : ''}${m.isAccessor ? 'accessor ' : ''}${m.kind} ${m.name}`)).toEqual([
      'static field count',
      'field value',
      'field label',
      'field multi',
      'accessor field raw',
      'field ro',
      'field declared',
      'field [key: string]',
      'field quoted-name',
      'field #secret',
      'getter double',
      'setter double',
      'field get',
      'static method load',
      'method gen',
      'method overload',
      'method overload',
      'field arrow',
      'field chained',
      'field semicolon',
      'field next',
      'method render',
    ])
    expect(cls.members.find((m) => m.name === 'multi')?.decorators.map((d) => d.name)).toEqual(['Debug', 'State'])
    const render = cls.members.find((m) => m.name === 'render')
    expect(render?.body).toBeDefined()
    expect(render?.line).toBe(33)
  })

  it('reads generic bases, call bases, implements and anonymous classes', () => {
    const o = outline(
      [
        'class Badge extends StatelessComponent<{ label: string }> implements X {}',
        'class Mixed extends mixin(Base) {}',
        'class Deep extends ns.Base<T> {}',
        'class Generic<T extends object> {}',
        'const Anon = class extends Base {}',
      ].join('\n'),
    )
    expect(o.classes.map((c) => [c.name, c.base, c.baseTypeArgs])).toEqual([
      ['Badge', 'StatelessComponent', '{ label: string }'],
      ['Mixed', 'mixin', undefined],
      ['Deep', 'ns.Base', 'T'],
      ['Generic', undefined, undefined],
    ])
  })

  it('records an anonymous class expression', () => {
    expect(outline('x = class {}').classes[0]).toMatchObject({ name: '', exported: false })
  })

  it('ends a field initializer at a line break only when the expression cannot continue', () => {
    const o = outline(
      [
        'class A {',
        '  a = 1 +',
        '    2',
        '  b = x',
        '    ?.y',
        '  c = (v) =>',
        '    v',
        '  d = cond',
        '  e = 1',
        '}',
      ].join('\n'),
    )
    expect(o.classes[0].members.map((m) => m.name)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('outline — functions', () => {
  it('records declarations, variables holding functions and their signatures', () => {
    const o = outline(
      [
        '/** Adds. */',
        'export function add(a: number, b = 1): number { return a + b }',
        'export async function* stream() {}',
        'function local() {}',
        'export const arrow = (x: string): string => x',
        'export const asyncArrow = async (x) => { await x }',
        'export const single = x => x',
        'export const generic = <T,>(x: T) => x',
        'export const expr = function named(a) { return a }',
        'export const typed: Fn = (a) => a, other = 2',
        'export const notFn = compute(1)',
        'export const obj = { a: 1 }',
        'export declare function declared(a: string): void;',
      ].join('\n'),
    )
    expect(o.functions.map((f) => [f.name, f.exported, f.signature])).toEqual([
      ['add', true, '(a: number, b = 1): number'],
      ['stream', true, '()'],
      ['local', false, '()'],
      ['arrow', true, '(x: string): string =>'],
      ['asyncArrow', true, 'async (x) =>'],
      ['single', true, 'x =>'],
      ['generic', true, '<T,>(x: T) =>'],
      ['expr', true, 'function named(a)'],
      ['typed', true, '(a) =>'],
      ['declared', true, '(a: string): void'],
    ])
    expect(o.functions[0].doc).toBe('Adds.')
    expect(o.functions[0].body).toBeDefined()
    expect(o.functions.at(-1)?.body).toBeUndefined()
    expect(o.exports).toContain('other')
  })

  it('handles a function cut off at the end of the file', () => {
    expect(outline('export function').functions[0]).toMatchObject({ name: '', signature: '' })
  })

  it('maps offsets to line numbers', () => {
    const o = outline('a\nb\nc')
    expect([o.lineAt(0), o.lineAt(2), o.lineAt(4)]).toEqual([1, 2, 3])
  })
})

describe('outline — malformed and edge input', () => {
  it('survives unterminated code', () => {
    for (const source of ['class A { a() {', 'class X<T', 'class A { @', 'x = "abc\ny', 'f(', '@Deco', 'export const x =']) {
      expect(() => outline(source)).not.toThrow()
    }
  })

  it('skips empty class members and reads object and generic types', () => {
    const o = outline(
      [
        'class A { a = 1;; b = 2 }',
        'export const obj: { a: number } = { a: 1 }',
        'export const list: Array<string> = []',
        'export function typed(): { a: number } { return { a: 1 } }',
        'export const g = <T>(x: T): T => x',
        'export const fn: (a: string) => void = noop',
        'class N extends B<Map<string, Array<number>>> { abstract m(): void',
        '  other = 1 }',
        'export function id<T>(x: T) { return x }',
        'const { hidden } = obj',
        'export declare const [z]: Z',
        'let later;',
        '@Dec export class D {}',
        'export @Dec class E {}',
        'abstract class F {}',
        'interface I<T> extends J<T> { a: T }',
      ].join('\n'),
    )
    expect(o.classes[0].members.map((m) => m.name)).toEqual(['a', 'b'])
    expect(o.exports).toEqual(['obj', 'list', 'typed', 'g', 'fn', 'id', 'z', 'D', 'E'])
    expect(o.functions.map((f) => f.signature)).toEqual(['(): { a: number }', '<T>(x: T): T =>', '<T>(x: T)'])
    expect(o.classes.map((c) => [c.name, c.base, c.members.map((m) => m.name).join(','), c.decorators.length, c.isAbstract])).toEqual([
      ['A', undefined, 'a,b', 0, false],
      ['N', 'B', 'm,other', 0, false],
      ['D', undefined, '', 1, false],
      ['E', undefined, '', 1, false],
      ['F', undefined, '', 0, true],
    ])
  })
})

describe('docBefore', () => {
  it('returns the JSDoc description without tags', () => {
    const text = '/**\n * First line\n * second line.\n *\n * @param a thing\n */\nfunction f() {}'
    expect(docBefore(text, text.indexOf('function'))).toBe('First line second line.')
  })

  it('returns undefined without a JSDoc block', () => {
    expect(docBefore('// line\nfunction f() {}', 8)).toBeUndefined()
    expect(docBefore('/* plain */ f', 12)).toBeUndefined()
    expect(docBefore('x */ f', 5)).toBeUndefined()
    expect(docBefore('/** @internal */ f', 17)).toBeUndefined()
  })
})
