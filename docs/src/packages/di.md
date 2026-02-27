# @verbose/di

```sh
npm install @verbose/di
```

Dependency injection container with TypeScript decorators, token-based resolution, and scoped containers.

## Basic Usage

```ts
import { Injectable, Inject, container } from '@verbose/di'

@Injectable()
class LoggerService {
  log(msg: string) {
    console.log('[LOG]', msg)
  }
}

@Injectable()
class UserService {
  @Inject(LoggerService) private logger!: LoggerService

  greet(name: string) {
    this.logger.log(`Hello, ${name}`)
  }
}

const userService = container.resolve(UserService)
userService.greet('Alice')
```

---

## `@Injectable(options?)`

Registers a class in the global container.

```ts
@Injectable({ scope: 'singleton' })
class CacheService { /* ... */ }

@Injectable({ scope: 'transient' })
class RequestContext { /* ... */ }
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scope` | `'singleton' \| 'transient'` | `'singleton'` | Singleton shares one instance; transient creates a new one on each resolve |

---

## `@Inject<T>(dep)`

Lazily injects a dependency into a class property. Resolves and caches on first access. In development, blocks direct property assignment to prevent bypassing the container.

```ts
@Injectable()
class ApiClient {
  @Inject(AuthService) private auth!: AuthService
  @Inject(HTTP_CLIENT) private http!: HttpClient  // token injection

  async get(path: string) {
    return this.http.get(path, { token: this.auth.token })
  }
}
```

`dep` can be a class constructor or a `Token<T>`.

---

## `@InjectContainer()`

Injects the DI container itself. Useful for dynamic resolution.

```ts
@Injectable()
class ServiceLocator {
  @InjectContainer() private container!: Container

  resolve<T>(type: Constructor<T>): T {
    return this.container.resolve(type)
  }
}
```

---

## Tokens

Use tokens for injecting values that aren't classes (primitives, config objects, interfaces).

### `token<T>(description)`

Creates a typed injection token.

```ts
import { token } from '@verbose/di'

const API_URL = token<string>('API_URL')
const HTTP_OPTIONS = token<HttpOptions>('HTTP_OPTIONS')
```

### Registering token values

```ts
container.registerValue(API_URL, 'https://api.example.com')
container.registerValue(HTTP_OPTIONS, { timeout: 5000 })
```

### Injecting tokens

```ts
@Injectable()
class ApiService {
  @Inject(API_URL) private baseUrl!: string
}
```

---

## Container

The global `container` instance is available as a named export. You can also create child containers for isolated scopes.

### `container.register(target, options?)`

Manually register a class.

```ts
container.register(MyService, { scope: 'transient' })
```

### `container.registerValue(token, value)`

Register a plain value.

```ts
container.registerValue(API_URL, 'https://api.example.com')
```

### `container.registerFactory(token, factory)`

Register a factory function that receives the container and returns the value.

```ts
container.registerFactory(LOGGER, (c) => {
  const config = c.resolve(AppConfig)
  return config.debug ? new DebugLogger() : new SilentLogger()
})
```

### `container.resolve(target)`

Resolves a class or token from the container.

```ts
const service = container.resolve(UserService)
const url = container.resolve(API_URL)
```

### `container.createChild()`

Creates a child container that inherits all registrations from its parent but has its own scope for new registrations.

```ts
const requestScope = container.createChild()
requestScope.registerValue(REQUEST_ID, generateId())
```

---

## `createScope()`

Shorthand for creating a scoped child container. Useful for request-level or component-level isolation.

```ts
import { createScope } from '@verbose/di'

const scope = createScope()
scope.registerValue(SESSION, session)
const handler = scope.resolve(RequestHandler)
```

---

## `useService<T>(ServiceClass)`

Composable to resolve a service from the global container inside a component.

```ts
import { useService } from '@verbose/di'

@Component()
class Dashboard extends BaseComponent {
  analytics = useService(AnalyticsService)

  render() {
    return <div onMount={() => this.analytics.track('view')} />
  }
}
```
