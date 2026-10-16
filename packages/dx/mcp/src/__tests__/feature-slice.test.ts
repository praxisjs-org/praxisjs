import { afterEach, describe, expect, it } from 'vitest'

import { detectFeatures, detectLayout } from '../knowledge/layout.js'
import { structureConvention } from '../memory/map.js'
import { planScaffold } from '../project/scaffold.js'
import { scanProject } from '../project/scan.js'
import { validateSource } from '../project/validate.js'

import { makeProject, removeProjects } from './fixtures.js'

afterEach(removeProjects)

const SLICED = {
  'package.json': '{}',
  'src/app/app.tsx': '@Component()\nexport class App extends StatefulComponent { render() { return null } }',
  'src/features/cart/index.ts': "export { CartStore } from './stores/cart-store'",
  'src/features/cart/stores/cart-store.ts': '@Storable()\nexport class CartStore extends ReactiveStore {}',
  'src/features/catalog/components/product-card.tsx': '@Component()\nexport class ProductCard extends StatelessComponent<{ id: string }> { render() { return null } }',
  'src/shared/ui/button.tsx': '@Component()\nexport class Button extends StatelessComponent { render() { return null } }',
}

describe('feature-slice detection', () => {
  it('finds features and reports the layout style', () => {
    expect(detectFeatures(['src/features/b/x.ts', 'src/features/a/y.ts', 'src/features/a/z.ts', 'src/x.ts'])).toEqual(['a', 'b'])
    const layout = detectLayout(scanProject(makeProject(SLICED)))
    expect(layout).toMatchObject({ style: 'feature-slice', features: ['cart', 'catalog'] })
    expect(detectLayout(scanProject(makeProject({ 'src/a.ts': '' }))).style).toBe('by-kind')
  })

  it('records the feature-slice rules as the project structure', () => {
    const entry = structureConvention(detectLayout(scanProject(makeProject(SLICED))))
    expect(entry.summary).toContain('Feature-slice layout')
    expect(String(entry.rule)).toContain('Features: `cart`, `catalog`.')
    expect(String(entry.rule)).toContain("only through the other feature's `index.ts`")
    expect(String(entry.rule)).toContain('`shared/` never imports from `features/`')
  })
})

describe('feature-slice scaffolding', () => {
  it('places code in its feature, or in shared without one', () => {
    const root = makeProject(SLICED)
    const store = planScaffold(root, { kind: 'store', name: 'Wishlist', feature: 'cart' })
    expect(store.file).toBe('src/features/cart/stores/wishlist.ts')
    expect(store.test?.file).toBe('src/features/cart/__tests__/wishlist.test.ts')
    expect(store.notes.join(' ')).not.toContain('New feature')

    const page = planScaffold(root, { kind: 'page', name: 'Checkout', feature: 'Checkout Flow' })
    expect(page.file).toBe('src/features/checkout-flow/components/checkout.tsx')
    expect(page.notes[0]).toContain('New feature "checkout-flow" (existing features: cart, catalog)')
    expect(page.notes[1]).toContain('src/features/checkout-flow/routes.ts')

    const helper = planScaffold(root, { kind: 'function', name: 'formatPrice', feature: 'cart' })
    expect(helper.file).toBe('src/shared/lib/format-price.ts')
    expect(helper.test?.file).toBe('src/shared/lib/__tests__/format-price.test.ts')

    const shared = planScaffold(root, { kind: 'component', name: 'Badge' })
    expect(shared.file).toBe('src/shared/ui/badge.tsx')
    expect(shared.test?.file).toBe('src/shared/ui/__tests__/badge.test.tsx')
    expect(shared.notes[0]).toContain('placed in src/shared/ui/ as shared code')

    const decorator = planScaffold(root, { kind: 'decorator', name: 'Logged' })
    expect(decorator.file).toBe('src/shared/lib/logged.ts')

    const page2 = planScaffold(root, { kind: 'page', name: 'Home' })
    expect(page2.file).toBe('src/features/<feature>/components/home.tsx')
    expect(page2.notes[0]).toBe('Feature-slice project: pass the feature this page belongs to (existing features: cart, catalog).')
  })
})

describe('feature-slice boundaries', () => {
  const rules = (source: string, file: string) => validateSource(source, file).map((d) => `${String(d.line)} ${d.rule}`)

  it('allows imports through index.ts and within the same feature', () => {
    const source = [
      "import { CartStore } from '../../cart'",
      "import { X } from '@/features/cart/index'",
      "import { Y } from '@/features/cart/index.ts'",
      "import { Z } from '../stores/local'",
      "import { W } from '@/shared/ui/button'",
      "import { V } from 'some-package'",
    ].join('\n')
    expect(rules(source, 'src/features/catalog/components/list.tsx')).toEqual([])
    expect(rules("import { A } from '../../catalog/components/card'", 'src/features/catalog/stores/a.ts')).toEqual([])
  })

  it('flags deep imports into another feature and shared importing features', () => {
    expect(rules("import { CartStore } from '../../cart/stores/cart-store'\nimport { B } from '@/features/cart/stores/b'", 'src/features/catalog/components/list.tsx')).toEqual([
      '1 feature-deep-import',
      '2 feature-deep-import',
    ])
    expect(rules("import { CartStore } from '@/features/cart'", 'src\\shared\\ui\\x.tsx')).toEqual(['1 shared-imports-feature'])
    expect(rules("import { CartStore } from '@/features/cart'", 'src/app/app.tsx')).toEqual([])
  })
})
