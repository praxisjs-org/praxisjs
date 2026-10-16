import { describe, expect, it } from 'vitest'

import { validateSource } from '../project/validate.js'

const rules = (source: string, filename = 'x.tsx') =>
  validateSource(source, filename).map((d) => `${String(d.line)} ${d.severity} ${d.rule}`)

describe('validateSource — imports', () => {
  it('flags internal imports, compiler helpers and names @praxisjs/core does not export', () => {
    const source = [
      `import { StatefulComponent, signal, effect } from '@praxisjs/core'`,
      `import type { Nothing } from '@praxisjs/core'`,
      `import { computed } from '@praxisjs/core/internal'`,
      `import { render, _$template } from '@praxisjs/runtime'`,
      `import { State } from '@praxisjs/decorators'`,
    ].join('\n')
    expect(rules(source)).toEqual([
      '1 error core-export',
      '1 error core-export',
      '3 warning internal-import',
      '4 error compiler-helper-import',
    ])
  })

  it('allows internal imports in composables and custom decorators', () => {
    const internal = `import { signal } from '@praxisjs/core/internal'`
    expect(rules(`${internal}\nexport class Online extends Composable {}`, 'a.ts')).toEqual([])
    expect(rules(`${internal}\nclass B extends ClassBehavior {}`, 'a.ts')).toEqual([])
    expect(rules(`${internal}\nimport { createFieldDecorator } from '@praxisjs/decorators'`, 'a.ts')).toEqual([])
    expect(rules(`${internal}\nimport { State } from '@praxisjs/decorators'\nimport { x } from 'other'`, 'a.ts')).toEqual(['1 warning internal-import'])
  })
})

describe('validateSource — component structure', () => {
  it('requires @Component, innermost, and a render method', () => {
    const source = `
class NoDecorator extends StatefulComponent {
  render() { return null }
}
@Component()
@Route('/x')
class Outer extends StatefulComponent {
  render() { return null }
}
@Component()
class NoRender extends StatelessComponent<{ a: string }> {}
abstract class Base extends StatefulComponent {}
@Component()
class FromBase extends Base {}
x = class extends StatefulComponent { render() { return null } }
`
    expect(rules(source)).toEqual([
      '2 error missing-component',
      '5 error component-order',
      '10 error missing-render',
      '15 error missing-component',
    ])
    expect(validateSource(source, 'x.tsx').at(-1)?.message).toContain('anonymous class')
  })

  it('rejects the accessor keyword, with or without decorators', () => {
    const source = `@Component()
class A extends StatefulComponent {
  @State() accessor count = 0
  accessor plain = 1
  render() { return null }
}`
    expect(rules(source)).toEqual(['3 error accessor-keyword', '4 warning accessor-keyword'])
  })

  it('rejects stateful-only decorators on StatelessComponent and this.props on StatefulComponent', () => {
    const source = `@Component()
class S extends StatelessComponent<{ a: string }> {
  @State() x = 1
  @Compose(WindowSize) size!: WindowSize
  render() { return <p>{this.props.a}</p> }
}
@Component()
class F extends StatefulComponent {
  render() { return <p>{this.props.a}</p> }
}`
    expect(rules(source)).toEqual(['3 error stateless-decorator', '9 error stateful-props'])
  })

  it('wants @State/@Prop closest to the field', () => {
    const source = `class A extends ReactiveStore {
  @State() @Debug() wrong = 1
  @Debug() @State() right = 1
  @Persisted('k') alone = 1
}`
    expect(rules(source)).toEqual(['2 warning decorator-order'])
  })
})

describe('validateSource — decorator arguments', () => {
  it('checks that member names given to decorators exist', () => {
    const source = `class A extends StatefulComponent {
  @State() a = 1
  @State() selected = 0
  @Watch('a', 'missing') onA() {}
  @When('gone') onGone() {}
  @Selector('selected') isSelected!: Selector<number>
  @History(field) h!: unknown
  @Task('load') loadTask!: unknown
  @Debounce(100) typed() {}
  @Watch watchNoCall() {}
  render() { return null }
}
class Custom extends Base {
  @Watch('nope') x() {}
}
class NoBase {
  @Watch('nope') y() {}
}`
    expect(rules(source, 'x.ts')).toEqual([
      '1 error missing-component',
      '4 warning unknown-member',
      '5 warning unknown-member',
      '8 warning unknown-member',
    ])
  })
})

describe('validateSource — reactivity', () => {
  it('flags in-place mutation of shallow state', () => {
    const source = `class A extends ReactiveStore {
  @State() items: string[] = []
  @State() form = { name: '' }
  @DeepState() deep: string[] = []
  plain: string[] = []
  add() {
    this.items.push('x')
    this.form.name = 'y'
    this.form['name'] ??= 'z'
    this.items = [...this.items, 'ok']
    this.deep.push('fine')
    this.plain.push('fine')
    if (this.items.length === 0) return
  }
}`
    expect(rules(source, 'a.ts')).toEqual(['7 warning in-place-mutation', '8 warning in-place-mutation', '9 warning in-place-mutation'])
  })

  it('flags reactive fields read once in render, as a warning for state and a hint for props', () => {
    const source = `@Component()
class A extends StatefulComponent {
  @State() count = 0
  @State() items: string[] = []
  @Prop() title = ''
  @Prop() children = null
  plain = 1
  render() {
    const same = this.count == {this.count}
    const local = ( ={this.count})
    const call = fn({ a: this.count }, {this.count, () => this.count})
    return (
      <div title={this.title} onClick={this.count} class={() => this.title}>
        <p>Count: {this.count} {() => this.count} {this.plain} {this.children}</p>
        {() => <span>{this.count}</span>}
        <ul>{this.items.map((i) => <li>{i}</li>)}</ul>
        {cond ? a : b}
        {(this.count)}
        {[this.count, this.count].join(','); this.count}
        {this.count, () => this.count}
      </div>
    )
  }
}`
    expect(rules(source)).toEqual(['13 info static-read', '14 warning static-read', '16 warning static-read'])
  })
})
