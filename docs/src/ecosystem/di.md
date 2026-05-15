---
title: Dependency Injection
description: "@praxisjs/di — decorator-based DI with @Injectable, @Inject, @InjectContainer, and @Scope for per-instance scoped containers."
---

# Dependency Injection

Decorator-based DI with singleton/transient scopes, token-based injection, and per-instance scoped containers.

::: code-group

```sh [npm]
npm install @praxisjs/di
```

```sh [pnpm]
pnpm add @praxisjs/di
```

```sh [yarn]
yarn add @praxisjs/di
```

```sh [bun]
bun add @praxisjs/di
```

:::

## `@Injectable(options?)`

Registers a class in the global container. Must be applied for the class to be resolvable.

```ts
import { Injectable } from '@praxisjs/di'

@Injectable()
class LoggerService {
  log(msg: string) { console.log('[LOG]', msg) }
}

@Injectable({ scope: 'transient' })  // new instance on every resolve
class RequestContext { /* ... */ }
```

Default scope is `'singleton'` — one instance per container.

<StorybookLink story="ecosystem-di--default" label="Live demo — @Injectable / @Inject" />

---

## `@Inject(dep)`

Lazily injects a dependency into a field. Resolves on first access from the container (or scoped container if inside `@Scope`).

```ts
@Injectable()
class UserService {
  @Inject(LoggerService) private logger!: LoggerService

  greet(name: string) {
    this.logger.log(`Hello, ${name}`)
  }
}
```

Works in any class — not limited to components.

---

## `@InjectContainer()`

Injects the container itself. Inside a `@Scope` class, injects the scoped child container.

```ts
@Injectable()
class ServiceLocator {
  @InjectContainer() private container!: Container

  get<T>(token: Token<T>): T {
    return this.container.resolve(token)
  }
}
```

---

## Token-based injection

For non-class dependencies (interfaces, primitives, config):

```ts
import { token, container } from '@praxisjs/di'

const CONFIG_TOKEN = token<AppConfig>('config')

container.registerValue(CONFIG_TOKEN, {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
})

@Injectable()
class ApiService {
  @Inject(CONFIG_TOKEN) private config!: AppConfig
}
```

---

## In components with `@Inject`

Use `@Inject` directly on component fields — no bridge function needed:

```tsx
import { Inject } from '@praxisjs/di'
import { Component } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class Dashboard extends StatefulComponent {
  @Inject(AnalyticsService) private analytics!: AnalyticsService

  onMount() {
    this.analytics.track('dashboard:view')
  }

  render() { return <div>Dashboard</div> }
}
```

---

## `@Scope(configure?)`

Creates a child container scoped to each instance of the class. `@Inject` and `@InjectContainer` inside the class resolve from this child container automatically.

```tsx
import { Scope, Inject } from '@praxisjs/di'

@Scope((c) => {
  c.register(UserRepository)
  c.registerValue(AUTH_TOKEN, getCurrentToken())
})
@Component()
class UserModule extends StatefulComponent {
  @Inject(UserRepository) private repo!: UserRepository

  render() { /* ... */ }
}
```

Each `UserModule` instance gets its own isolated container that inherits all global registrations. Useful for feature modules, dialogs, or multi-tenant layouts.

---

## Circular dependency detection

When a circular dependency is detected, the container throws an error describing the full resolution chain:

```
Circular dependency detected: ServiceA → ServiceB → ServiceA
```

This prevents infinite loops during service resolution and makes the dependency cycle easy to identify and fix.

---

## Container API

```ts
import { container } from '@praxisjs/di'

container.register(MyService)
container.register(MyService, { scope: 'transient' })
container.registerValue(TOKEN, value)
container.registerFactory(TOKEN, (c) => new MyService(c.resolve(Dep)))
container.resolve(MyService)

// Create a child container (inherits parent registrations)
const child = container.createChild()
child.registerValue(REQUEST_TOKEN, currentRequest)
child.resolve(MyService)  // MyService can inject REQUEST_TOKEN
```

<llm-only>
DI facts:
- @Injectable() is built on createClassDecorator (ClassBehavior from @praxisjs/decorators) — it registers the Enhanced subclass in the global container via the initialize() hook; must be applied as a real decorator (not called imperatively) so TypeScript reassigns the class variable to Enhanced
- @Inject() resolves lazily on first property access — cached per instance in a WeakMap; built on createFieldDecorator
- @InjectContainer() is also built on createFieldDecorator — works on any class, not just StatefulComponent
- @Inject and @InjectContainer are field decorators — they work on any class, not just StatefulComponent
- Inside a @Scope class, @Inject resolves from the instance's child container; if not found, it falls back to the parent chain
- @Scope is built on createClassDecorator (ClassBehavior) — the child container is created in the ClassBehavior.create(instance) hook, which runs per instance during construction; configure callback receives the child container
- token<T>(description) creates a typed injection token — use for non-class deps (interfaces, primitives)
- container.registerFactory(token, fn) — fn receives the container and should return the service instance
- container.createChild() — child inherits parent registrations but can override them with local registrations
- Singleton scope: one instance per container (not global — each child container has its own singleton)
- Transient scope: new instance on every container.resolve() call
- Import: Injectable, Inject, InjectContainer, Scope from '@praxisjs/di'; Container, container, token, Token from '@praxisjs/di'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
