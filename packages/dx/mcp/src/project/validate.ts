import path from 'node:path'

import { outline, type ClassInfo, type Member, type Outline } from './outline.js'
import { apiNames } from '../knowledge/api-catalog.js'


export type Severity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  rule: string
  severity: Severity
  line: number
  message: string
  /** Docs slug that explains the rule. */
  docs: string
}

const COMPONENT_BASES = new Set(['StatefulComponent', 'StatelessComponent'])
/** Bases whose members are all declared in the class itself, so member-name checks are safe. */
const FRAMEWORK_BASES = new Set(['StatefulComponent', 'StatelessComponent', 'ReactiveStore', 'Composable'])
const OWNING_DECORATORS = new Set(['State', 'Prop', 'FunctionProp', 'DeepState'])
const SHALLOW_STATE_DECORATORS = new Set(['State', 'Persisted', 'Synced', 'History'])
const MUTATING_METHODS = 'push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin'
const PROP_DECORATORS = new Set(['Prop', 'FunctionProp'])
/** Decorators whose string arguments name another member of the same class. */
const MEMBER_REFERENCES: Record<string, 'all' | 'first'> = {
  Watch: 'all',
  When: 'first',
  Until: 'first',
  Selector: 'first',
  History: 'first',
  Task: 'first',
  Queue: 'first',
  Pool: 'first',
}
const EXTENSION_BUILDERS = /^(?:create\w*Decorator|addClaimableInitializer)$/
const NON_REACTIVE_ATTRIBUTES = /^(?:on[A-Z]\w*|ref|key|slot)$/
const CORE_EXPORTS = apiNames((entry) => entry.package === '@praxisjs/core')

/** Validates one component/store/composable module against the PraxisJS rules agents most often break. */
export function validateSource(text: string, filename: string): Diagnostic[] {
  const o = outline(text, { jsx: filename.endsWith("x") })
  const diagnostics: Diagnostic[] = []
  const report = (rule: string, severity: Severity, line: number, message: string, docs: string) => {
    diagnostics.push({ rule, severity, line, message, docs })
  }

  // Composables and custom decorators are built on the internal reactive primitives, as the docs show.
  const extendsFramework =
    o.classes.some((c) => c.base === 'Composable' || c.base === 'ClassBehavior') ||
    o.imports.some((i) => i.source === '@praxisjs/decorators' && i.names.some((n) => EXTENSION_BUILDERS.test(n)))

  for (const imp of o.imports) {
    if (/^@praxisjs\/[\w-]+\/internal$/.test(imp.source) && !extendsFramework) {
      report(
        'internal-import',
        'warning',
        imp.line,
        `"${imp.source}" is framework-internal. Application code uses the decorators (@State, @Computed, @Resource, @Selector, @Watch) instead; only custom decorators and composables may need it.`,
        'essentials/reactivity',
      )
    }
    if (imp.source === '@praxisjs/runtime') {
      for (const name of imp.names.filter((n) => n.startsWith('_$'))) {
        report('compiler-helper-import', 'error', imp.line, `${name} is emitted by the Vite plugin's compiled templates; never call it by hand.`, 'tooling/vite-plugin')
      }
    }
    if (imp.source === '@praxisjs/core' && !imp.typeOnly) {
      for (const name of imp.names.filter((n) => !CORE_EXPORTS.has(n))) {
        report(
          'core-export',
          'error',
          imp.line,
          `@praxisjs/core does not export ${name}. Its public API is StatefulComponent, StatelessComponent, Composable, peek and untrack; use the matching decorator instead of signal primitives.`,
          'essentials/reactivity',
        )
      }
    }
  }

  checkSliceBoundaries(o, filename, report)
  for (const cls of o.classes) checkClass(o, cls, report)
  return diagnostics.sort((a, b) => a.line - b.line)
}

const SLICE_FILE = /^src\/(?:features\/([^/]+)|shared)\//
const FEATURE_TARGET = /^src\/features\/([^/]+)(\/.*)?$/

/**
 * Feature-slice rules, for files under `src/features/` or `src/shared/`: another feature is imported
 * only through its `index.ts`, and shared code never imports from features.
 */
function checkSliceBoundaries(o: Outline, filename: string, report: Report) {
  const file = filename.replace(/\\/g, '/')
  const slice = SLICE_FILE.exec(file)
  if (!slice) return
  // Group 1 only matches under src/features/; it is undefined for src/shared/.
  const owner = slice[1] as string | undefined
  for (const imp of o.imports) {
    const target = imp.source.startsWith('@/')
      ? `src/${imp.source.slice(2)}`
      : imp.source.startsWith('.')
        ? path.posix.normalize(path.posix.join(path.posix.dirname(file), imp.source))
        : undefined
    const match = target === undefined ? null : FEATURE_TARGET.exec(target)
    if (!match) continue
    const [, feature, rest = ''] = match
    if (owner === undefined) {
      report('shared-imports-feature', 'warning', imp.line, `src/shared/ must not import from features (${imp.source}); move what both need into src/shared/.`, 'guide/ai-skills')
    } else if (feature !== owner && !/^(?:\/index(?:\.[jt]sx?)?)?$/.test(rest)) {
      report(
        'feature-deep-import',
        'warning',
        imp.line,
        `Import ${feature} through its public API (src/features/${feature}/index.ts), not ${imp.source}; export what you need from that index.`,
        'guide/ai-skills',
      )
    }
  }
}

type Report = (rule: string, severity: Severity, line: number, message: string, docs: string) => void

function checkClass(o: Outline, cls: ClassInfo, report: Report) {
  const reactiveDecorators = apiNames((entry) => entry.reactive === true)
  const statefulOnly = apiNames((entry) => entry.statefulOnly === true)
  const classDecorators = cls.decorators.map((d) => d.name)
  const hasComponent = classDecorators.includes('Component')
  const isComponentClass = COMPONENT_BASES.has(cls.base ?? '')
  const label = cls.name || 'anonymous class'

  if (isComponentClass && !hasComponent && !cls.isAbstract) {
    report('missing-component', 'error', cls.line, `${label} extends ${String(cls.base)} but has no @Component() decorator.`, 'essentials/components')
  }
  if (hasComponent && classDecorators.at(-1) !== 'Component') {
    report(
      'component-order',
      'error',
      cls.line,
      `@Component() must be the innermost class decorator (the one right above the class); class decorators apply bottom-up.`,
      'essentials/components',
    )
  }
  if (isComponentClass && !cls.isAbstract && !cls.members.some((m) => m.name === 'render' && m.kind === 'method')) {
    report('missing-render', 'error', cls.line, `${label} has no render() method.`, 'essentials/components')
  }

  for (const member of cls.members) {
    const names = member.decorators.map((d) => d.name)
    if (member.isAccessor) {
      report(
        'accessor-keyword',
        names.length > 0 ? 'error' : 'warning',
        member.line,
        names.length > 0
          ? `Remove the \`accessor\` keyword from ${member.name}: PraxisJS decorators work on plain fields and field decorators throw a TypeError on accessors.`
          : `Do not use the \`accessor\` keyword (${member.name}); declare a plain field, with @State() if it must be reactive.`,
        'advanced/custom-decorators',
      )
    }
    if (cls.base === 'StatelessComponent') {
      for (const name of names.filter((n) => statefulOnly.has(n))) {
        report(
          'stateless-decorator',
          'error',
          member.line,
          `@${name} only works on StatefulComponent. Promote ${label} to StatefulComponent, or read the value from this.props.`,
          'essentials/components',
        )
      }
    }
    const owning = names.findIndex((n) => OWNING_DECORATORS.has(n))
    if (owning !== -1 && owning !== names.length - 1) {
      report(
        'decorator-order',
        'warning',
        member.line,
        `Put @${names[owning]}() closest to ${member.name}: field decorators run inner-first, so decorators that observe the field (such as @${names[names.length - 1]}) must sit above it.`,
        'decorators/state',
      )
    }
    for (const decorator of member.decorators) {
      checkMemberReferences(cls, member, decorator.name, decorator.args, report)
    }
  }

  const [bodyStart, bodyEnd] = cls.body
  const body = o.masked.slice(bodyStart, bodyEnd)
  if (cls.base === 'StatefulComponent') {
    for (const match of body.matchAll(/\bthis\.props\b/g)) {
      report(
        'stateful-props',
        'error',
        o.lineAt(bodyStart + match.index),
        `StatefulComponent has no public this.props; declare each prop as a @Prop() field and read it as this.<name>.`,
        'decorators/state',
      )
    }
  }

  const shallow = new Set(
    cls.members.filter((m) => m.decorators.some((d) => SHALLOW_STATE_DECORATORS.has(d.name))).map((m) => m.name),
  )
  const mutation = new RegExp(
    String.raw`\bthis\.([\w$]+)(?:\.(?:${MUTATING_METHODS})\s*\(|(?:\.[\w$]+|\[[^\]\n]*\])+\s*(?:[-+*/%&|^]|\*\*|<<|>>>?|\?\?|&&|\|\|)?=(?!=))`,
    'g',
  )
  for (const match of body.matchAll(mutation)) {
    if (!shallow.has(match[1])) continue
    report(
      'in-place-mutation',
      'warning',
      o.lineAt(bodyStart + match.index),
      `this.${match[1]} is mutated in place, which does not notify subscribers (signals track references). Assign a new value (this.${match[1]} = [...this.${match[1]}, item]) or use @DeepState().`,
      'essentials/reactivity',
    )
  }

  // Props read once are a common, deliberate choice (ids, names, children), so they are only hinted.
  const reactive = new Map<string, Severity>()
  for (const m of cls.members) {
    if (m.name === 'children' || !m.decorators.some((d) => reactiveDecorators.has(d.name))) continue
    reactive.set(m.name, m.decorators.some((d) => PROP_DECORATORS.has(d.name)) ? 'info' : 'warning')
  }
  const render = cls.members.find((m) => m.name === 'render' && m.body)
  if (render?.body) checkRender(o, render.body, reactive, report)
}

function checkMemberReferences(cls: ClassInfo, member: Member, decorator: string, args: string | undefined, report: Report) {
  const mode = MEMBER_REFERENCES[decorator] as 'all' | 'first' | undefined
  if (!mode || args === undefined || !FRAMEWORK_BASES.has(cls.base ?? '')) return
  const literals = [...args.matchAll(/^\s*(['"`])([\w$]+)\1|,\s*(['"`])([\w$]+)\3/g)].map((m) => m[2] || m[4])
  const referenced = mode === 'all' ? literals : literals.slice(0, /^\s*['"`]/.test(args) ? 1 : 0)
  const known = new Set(cls.members.map((m) => m.name))
  for (const name of referenced) {
    if (known.has(name)) continue
    report(
      'unknown-member',
      'warning',
      member.line,
      `@${decorator}('${name}') on ${member.name} names a member ${cls.name} does not declare.`,
      'decorators',
    )
  }
}

/**
 * Flags `{this.field}` in render() where `field` is reactive and the read is not inside an arrow
 * function: render() runs once, so such a read is a snapshot that never updates.
 */
function checkRender(o: Outline, [start, end]: [number, number], reactive: Map<string, Severity>, report: Report) {
  const masked = o.masked
  const frames: Array<{ inherited: boolean; arrow: boolean }> = [{ inherited: false, arrow: false }]
  const inArrow = () => {
    const top = frames[frames.length - 1]
    return top.inherited || top.arrow
  }
  for (let k = start + 1; k < end - 1; k++) {
    const c = masked[k]
    if (c === '=' && masked[k + 1] === '>') {
      frames[frames.length - 1].arrow = true
      k++
      continue
    }
    if (c === ',' || c === ';') {
      frames[frames.length - 1].arrow = false
      continue
    }
    if (c === '(' || c === '[' || c === '{') {
      if (c === '{' && !inArrow()) checkExpression(o, k, reactive, report)
      frames.push({ inherited: inArrow(), arrow: false })
      continue
    }
    // The body comes from a balanced bracket scan, so every closer here has its opener.
    if (c === ')' || c === ']' || c === '}') frames.pop()
  }
}

function checkExpression(o: Outline, open: number, reactive: Map<string, Severity>, report: Report) {
  const masked = o.masked
  let p = open - 1
  while (p >= 0 && /\s/.test(masked[p])) p--
  const before = masked[p]
  if (before !== '>' && before !== '}' && before !== '=') return
  if (before === '=') {
    if (masked[p - 1] === '=' || masked[p - 1] === '!') return
    const attribute = /([\w$-]+)\s*$/.exec(masked.slice(Math.max(0, p - 40), p))?.[1] ?? ''
    if (!attribute || NON_REACTIVE_ATTRIBUTES.test(attribute)) return
  }
  const read = /^\s*this\.([\w$]+)/.exec(masked.slice(open + 1, open + 200))
  const severity = read ? reactive.get(read[1]) : undefined
  if (!read || !severity) return
  let depth = 0
  for (let k = open + 1; k < masked.length; k++) {
    const c = masked[k]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break
      depth--
    } else if (c === '=' && masked[k + 1] === '>' && depth === 0) {
      return
    }
  }
  report(
    'static-read',
    severity,
    o.lineAt(open),
    `{this.${read[1]}…} in render() is read once and never updates. Wrap it in an arrow ({() => this.${read[1]}…}) if it should stay in sync; leave it if a one-time snapshot is intended.`,
    'essentials/reactivity',
  )
}
