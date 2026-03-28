---
title: Router
description: "@praxisjs/router — signal-based client-side router. Configure routes with @RouterConfig, define lazy routes with @Lazy, annotate pages with @Route, and inject reactive router state with @InjectRouter, @Params, @Query, @Location."
---

# Router

Signal-based client-side routing. Configure the router with `@RouterConfig` on your root component and use decorator-based injection to access router state anywhere.

```sh
npm install @praxisjs/router
```

## Setup with `@RouterConfig`

Apply `@RouterConfig` to the root component class to configure the router. It takes the same route definitions as the low-level API.

```tsx
import { RouterConfig, Lazy } from '@praxisjs/router'
import { RouterView } from '@praxisjs/router'
import { Home } from './pages/Home'

@Lazy(() => import('./pages/About'))
class AboutPage {}

@RouterConfig([
  { path: '/', component: Home },
  { path: '/about', component: AboutPage },
  { path: '/users/:id', component: Lazy(() => import('./pages/UserDetail')) },
  {
    path: '/admin',
    component: Lazy(() => import('./pages/AdminLayout')),
    children: [
      { path: 'users',    component: Lazy(() => import('./pages/AdminUsers')) },
      { path: 'settings', component: Lazy(() => import('./pages/AdminSettings')) },
    ],
  },
  { path: '**', component: Lazy(() => import('./pages/NotFound')) },
])
@Component()
class App extends StatefulComponent {
  render() {
    return (
      <div>
        <NavBar />
        <RouterView />
      </div>
    )
  }
}
```

`RouterView` renders the matched route component reactively.

---

## `@Route(path)`

Registers a component's path as a static property. Use this to keep routing metadata co-located with the component:

```tsx
import { Route } from '@praxisjs/router'

@Route('/about')
@Component()
class AboutPage extends StatefulComponent {
  render() { return <main>About</main> }
}

// Then reference it by class in route definitions:
@RouterConfig([
  { path: AboutPage.__routePath, component: AboutPage },
])
```

---

## `@Lazy(loader)`

Marks a class as a lazy-loaded route component. The actual component is loaded on first navigation and cached.

```ts
@Lazy(() => import('./pages/UserDetail'))
class UserDetailPage {}

// Use as a component in route definitions:
{ path: '/users/:id', component: UserDetailPage }
```

Or inline directly in the route definition:

```ts
{ path: '/users/:id', component: Lazy(() => import('./pages/UserDetail')) }
```

---

## Injecting router state

Use these field decorators to access reactive router state inside any component or service.

### `@InjectRouter()`

Injects the `Router` instance for navigation and loading state:

```tsx
import { InjectRouter } from '@praxisjs/router'

@Component()
class NavBar extends StatefulComponent {
  @InjectRouter() router!: Router

  render() {
    return (
      <nav>
        {() => this.router.loading() && <Spinner />}
        <button onClick={() => this.router.push('/home')}>Home</button>
      </nav>
    )
  }
}
```

### `@Params()`

Injects current route params as a reactive `Computed`:

```tsx
@Params() params!: Computed<RouteParams>

render() {
  return <p>User ID: {() => this.params().id}</p>
}
```

### `@Query()`

Injects the URL query string as a reactive `Computed`:

```tsx
@Query() query!: Computed<RouteQuery>

render() {
  return <p>Page: {() => this.query().page ?? '1'}</p>
}
```

### `@Location()`

Injects the full current route location as a reactive `Signal`:

```tsx
@Location() location!: Signal<RouteLocation>

render() {
  return <p>Path: {() => this.location().path}</p>
}
```

`RouteLocation` has `path`, `params`, `query`, and `hash`.

---

## Navigation

```ts
await this.router.push('/users/42')            // navigate, add to history
await this.router.push('/search', { q: 'foo' }) // with query params
await this.router.replace('/login')             // replace current entry
this.router.back()
this.router.forward()
this.router.go(-2)
```

---

## Link component

```tsx
import { Link } from '@praxisjs/router'

<Link to="/home">Home</Link>
<Link to="/users" activeClass="nav-active">Users</Link>
<Link to="/settings" replace>Settings</Link>
```

| Prop | Type | Description |
|---|---|---|
| `to` | `string` | Target path |
| `replace` | `boolean` | Use replace instead of push |
| `activeClass` | `string` | Class added when route is active |

---

## Navigation guards

Add `beforeEnter` to any route. Return `true` to allow, `false` to cancel, or a path string to redirect:

```ts
{
  path: '/admin',
  component: AdminPage,
  beforeEnter: async (to, from) => {
    const ok = await auth.checkPermission(to.path)
    return ok ? true : '/login'
  },
}
```

<llm-only>
Router facts:
- @RouterConfig replaces createRouter() — apply once on the root app class
- @Lazy(loader) as a class decorator replaces the class with a LazyRouteComponent — use the class itself in route definitions
- Lazy(() => import('./Page')) inline in route definitions also works (same result)
- router.loading() is true while a lazy component chunk is loading
- @Params() and @Query() inject Computed<T> — call them as functions: this.params(), this.query()
- @Location() injects Signal<RouteLocation> — call as this.location()
- @InjectRouter() injects the Router instance — use for push/replace/back/forward/loading
- RouteLocation: { path: string, params: RouteParams, query: RouteQuery, hash: string }
- router.push(path, query?, hash?) — query is Record<string, string>, serialized as URLSearchParams
- Nested routes: children[] paths are relative to the parent path (no leading slash)
- @Route(path) sets a __routePath static property on the class — useful to keep path co-located with the component
- Import all decorators and components from '@praxisjs/router'
</llm-only>
