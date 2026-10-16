import { maskSource } from './mask.js'

/**
 * A structural outline of one TypeScript/TSX module: its imports, exports, classes (with their
 * decorators and members) and top-level functions. Built from a token scan of the masked source,
 * not a full parser: enough to recognize PraxisJS components, stores, composables and decorators.
 */

export interface Decorator {
  name: string
  /** Original text between the call parentheses, or `undefined` when the decorator is not called. */
  args?: string
  start: number
  line: number
}

export type MemberKind = 'field' | 'method' | 'getter' | 'setter'

export interface Member {
  name: string
  kind: MemberKind
  isStatic: boolean
  isAccessor: boolean
  decorators: Decorator[]
  start: number
  line: number
  /** Offsets of a method/getter/setter body, braces included. */
  body?: [number, number]
}

export interface ClassInfo {
  name: string
  exported: boolean
  isDefault: boolean
  isAbstract: boolean
  base?: string
  /** Original text of the base class type arguments, e.g. `BadgeProps` in `StatelessComponent<BadgeProps>`. */
  baseTypeArgs?: string
  decorators: Decorator[]
  members: Member[]
  start: number
  line: number
  body: [number, number]
  doc?: string
}

export interface FunctionInfo {
  name: string
  exported: boolean
  isDefault: boolean
  signature: string
  start: number
  line: number
  /** Offsets of the function body; for a function stored in a variable, everything after the signature. */
  body?: [number, number]
  doc?: string
}

export interface ImportInfo {
  source: string
  /** Imported names (`a` for `a as b`; the local name for default and namespace imports); inline `type` specifiers are left out. */
  names: string[]
  typeOnly: boolean
  line: number
}

export interface Outline {
  text: string
  masked: string
  imports: ImportInfo[]
  classes: ClassInfo[]
  functions: FunctionInfo[]
  /** Names this module exports, `default` included when it has a default export. */
  exports: string[]
  lineAt(offset: number): number
}

interface Token {
  value: string
  start: number
  end: number
  /** A line break separates this token from the previous one. */
  newline: boolean
  kind: 'id' | 'str' | 'punct'
}

const IDENT_START = /[A-Za-z_$#]/
const IDENT_PART = /[\w$]/

function tokenize(masked: string): Token[] {
  const tokens: Token[] = []
  let newline = false
  let k = 0
  while (k < masked.length) {
    const c = masked[k]
    if (c === '\n') {
      newline = true
      k++
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      k++
      continue
    }
    const start = k
    let kind: Token['kind'] = 'punct'
    if (IDENT_START.test(c)) {
      k++
      while (k < masked.length && IDENT_PART.test(masked[k])) k++
      kind = 'id'
    } else if (c === '"' || c === "'") {
      k++
      while (k < masked.length && masked[k] !== c && masked[k] !== '\n') k++
      if (masked[k] === c) k++
      kind = 'str'
    } else {
      k++
    }
    tokens.push({ value: masked.slice(start, k), start, end: k, newline, kind })
    newline = false
  }
  return tokens
}

function lineIndex(text: string): (offset: number) => number {
  const starts = [0]
  for (let k = 0; k < text.length; k++) if (text[k] === '\n') starts.push(k + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

/** The JSDoc block right before `offset`, reduced to its description (tags dropped). */
export function docBefore(text: string, offset: number): string | undefined {
  let k = offset - 1
  while (k >= 0 && /\s/.test(text[k])) k--
  if (text[k] !== '/' || text[k - 1] !== '*') return undefined
  const open = text.lastIndexOf('/**', k - 1)
  if (open === -1) return undefined
  const lines = text
    .slice(open + 3, k - 1)
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trimEnd())
  const tag = lines.findIndex((line) => line.startsWith('@'))
  const description = (tag === -1 ? lines : lines.slice(0, tag)).join('\n').trim()
  return description === '' ? undefined : description.replace(/\s*\n\s*/g, ' ')
}

const CLOSERS = new Map([
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
])
const MODIFIERS = new Set([
  'static',
  'public',
  'private',
  'protected',
  'readonly',
  'declare',
  'override',
  'abstract',
  'async',
  'accessor',
  'get',
  'set',
])
const NAME_FOLLOWERS = new Set(['(', '=', ';', ':', '?', '!', '<', '}'])
const CONTINUES_AFTER = new Set(['=', '+', '-', '*', '/', '%', ',', '(', '[', '{', '.', '?', ':', '&', '|', '!', '<', '^', '~'])
const CONTINUES_BEFORE = new Set(['.', '?', ':', '=', '+', '*', '/', '%', '&', '|', ',', ')', ']', '>', '^'])

export function outline(text: string, options: { jsx?: boolean } = {}): Outline {
  const masked = maskSource(text, options)
  const tokens = tokenize(masked)
  const lineAt = lineIndex(text)
  const imports: ImportInfo[] = []
  const classes: ClassInfo[] = []
  const functions: FunctionInfo[] = []
  const exports = new Set<string>()
  let t = 0

  const tok = (k = t): Token | undefined => tokens[k]
  const is = (value: string, k = t) => tokens[k]?.value === value
  const original = (token: Token) => text.slice(token.start, token.end)
  const unquote = (token: Token) => original(token).slice(1, -1)

  /** Index of the token closing the bracket at `k`, or the last token when unbalanced. */
  function skipBalanced(k: number): number {
    const stack: string[] = []
    for (let j = k; j < tokens.length; j++) {
      const v = tokens[j].value
      const closer = CLOSERS.get(v)
      if (closer) stack.push(closer)
      else if (v === ')' || v === ']' || v === '}') {
        stack.pop()
        if (stack.length === 0) return j
      }
    }
    return tokens.length - 1
  }

  /** Index of the token after a `<…>` type parameter/argument list starting at `k`. */
  function skipAngles(k: number): number {
    let depth = 0
    for (let j = k; j < tokens.length; j++) {
      const v = tokens[j].value
      if (CLOSERS.has(v)) {
        j = skipBalanced(j)
        continue
      }
      if (v === '<') depth++
      else if (v === '>' && !is('=', j - 1)) {
        depth--
        if (depth === 0) return j + 1
      }
    }
    return tokens.length
  }

  function decorator(): Decorator {
    const at = tokens[t]
    t++
    let name = tokens[t].value
    t++
    while (is('.') && tok(t + 1)?.kind === 'id') {
      name += `.${tokens[t + 1].value}`
      t += 2
    }
    if (is('<')) t = skipAngles(t)
    let args: string | undefined
    if (is('(')) {
      const close = skipBalanced(t)
      args = text.slice(tokens[t].end, tokens[close].start).trim()
      t = close + 1
    }
    return { name, args, start: at.start, line: lineAt(at.start) }
  }

  /** Skips a type annotation until one of `stops` at depth 0. */
  /** Whether automatic semicolon insertion ends the statement before token `k`. */
  function endsByLineBreak(k: number): boolean {
    if (!tokens[k].newline || k === 0) return false
    const prev = tokens[k - 1].value
    const arrow = prev === '>' && is('=', k - 2)
    return !CONTINUES_AFTER.has(prev) && !arrow && !CONTINUES_BEFORE.has(tokens[k].value)
  }

  function skipType(stops: Set<string>) {
    if (is('{')) t = skipBalanced(t) + 1
    while (t < tokens.length && !stops.has(tokens[t].value) && !endsByLineBreak(t)) {
      const v = tokens[t].value
      if (CLOSERS.has(v)) t = skipBalanced(t) + 1
      else if (v === '<') t = skipAngles(t)
      else t++
    }
  }

  /**
   * Skips a field initializer or type up to the end of the member, honoring ASI. With `atComma`, a
   * `,` also ends it (the next declarator of a `const a = 1, b = 2`).
   */
  function skipToMemberEnd(bodyEnd: number, atComma = false) {
    while (t < bodyEnd) {
      const v = tokens[t].value
      if (v === ';') {
        t++
        return
      }
      if ((atComma && v === ',') || endsByLineBreak(t)) return
      if (CLOSERS.has(v)) t = skipBalanced(t) + 1
      else t++
    }
  }

  function classMembers(bodyStart: number, bodyEnd: number): Member[] {
    const members: Member[] = []
    t = bodyStart + 1
    while (t < bodyEnd) {
      if (is(';')) {
        t++
        continue
      }
      const decorators: Decorator[] = []
      while (is('@') && t < bodyEnd) decorators.push(decorator())
      const start = tokens[t].start
      let isStatic = false
      let isAccessor = false
      let kind: MemberKind = 'field'
      while (MODIFIERS.has(tokens[t].value) && !NAME_FOLLOWERS.has(tokens[t + 1].value)) {
        const v = tokens[t].value
        if (v === 'static' && is('{', t + 1)) break
        if (v === 'static') isStatic = true
        if (v === 'accessor') isAccessor = true
        if (v === 'get') kind = 'getter'
        if (v === 'set') kind = 'setter'
        t++
      }
      if (is('static') && is('{', t + 1)) {
        t = skipBalanced(t + 1) + 1
        continue
      }
      if (is('*')) t++
      let name: string
      if (is('[')) {
        const close = skipBalanced(t)
        name = text.slice(tokens[t].start, tokens[close].end)
        t = close + 1
      } else {
        name = tokens[t].kind === 'str' ? unquote(tokens[t]) : tokens[t].value
        t++
      }
      if (is('?') || is('!')) t++
      if (is('<')) t = skipAngles(t)
      const member: Member = { name, kind, isStatic, isAccessor, decorators, start, line: lineAt(start) }
      if (is('(')) {
        if (kind === 'field') member.kind = 'method'
        t = skipBalanced(t) + 1
        if (is(':')) {
          t++
          skipType(new Set(['{', ';', '}']))
        }
        if (is('{')) {
          const close = skipBalanced(t)
          member.body = [tokens[t].start, tokens[close].end]
          t = close + 1
        } else if (is(';')) {
          t++
        }
      } else {
        skipToMemberEnd(bodyEnd)
      }
      members.push(member)
    }
    return members
  }

  function classDeclaration(start: number, exported: boolean, isDefault: boolean, decorators: Decorator[]) {
    const isAbstract = /\babstract\b/.test(masked.slice(start, tokens[t].start))
    t++
    let name = isDefault ? 'default' : ''
    if (tok()?.kind === 'id' && !is('extends') && !is('implements')) {
      name = tokens[t].value
      t++
    }
    if (is('<')) t = skipAngles(t)
    let base: string | undefined
    let baseTypeArgs: string | undefined
    if (is('extends')) {
      t++
      base = tokens[t].value
      t++
      while (is('.') && tok(t + 1)?.kind === 'id') {
        base += `.${tokens[t + 1].value}`
        t += 2
      }
      if (is('<')) {
        const after = skipAngles(t)
        baseTypeArgs = text.slice(tokens[t].end, tokens[after - 1].start).trim()
        t = after
      }
      if (is('(')) t = skipBalanced(t) + 1
    }
    while (t < tokens.length && !is('{')) t++
    const bodyStart = t
    const bodyEnd = skipBalanced(t)
    const members = classMembers(bodyStart, bodyEnd)
    t = bodyEnd + 1
    if (exported && name) exports.add(isDefault ? 'default' : name)
    classes.push({
      name,
      exported,
      isDefault,
      isAbstract,
      base,
      baseTypeArgs,
      decorators,
      members,
      start,
      line: lineAt(start),
      body: [tokens[bodyStart].start, tokens[bodyEnd].end],
      doc: docBefore(text, start),
    })
  }

  function functionDeclaration(start: number, exported: boolean, isDefault: boolean) {
    if (is('async')) t++
    t++
    if (is('*')) t++
    let name = isDefault ? 'default' : ''
    if (tok()?.kind === 'id') {
      name = tokens[t].value
      t++
    }
    const signatureStart = tokens[t]?.start ?? text.length
    if (is('<')) t = skipAngles(t)
    if (is('(')) t = skipBalanced(t) + 1
    if (is(':')) {
      t++
      skipType(new Set(['{', ';']))
    }
    const signatureEnd = tokens[t]?.start ?? text.length
    let body: [number, number] | undefined
    if (is('{')) {
      const close = skipBalanced(t)
      body = [tokens[t].start, tokens[close].end]
      t = close + 1
    }
    if (exported && name) exports.add(isDefault ? 'default' : name)
    functions.push({
      name,
      exported,
      isDefault,
      signature: collapse(text.slice(signatureStart, signatureEnd)),
      start,
      line: lineAt(start),
      body,
      doc: docBefore(text, start),
    })
  }

  /** One `name: Type = value` declarator; a value that is a function is recorded as one. */
  function declarator(start: number, exported: boolean) {
    const name = tokens[t].value
    t++
    if (is(':')) {
      t++
      skipType(new Set(['=', ';', ',']))
    }
    if (exported) exports.add(name)
    if (is('=') && t + 1 < tokens.length) {
      t++
      const valueStart = t
      if (is('async')) t++
      const isFunction =
        is('function') ||
        (is('(') && is('=', skipBalanced(t) + 1)) ||
        (is('(') && is(':', skipBalanced(t) + 1)) ||
        (tok()?.kind === 'id' && is('=', t + 1) && is('>', t + 2)) ||
        (is('<') && is('(', skipAngles(t)))
      t = valueStart
      let signatureEnd = tokens[t].start
      if (isFunction) {
        for (let j = t; j < tokens.length; j++) {
          if (is('=', j) && is('>', j + 1)) {
            signatureEnd = tokens[j + 1].end
            break
          }
          if (is('{', j) && is(')', j - 1)) {
            signatureEnd = tokens[j].start
            break
          }
          if (CLOSERS.has(tokens[j].value)) j = skipBalanced(j)
        }
      }
      const signatureStart = tokens[t].start
      skipToMemberEnd(tokens.length, true)
      if (isFunction) {
        functions.push({
          name,
          exported,
          isDefault: false,
          signature: collapse(text.slice(signatureStart, signatureEnd)),
          start,
          line: lineAt(start),
          body: [signatureEnd, tokens[t - 1].end],
          doc: docBefore(text, start),
        })
      }
    }
  }

  /** `const name = (…) => …` and `const name = function …`, recorded as functions. */
  function variableDeclaration(start: number, exported: boolean) {
    t++
    while (t < tokens.length) {
      if (is('{') || is('[')) {
        const close = skipBalanced(t)
        if (exported) {
          for (let j = t + 1; j < close; j++) {
            if (tokens[j].kind === 'id' && !is(':', j + 1)) exports.add(tokens[j].value)
          }
        }
        t = close + 1
        if (is('=')) {
          t++
          skipToMemberEnd(tokens.length, true)
        }
      } else if (tok()?.kind === 'id') {
        declarator(start, exported)
      } else {
        return
      }
      if (tokens[t - 1].value === ';') return
      if (!is(',')) {
        if (is(';')) t++
        return
      }
      t++
    }
  }

  function importDeclaration() {
    const start = tokens[t].start
    t++
    let typeOnly = false
    if (is('type') && !is('from', t + 1) && !is(',', t + 1)) {
      typeOnly = true
      t++
    }
    const names: string[] = []
    while (t < tokens.length && tokens[t].kind !== 'str') {
      if (is('{')) {
        const close = skipBalanced(t)
        for (let j = t + 1; j < close; j++) {
          if (tokens[j].kind !== 'id') continue
          if (tokens[j].value === 'type' && tokens[j + 1].kind === 'id') {
            j = is('as', j + 2) ? j + 3 : j + 1
            continue
          }
          names.push(tokens[j].value)
          if (is('as', j + 1)) j += 2
        }
        t = close + 1
        continue
      }
      if (tok()?.kind === 'id' && !is('from') && !is('as')) names.push(tokens[t].value)
      t++
    }
    const source = tokens[t] ? unquote(tokens[t]) : ''
    t++
    if (is(';')) t++
    imports.push({ source, names, typeOnly, line: lineAt(start) })
  }

  function exportList() {
    const close = skipBalanced(t)
    for (let j = t + 1; j < close; j++) {
      if (tokens[j].kind !== 'id' || tokens[j].value === 'type') continue
      if (is('as', j + 1)) {
        j++
        continue
      }
      exports.add(tokens[j].value)
    }
    t = close + 1
    if (is('from')) t += 2
    if (is(';')) t++
  }

  let pending: Decorator[] = []
  let declStart = -1
  let exported = false
  let isDefault = false
  const reset = () => {
    pending = []
    declStart = -1
    exported = false
    isDefault = false
  }

  // A file being edited is often cut off mid-declaration: keep what was read up to that point.
  try {
    while (t < tokens.length) {
      const token = tokens[t]
      const v = token.value
      if (v === '@' && tok(t + 1)?.kind === 'id') {
        if (declStart === -1) declStart = token.start
        pending.push(decorator())
        continue
      }
      if (v === 'import' && token.kind === 'id' && !is('(', t + 1) && !is('.', t + 1)) {
        importDeclaration()
        reset()
        continue
      }
      if (v === 'export' && token.kind === 'id') {
        if (declStart === -1) declStart = token.start
        exported = true
        t++
        if (is('{')) {
          exportList()
          reset()
        } else if (is('*')) {
          while (t < tokens.length && tokens[t].kind !== 'str') t++
          t++
          reset()
        } else if (is('type') && is('{', t + 1)) {
          t++
          exportList()
          reset()
        }
        continue
      }
      if (v === 'default' && exported) {
        isDefault = true
        t++
        if (tok()?.kind === 'id' && !['class', 'function', 'async', 'abstract'].includes(tokens[t].value)) {
          exports.add('default')
          reset()
        }
        continue
      }
      if ((v === 'abstract' || v === 'declare') && token.kind === 'id') {
        if (declStart === -1) declStart = token.start
        t++
        continue
      }
      if (v === 'class') {
        classDeclaration(declStart === -1 ? token.start : declStart, exported, isDefault, pending)
        reset()
        continue
      }
      if (v === 'function' || (v === 'async' && is('function', t + 1))) {
        functionDeclaration(declStart === -1 ? token.start : declStart, exported, isDefault)
        reset()
        continue
      }
      if ((v === 'const' || v === 'let' || v === 'var') && token.kind === 'id') {
        variableDeclaration(declStart === -1 ? token.start : declStart, exported)
        reset()
        continue
      }
      if ((v === 'interface' || v === 'type' || v === 'enum') && tok(t + 1)?.kind === 'id') {
        if (exported) exports.add(tokens[t + 1].value)
        t += 2
        if (v === 'type') {
          skipToMemberEnd(tokens.length)
        } else {
          while (t < tokens.length && !is('{')) t++
          t = skipBalanced(t) + 1
        }
        reset()
        continue
      }
      t = CLOSERS.has(v) ? skipBalanced(t) + 1 : t + 1
      reset()
    }
  } catch {
    // Partial outline: everything declared before the cut is kept.
  }

  return { text, masked, imports, classes, functions, exports: [...exports], lineAt }
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
