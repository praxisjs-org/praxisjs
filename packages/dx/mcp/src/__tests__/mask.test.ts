import { describe, expect, it } from 'vitest'

import { lineAt, maskSource, matchBracket } from '../project/mask.js'

const keepsLength = (source: string, jsx = false) => {
  const masked = maskSource(source, { jsx })
  expect(masked).toHaveLength(source.length)
  return masked
}

describe('maskSource', () => {
  it('blanks comments and keeps line breaks', () => {
    const masked = keepsLength('a // class X\n/* class\nY */ b')
    expect(masked).not.toContain('class')
    expect(masked.split('\n')).toHaveLength(3)
    expect(masked.trimEnd().endsWith('b')).toBe(true)
  })

  it('blanks string contents and keeps the quotes', () => {
    expect(keepsLength(`f("class A", 'x\\'y')`)).toBe(`f("       ", '    ')`)
  })

  it('stops an unterminated string at the end of the line', () => {
    expect(keepsLength('"abc\nclass')).toBe('"   \nclass')
  })

  it('blanks template text but keeps ${} expressions', () => {
    expect(keepsLength('`a ${b + `c`} \\` d`')).toBe('`  ${b + ` `}     `')
  })

  it('blanks regular expression bodies where an expression may start', () => {
    expect(keepsLength('x = /a[/]b\\//g; y = a / b / c')).toBe('x = /       /g; y = a / b / c')
  })

  it('stops a regular expression at the end of the line', () => {
    expect(keepsLength('return /abc\nx')).toBe('return /   \nx')
  })

  it('treats `/` after a keyword that starts an expression as a regex', () => {
    expect(keepsLength('typeof /x/')).toBe('typeof / /')
  })

  it('tracks nested braces inside template expressions', () => {
    expect(keepsLength('`${(() => { return "a" })()}`')).toBe('`${(() => { return " " })()}`')
  })

  it('blanks an unterminated block comment to the end', () => {
    expect(keepsLength('a /* b')).toBe('a     ')
  })

  it('blanks JSX text, including apostrophes, and keeps tags and expressions', () => {
    const source = `const a = <p class="x" {...rest} data-v={1}>Don't {count} <b>it's</b></p>`
    const masked = keepsLength(source, true)
    expect(masked).toBe(`const a = <p class=" " {...rest} data-v={1}>      {count} <b>    </b></p>`)
  })

  it('parses fragments, self-closing tags, attribute elements and nested expressions', () => {
    const source = `x = <><A b=<C /> c='q' /><D>{() => <E>t</E>}</D>{/* c */}</>`
    const masked = keepsLength(source, true)
    expect(masked).toBe(`x = <><A b=<C /> c=' ' /><D>{() => <E> </E>}</D>{       }</>`)
  })

  it('keeps a boolean attribute and continues after it', () => {
    expect(keepsLength('x = <input disabled value="v" />', true)).toBe('x = <input disabled value=" " />')
  })

  it('treats `<` after an operand as a comparison', () => {
    expect(keepsLength('a < b && c > "d"', true)).toBe('a < b && c > " "')
  })

  it('treats `/` and `<` right after a JSX element as operators', () => {
    expect(keepsLength('x = <a/> / 2', true)).toBe('x = <a/> / 2')
  })

  it('falls back to an operator when the JSX parse fails', () => {
    const cases = [
      'f = <T,>(v: T) => "v"',
      'x = < 1',
      'x = <a b=c>',
      'x = <a {b>',
      'x = <a b={c>',
      'x = <a>{b</a>',
      'x = <a>text',
      'x = <a></a',
      'x = <a b=',
    ]
    for (const source of cases) keepsLength(source, true)
    expect(keepsLength('f = <T,>(v: T) => "v"', true)).toBe('f = <T,>(v: T) => " "')
  })

  it('does not parse JSX unless asked to', () => {
    expect(keepsLength(`x = <p>'</p>`)).toBe(`x = <p>'    `)
    expect(maskSource(`x = <p>'</p>`)).toBe(`x = <p>'    `)
  })

  it('rethrows errors that are not parse failures', () => {
    const spy = { calls: 0 }
    const source = new Proxy(new String('x = <a>b</a>'), {
      get(target, prop, receiver) {
        if (prop === 'indexOf' && spy.calls++ === 0) {
          return () => {
            throw new RangeError('boom')
          }
        }
        const value: unknown = Reflect.get(target, prop, receiver)
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value
      },
    }) as unknown as string
    expect(() => maskSource(source, { jsx: true })).toThrow(RangeError)
  })
})

describe('lineAt', () => {
  it('returns 1-based line numbers', () => {
    expect(lineAt('a\nb\nc', 0)).toBe(1)
    expect(lineAt('a\nb\nc', 2)).toBe(2)
    expect(lineAt('a\nb\nc', 4)).toBe(3)
  })
})

describe('matchBracket', () => {
  it('finds the closing bracket', () => {
    expect(matchBracket('f(a, [b], {c})', 1)).toBe(13)
  })

  it('returns -1 for mismatched or unclosed brackets', () => {
    expect(matchBracket('(]', 0)).toBe(-1)
    expect(matchBracket('(a', 0)).toBe(-1)
  })
})
