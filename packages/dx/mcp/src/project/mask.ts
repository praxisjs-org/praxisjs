/**
 * Blanks out everything in a TypeScript/TSX source that is not code: comments, the contents of
 * string, template and regular-expression literals, and JSX text. Offsets and line breaks are kept,
 * so positions found in the masked text point at the same place in the original. This lets the
 * analyzers match structure with plain scans without being fooled by a `class` inside a string or
 * an apostrophe in JSX text.
 */

const EXPRESSION_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
])

const EXPRESSION_PUNCTUATORS = new Set('(,=:[!&|?{};+-*%<>~^'.split(''))

const IDENT_START = /[A-Za-z_$]/
const IDENT_PART = /[\w$]/

class JsxFailure extends Error {}

export function maskSource(text: string, options: { jsx?: boolean } = {}): string {
  const out = text.split('')
  const jsx = options.jsx ?? false
  let blanked: Array<[number, number]> = []
  let i = 0

  const blank = (from: number, to: number) => {
    if (to > from) blanked.push([from, to])
  }

  const isWs = (c: string | undefined) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

  const skipWs = () => {
    while (i < text.length && isWs(text[i])) i++
  }

  function lineComment() {
    const start = i
    while (i < text.length && text[i] !== '\n') i++
    blank(start, i)
  }

  function blockComment() {
    const start = i
    const end = text.indexOf('*/', i + 2)
    i = end === -1 ? text.length : end + 2
    blank(start, i)
  }

  function quoted(quote: string) {
    i++
    const start = i
    while (i < text.length && text[i] !== quote && text[i] !== '\n') {
      i += text[i] === '\\' ? 2 : 1
    }
    blank(start, Math.min(i, text.length))
    if (text[i] === quote) i++
  }

  function template() {
    i++
    let start = i
    while (i < text.length && text[i] !== '`') {
      if (text[i] === '\\') {
        i += 2
      } else if (text[i] === '$' && text[i + 1] === '{') {
        blank(start, i)
        i += 2
        code(true)
        i++
        start = i
      } else {
        i++
      }
    }
    blank(start, Math.min(i, text.length))
    i++
  }

  function regex() {
    const start = i
    i++
    let inClass = false
    while (i < text.length && text[i] !== '\n') {
      const c = text[i]
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
      i++
    }
    blank(start + 1, i)
    i++
    while (i < text.length && IDENT_PART.test(text[i])) i++
  }

  function jsxName(): string {
    const start = i
    while (i < text.length && /[\w$.:-]/.test(text[i])) i++
    return text.slice(start, i)
  }

  function jsxElement() {
    i++
    skipWs()
    if (text[i] === '>') {
      i++
      jsxChildren()
      return
    }
    if (i >= text.length || !IDENT_START.test(text[i])) throw new JsxFailure()
    jsxName()
    for (;;) {
      skipWs()
      const c = text[i]
      if (c === '/' && text[i + 1] === '>') {
        i += 2
        return
      }
      if (c === '>') {
        i++
        jsxChildren()
        return
      }
      if (c === '{') {
        i++
        code(true)
        if (text[i] !== '}') throw new JsxFailure()
        i++
        continue
      }
      if (i >= text.length || !IDENT_START.test(c)) throw new JsxFailure()
      jsxName()
      skipWs()
      if (text[i] !== '=') continue
      i++
      skipWs()
      const v = text[i]
      if (v === '"' || v === "'") {
        quoted(v)
      } else if (v === '{') {
        i++
        code(true)
        if (text[i] !== '}') throw new JsxFailure()
        i++
      } else if (v === '<') {
        jsxElement()
      } else {
        throw new JsxFailure()
      }
    }
  }

  function jsxChildren() {
    let start = i
    while (i < text.length) {
      const c = text[i]
      if (c === '<') {
        blank(start, i)
        if (text[i + 1] === '/') {
          const close = text.indexOf('>', i)
          if (close === -1) throw new JsxFailure()
          i = close + 1
          return
        }
        jsxElement()
        start = i
      } else if (c === '{') {
        blank(start, i)
        i++
        code(true)
        if (text[i] !== '}') throw new JsxFailure()
        i++
        start = i
      } else {
        i++
      }
    }
    throw new JsxFailure()
  }

  function tryJsx(): boolean {
    const savedI = i
    const savedBlanked = blanked
    blanked = [...blanked]
    try {
      jsxElement()
      return true
    } catch (error) {
      if (!(error instanceof JsxFailure)) throw error
      i = savedI
      blanked = savedBlanked
      return false
    }
  }

  /** Scans code until the end, or, when `stopAtBrace`, until the `}` closing the current expression. */
  function code(stopAtBrace: boolean) {
    let depth = 0
    let prevChar = ''
    let prevWord = ''
    const expressionAllowed = () =>
      prevChar === '' || EXPRESSION_PUNCTUATORS.has(prevChar) || EXPRESSION_KEYWORDS.has(prevWord)

    while (i < text.length) {
      const c = text[i]
      const next = text[i + 1]
      if (isWs(c)) {
        i++
        continue
      }
      if (c === '/' && next === '/') {
        lineComment()
        continue
      }
      if (c === '/' && next === '*') {
        blockComment()
        continue
      }
      if (c === '"' || c === "'") {
        quoted(c)
        prevChar = c
        prevWord = ''
        continue
      }
      if (c === '`') {
        template()
        prevChar = '`'
        prevWord = ''
        continue
      }
      if (c === '/' && expressionAllowed()) {
        regex()
        prevChar = '/'
        prevWord = ''
        continue
      }
      if (c === '<' && jsx && expressionAllowed() && tryJsx()) {
        // A JSX element is a complete operand: a `/` or `<` right after it is an operator.
        prevChar = ')'
        prevWord = ''
        continue
      }
      if (IDENT_START.test(c)) {
        const start = i
        while (i < text.length && IDENT_PART.test(text[i])) i++
        prevWord = text.slice(start, i)
        prevChar = 'a'
        continue
      }
      if (c === '{') depth++
      if (c === '}') {
        if (depth === 0 && stopAtBrace) return
        depth--
      }
      prevChar = c
      prevWord = ''
      i++
    }
  }

  code(false)

  for (const [from, to] of blanked) {
    for (let k = from; k < to && k < out.length; k++) {
      if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '
    }
  }
  return out.join('')
}

/** 1-based line number of an offset. */
export function lineAt(text: string, offset: number): number {
  let line = 1
  for (let k = 0; k < offset && k < text.length; k++) {
    if (text[k] === '\n') line++
  }
  return line
}

/** Index of the bracket that closes the one at `open`, in masked text; -1 when unbalanced. */
export function matchBracket(masked: string, open: number): number {
  const pairs = new Map([
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ])
  const stack: string[] = []
  for (let k = open; k < masked.length; k++) {
    const c = masked[k]
    const closer = pairs.get(c)
    if (closer) {
      stack.push(closer)
    } else if (c === ')' || c === ']' || c === '}') {
      if (stack.pop() !== c) return -1
      if (stack.length === 0) return k
    }
  }
  return -1
}
