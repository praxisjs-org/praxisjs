import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import { type Router, createRouter, useRouter, lazy } from "./router";

import type { RouteDefinition, RouteLocation, RouteParams, RouteQuery } from "./types/route";

// ── @Route ────────────────────────────────────────────────────────────────────

class RouteBehavior extends ClassBehavior {
  constructor(private readonly path: string) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown): void {
    Object.defineProperty(Enhanced, "__routePath", {
      value: this.path,
      writable: false,
      configurable: false,
    });
  }
}

export function Route(path: string) {
  const decorator = createClassDecorator(new RouteBehavior(path));
  // Router decorators work on any class, not just RootComponent
   
  return decorator as unknown as (value: abstract new (...args: unknown[]) => unknown, context: ClassDecoratorContext) => abstract new (...args: unknown[]) => unknown;
}

// ── @RouterConfig ─────────────────────────────────────────────────────────────

/**
 * Configures the router singleton for the application.
 * Replaces createRouter(). Apply once on your root app class.
 *
 * @RouterConfig([
 *   { path: '/', component: Home },
 *   { path: '/about', component: About },
 * ])
 * class App extends StatefulComponent { ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RouterConfig(routes: RouteDefinition[]): (cls: new (...args: any[]) => any, ctx: ClassDecoratorContext) => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function(cls: new (...args: any[]) => any, _ctx: ClassDecoratorContext) {
    createRouter(routes);
    return cls;
  };
}

// ── @Lazy ─────────────────────────────────────────────────────────────────────

/**
 * Marks a placeholder class as a lazily-loaded route component.
 * The class is replaced by a LazyRouteComponent usable in route definitions.
 *
 * @Lazy(() => import('./About'))
 * class AboutRoute {}
 * // { path: '/about', component: AboutRoute }
 */
export function Lazy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: new (...args: any[]) => any }>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function(_cls: any, _ctx: ClassDecoratorContext): any {
    return lazy(loader);
  };
}

// ── Field decorators ──────────────────────────────────────────────────────────

/**
 * Injects the Router singleton as a field.
 *
 * @InjectRouter() router!: Router;
 */
export function InjectRouter() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(): Router { return useRouter(); },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

/**
 * Injects the current route params as a reactive Computed.
 *
 * @Params() params!: Computed<RouteParams>;
 * // access: this.params()
 */
export function Params() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useRouter().params; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

/**
 * Injects the current route query string as a reactive Computed.
 *
 * @Query() query!: Computed<RouteQuery>;
 * // access: this.query()
 */
export function Query() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useRouter().query; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

/**
 * Injects the current route location as a reactive Signal.
 *
 * @Location() location!: Signal<RouteLocation>;
 * // access: this.location()
 */
export function Location() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useRouter().location; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

export type { RouteDefinition, RouteLocation, RouteParams, RouteQuery };
