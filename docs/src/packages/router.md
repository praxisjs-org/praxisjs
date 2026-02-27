# @verbose/router

::: code-group

```sh [npm]
npm install @verbose/router
```

```sh [pnpm]
pnpm add @verbose/router
```

```sh [yarn]
yarn add @verbose/router
```

:::

Signal-based client-side router with nested routes, guards, and reactive composables.

## Defining Routes

```ts
import { createRouter } from '@verbose/router'

const router = createRouter([
  {
    path: '/',
    component: () => <Home />,
  },
  {
    path: '/users/:id',
    component: () => <UserDetail />,
    beforeEnter: (to) => {
      if (!auth.token) return '/login'
      return true
    },
  },
  {
    path: '/admin',
    component: () => <AdminLayout />,
    children: [
      { path: 'users', component: () => <AdminUsers /> },
      { path: 'settings', component: () => <AdminSettings /> },
    ],
  },
  {
    path: '**',  // wildcard fallback
    component: () => <NotFound />,
  },
])
```

## `createRouter(routes)`

Creates and registers the router singleton. Returns the `Router` instance directly.

```ts
const router = createRouter(routes)
```

## `Router`

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `location` | `Signal<RouteLocation>` | Current route location |
| `currentComponent` | `Signal<RouteComponent \| null>` | Active component |
| `params` | `Computed<RouteParams>` | URL params (`/users/:id` → `{ id: '42' }`) |
| `query` | `Computed<RouteQuery>` | Query string (`?page=2` → `{ page: '2' }`) |

### Methods

```ts
router.push('/users/42')      // navigate, add to history
router.replace('/login')      // navigate, replace current entry
router.back()                 // go back
router.forward()              // go forward
```

`push` returns `Promise<void>`. If `beforeEnter` returns `false` the navigation is aborted; if it returns a string the router redirects to that path instead.

## Route Types

```ts
type RouteLocation = {
  path: string
  params: RouteParams       // { id: '42' }
  query: RouteQuery         // { page: '2' }
  hash: string              // '#section'
}

type RouteDefinition = {
  path: string
  component: () => VNode
  children?: RouteDefinition[]
  beforeEnter?: (to: RouteLocation) => boolean | string | Promise<boolean | string>
}
```

## Composables

Use these inside components to access router state reactively.

```ts
import { useRouter, useParams, useQuery, useLocation } from '@verbose/router'

const router = useRouter()
const params = useParams()    // Computed<RouteParams>
const query = useQuery()      // Computed<RouteQuery>
const location = useLocation() // Signal<RouteLocation>
```

## Components

### `<RouterView />`

Renders the current route's component reactively.

```tsx
import { RouterView } from '@verbose/router'

render() {
  return (
    <div>
      <NavBar />
      <RouterView />
    </div>
  )
}
```

### `<Link />`

Navigation component that renders an `<a>` tag. Adds `activeClass` when the current path matches `to`.

```tsx
import { Link } from '@verbose/router'

<Link to="/home">Home</Link>
<Link to="/users" activeClass="active">Users</Link>
<Link to="/settings" replace>Settings</Link>
```

| Prop | Type | Description |
|------|------|-------------|
| `to` | `string` | Target path |
| `replace` | `boolean` | Use `replace` instead of `push` |
| `class` | `string` | CSS class |
| `activeClass` | `string` | Class added when route is active |
| `children` | `Child[]` | Link content |

## `@Route(path)` Decorator

Registers the component class as a route directly.

```ts
import { Route } from '@verbose/router'

@Route('/about')
@Component()
class AboutPage extends BaseComponent {
  render() { return <main>About</main> }
}
```
