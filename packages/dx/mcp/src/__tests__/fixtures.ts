import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const created: string[] = []

/** Creates a throwaway project folder with the given files (paths relative to its root). */
export function makeProject(files: Record<string, string> = {}): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-mcp-')))
  created.push(root)
  for (const [file, content] of Object.entries(files)) writeFile(root, file, content)
  return root
}

export function writeFile(root: string, file: string, content: string): void {
  const full = path.join(root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

export function removeProjects(): void {
  for (const root of created.splice(0)) fs.rmSync(root, { recursive: true, force: true })
}

export const PACKAGE_JSON = JSON.stringify({
  name: 'demo-app',
  dependencies: { '@praxisjs/core': '^2.3.0', '@praxisjs/decorators': '^1.8.0' },
  devDependencies: { '@praxisjs/vite-plugin': '^4.1.0', vite: '^7.0.0' },
})

export const TSCONFIG = `{
  // PraxisJS needs these
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@praxisjs/jsx", "useDefineForClassFields": true, },
}`

/** A small app shaped like the create-praxisjs templates, with one of each kind of reusable code. */
export const APP_FILES: Record<string, string> = {
  'package.json': PACKAGE_JSON,
  'tsconfig.json': TSCONFIG,
  'src/main.tsx': `import { render } from '@praxisjs/runtime'\nimport { App } from './app'\nrender(() => <App />, document.body)\n`,
  'src/app.tsx': `import { StatefulComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'
import { Router, Lazy } from '@praxisjs/router'
import { Home } from './pages/home'

@Router([
  { path: '/', component: Home },
  { path: '/about', component: Lazy(() => import('./pages/about')), meta: { title: 'About' } },
])
@Component()
export class App extends StatefulComponent {
  render() {
    return <main />
  }
}
`,
  'src/pages/home.tsx': `import { StatefulComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'

@Component()
export class Home extends StatefulComponent {
  render() {
    return <h1>Home</h1>
  }
}
`,
  'src/pages/about.tsx': `import { StatefulComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'
import { Route } from '@praxisjs/router'

@Route('/about')
@Component()
export default class About extends StatefulComponent {
  render() {
    return <h1>About</h1>
  }
}
`,
  'src/components/user-card.tsx': `import { StatelessComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'

/** Shows a user's name and avatar. */
@Component()
export class UserCard extends StatelessComponent<{ name: string }> {
  render() {
    return <div>{this.props.name}</div>
  }
}
`,
  'src/components/counter.tsx': `import { StatefulComponent } from '@praxisjs/core'
import { Component, Prop, State, FunctionProp } from '@praxisjs/decorators'

@Component()
export class Counter extends StatefulComponent {
  @Prop() start = 0
  @FunctionProp() onChange = (_v: number) => {}
  @State() count = 0

  render() {
    return <button onClick={() => this.count++}>{() => this.count}</button>
  }
}

@Component()
export class FancyCounter extends Counter {}

@Component()
class Hidden extends StatefulComponent {
  render() {
    return <i />
  }
}
`,
  'src/stores/cart-store.ts': `import { State } from '@praxisjs/decorators'
import { ReactiveStore, Storable } from '@praxisjs/store'

/** Items in the shopping cart. */
@Storable()
export class CartStore extends ReactiveStore {
  @State() items: string[] = []
}
`,
  'src/composables/online.ts': `import { Composable } from '@praxisjs/core'

export class Online extends Composable {
  setup() {
    return {}
  }
}
`,
  'src/services/api.ts': `import { Injectable } from '@praxisjs/di'

@Injectable()
export class ApiService {}
`,
  'src/decorators/log-calls.ts': `import { createMethodDecorator } from '@praxisjs/decorators'

export function LogCalls() {
  return createMethodDecorator({})
}

export const Traced = (value: unknown, context: ClassMethodDecoratorContext) => value
`,
  'src/styles/card.ts': `import { Stylesheet } from '@praxisjs/css'

export class CardStyles extends Stylesheet {}

class Local extends Stylesheet {}
`,
  'src/utils/format.ts': `/** Formats a price in cents. */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

export class Money {}

class Internal {}

export default function () {}
`,
  'src/__tests__/format.test.ts': `import { formatPrice } from '../utils/format'\n`,
  'node_modules/ignored/index.ts': 'export class Ignored {}',
  '.hidden/secret.ts': 'export class Secret {}',
  'src/types.d.ts': 'export declare class Declared {}',
}
