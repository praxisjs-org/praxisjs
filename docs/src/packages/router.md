# @praxisjs/router

::: code-group

```sh [npm]
npm install @praxisjs/router
```

```sh [pnpm]
pnpm add @praxisjs/router
```

```sh [yarn]
yarn add @praxisjs/router
```

:::

Signal-based client-side router with nested routes, lazy loading, guards, and reactive composables.

## Defining Routes

```ts
import { createRouter, lazy } from '@praxisjs/router'
import { Home } from './pages/Home'

const router = createRouter([
  // class component – eager
  { path: '/', component: Home },
  // function component – eager
  { path: '/about', component: () => <About /> },
  // lazy – loaded on first visit
  {
    path: '/users/:id',
    component: lazy(() => import('./pages/UserDetail')),
    beforeEnter: (to, from) => {
      if (!auth.token) return '/login'
      return true
    },
  },
  {
    path: '/admin',
    component: lazy(() => import('./pages/AdminLayout')),
    children: [
      { path: 'users', component: lazy(() => import('./pages/AdminUsers')) },
      { path: 'settings', component: lazy(() => import('./pages/AdminSettings')) },
    ],
  },
  {
    path: '**',  // wildcard fallback
    component: lazy(() => import('./pages/NotFound')),
  },
])
```

## `createRouter(routes)`

Creates and registers the router singleton. Returns the `Router` instance directly.

```ts
const router = createRouter(routes);
```

## Component Types

Routes accept three kinds of components:

| Kind              | Example                                        |
| ----------------- | ---------------------------------------------- |
| Class component   | `component: MyPage`                            |
| Function component | `component: () => <MyPage />`                 |
| Lazy (code-split) | `component: lazy(() => import('./MyPage'))`    |

## Lazy Loading

Use the `lazy()` helper to code-split routes. The component is fetched on demand and cached after the first load.

```ts
import { createRouter, lazy } from '@praxisjs/router'

createRouter([
  // Eager – imported at startup
  { path: '/', component: Home },

  // Lazy – loaded only when the route is first visited
  { path: '/settings', component: lazy(() => import('./pages/Settings')) },
])
```

While a lazy component is loading, `router.loading()` returns `true`, which you can use to show a loading indicator.

```tsx
const router = useRouter()

// in a render function
{() => router.loading() ? <Spinner /> : null}
```

## `Router`

### Properties

| Property           | Type                             | Description                                |
| ------------------ | -------------------------------- | ------------------------------------------ |
| `location`         | `Signal<RouteLocation>`          | Current route location                     |
| `currentComponent` | `Signal<RouteComponent \| null>` | Active component (resolved)                |
| `loading`          | `Signal<boolean>`                | `true` while a lazy component is loading   |
| `params`           | `Computed<RouteParams>`          | URL params (`/users/:id` → `{ id: '42' }`) |
| `query`            | `Computed<RouteQuery>`           | Query string (`?page=2` → `{ page: '2' }`) |

### Methods

```ts
await router.push("/users/42");  // navigate, add to history
await router.replace("/login");  // navigate, replace current entry
router.back();                   // go back
router.forward();                // go forward
router.go(-2);                   // go N steps in history
```

`push` and `replace` return `Promise<void>` and resolve after the component is ready. If `beforeEnter` returns `false` the navigation is aborted; if it returns a string the router redirects to that path instead.

## Route Types

```ts
type RouteLocation = {
  path: string;
  params: RouteParams; // { id: '42' }
  query: RouteQuery;   // { page: '2' }
  hash: string;        // 'section'
};

// class or function component
type RouteComponent = (new (...args: any[]) => any) | ((...args: any[]) => any);

// created with lazy() — loaded on demand, cached after first load
type LazyRouteComponent = { (): Promise<{ default: new (...args: any[]) => any }>; __isLazy: true };

type RouteDefinition = {
  path: string;
  component: RouteComponent | LazyRouteComponent;
  children?: RouteDefinition[];
  beforeEnter?: (
    to: RouteLocation,
    from: RouteLocation | null,
  ) => boolean | string | Promise<boolean | string>;
};
```

## Composables

Use these inside components to access router state reactively.

```ts
import { useRouter, useParams, useQuery, useLocation } from "@praxisjs/router";

const router = useRouter();
const params = useParams(); // Computed<RouteParams>
const query = useQuery(); // Computed<RouteQuery>
const location = useLocation(); // Signal<RouteLocation>
```

## Components

### `<RouterView />`

Renders the current route's component reactively.

```tsx
import { RouterView } from '@praxisjs/router'

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
import { Link } from '@praxisjs/router'

<Link to="/home">Home</Link>
<Link to="/users" activeClass="active">Users</Link>
<Link to="/settings" replace>Settings</Link>
```

| Prop          | Type       | Description                      |
| ------------- | ---------- | -------------------------------- |
| `to`          | `string`   | Target path                      |
| `replace`     | `boolean`  | Use `replace` instead of `push`  |
| `class`       | `string`   | CSS class                        |
| `activeClass` | `string`   | Class added when route is active |
| `children`    | `Children` | Link content                     |

## `@Route(path)` Decorator

Registers the component class as a route directly.

```ts
import { Route } from '@praxisjs/router'

@Route('/about')
@Component()
class AboutPage extends BaseComponent {
  render() { return <main>About</main> }
}
```
