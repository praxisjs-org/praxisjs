import { afterEach, describe, expect, it } from 'vitest'

import { planScaffold } from '../project/scaffold.js'
import { validateSource } from '../project/validate.js'

import { APP_FILES, makeProject, removeProjects, writeFile } from './fixtures.js'

afterEach(removeProjects)

describe('planScaffold', () => {
  it('places each kind in the folder the project already uses, with valid starter code', () => {
    const root = makeProject(APP_FILES)
    const kinds = ['component', 'store', 'composable', 'service', 'decorator', 'function', 'stylesheet'] as const
    const plans = kinds.map((kind) => planScaffold(root, { kind, name: kind === 'function' ? 'format-date' : 'Shopping cart' }))
    expect(plans.map((p) => p.file)).toEqual([
      'src/components/shopping-cart.tsx',
      'src/stores/shopping-cart.ts',
      'src/composables/shopping-cart.ts',
      'src/services/shopping-cart.ts',
      'src/decorators/shopping-cart.ts',
      'src/utils/format-date.ts',
      'src/styles/shopping-cart.ts',
    ])
    for (const plan of plans) {
      expect(plan.exists).toBe(false)
      expect(validateSource(plan.code, plan.file)).toEqual([])
    }
    expect(plans[0].code).toContain('export class ShoppingCart extends StatefulComponent')
    expect(plans[4].code).toContain("label: '@ShoppingCart()'")
    expect(plans[4].code).toContain('setup(original)')
    expect(plans[4].notes.join(' ')).toContain('never use the accessor keyword')
    expect(plans[2].notes.join(' ')).toContain('@praxisjs/core/internal')
    expect(plans[5].code).toContain('export function formatDate(): void')
    expect(plans[0].test).toEqual({
      file: 'src/__tests__/shopping-cart.test.tsx',
      exists: false,
      code: expect.stringContaining("import { ShoppingCart } from '../components/shopping-cart'") as unknown as string,
    })
    expect(plans[1].test?.code).toContain('expect(ShoppingCart).toBeDefined()')
    expect(plans[0].notes.join(' ')).toContain('No Vitest config found')
    expect(plans[0].docs).toEqual(['essentials/components', 'decorators/state', 'essentials/reactivity'])
  })

  it('writes a stateless component and flags existing files', () => {
    const root = makeProject({ ...APP_FILES, 'vitest.config.ts': '' })
    writeFile(root, 'src/__tests__/user-card.test.tsx', '')
    const plan = planScaffold(root, { kind: 'component', name: 'UserCard', stateful: false })
    expect(plan.exists).toBe(true)
    expect(plan.test?.exists).toBe(true)
    expect(plan.code).toContain('export class UserCard extends StatelessComponent<UserCardProps>')
    expect(validateSource(plan.code, plan.file)).toEqual([])
    expect(plan.notes).toEqual([])
  })

  it('uses @Route when the project routes with it, and the router table otherwise', () => {
    const routed = makeProject(APP_FILES)
    const page = planScaffold(routed, { kind: 'page', name: 'SettingsPage' })
    expect(page.file).toBe('src/pages/settings-page.tsx')
    expect(page.code).toContain("@Route('/settings')\n@Component()")
    expect(validateSource(page.code, page.file)).toEqual([])
    expect(planScaffold(routed, { kind: 'page', name: 'Help', route: '/support/help' }).code).toContain("@Route('/support/help')")

    const tableOnly = makeProject({
      'src/app.tsx': "@Router([{ path: '/', component: Home }])\n@Component()\nexport class App extends StatefulComponent {}",
    })
    const plan = planScaffold(tableOnly, { kind: 'page', name: 'Settings' })
    expect(plan.code).not.toContain('@Route')
    expect(plan.notes[0]).toBe(
      "Register the page in the @Router([...]) table in src/app.tsx: { path: '/settings', component: Settings } (or Lazy(() => import('./pages/settings')) to split it out).",
    )

    const noRouter = planScaffold(makeProject(), { kind: 'page', name: 'Settings' })
    expect(noRouter.notes[0]).toContain('No router found')
  })

  it('follows .praxisjs-ai.json: styled components and no tests', () => {
    const root = makeProject({ ...APP_FILES, '.praxisjs-ai.json': JSON.stringify({ css: 'praxisjs-css', tests: false }) })
    const plan = planScaffold(root, { kind: 'component', name: 'Panel' })
    expect(plan.code).toContain('class PanelStyles extends Stylesheet')
    expect(plan.code).toContain('@Styled(PanelStyles)\n  $s!: PanelStyles')
    expect(plan.code).toContain('<section class={this.$s.$root}>')
    expect(plan.test).toBeUndefined()
    expect(validateSource(plan.code, plan.file)).toEqual([])
  })

  it('suggests defaults in a new project and puts tests next to code when the project does', () => {
    const fresh = makeProject({ 'src/store.ts': '@Storable()\nexport class S extends ReactiveStore {}', 'src/s.test.ts': '' })
    const store = planScaffold(fresh, { kind: 'store', name: 'cart' })
    expect(store.file).toBe('src/stores/cart.ts')
    expect(store.notes[0]).toBe("Existing store code sits loose in src/; new ones go in src/stores/ (move the existing ones there too, with the user's consent).")
    expect(store.test?.file).toBe('src/stores/cart.test.ts')
    expect(store.test?.code).toContain("from './cart'")
    expect(planScaffold(fresh, { kind: 'service', name: 'api-' }).file).toBe('src/services/api.ts')
    const composable = planScaffold(fresh, { kind: 'composable', name: 'Online' })
    expect(composable.notes[0]).toContain('The project has no composable yet: src/composables/ is the PraxisJS default.')
  })
})
