import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import { createRouter, useRouter, lazy, useMeta } from "./router";

import type { RouteDefinition, RouterOptions, RouteMeta } from "./types/route";

// ── @Route ────────────────────────────────────────────────────────────────────

export interface RouteOptions {
  path: string;
  name?: string;
  meta?: RouteMeta;
}

class RouteBehavior extends ClassBehavior {
  constructor(private readonly options: RouteOptions) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown): void {
    Object.defineProperty(Enhanced, "__routePath", {
      value: this.options.path,
      writable: false,
      configurable: false,
    });
    if (this.options.name !== undefined) {
      Object.defineProperty(Enhanced, "__routeName", {
        value: this.options.name,
        writable: false,
        configurable: false,
      });
    }
    if (this.options.meta !== undefined) {
      Object.defineProperty(Enhanced, "__routeMeta", {
        value: this.options.meta,
        writable: false,
        configurable: false,
      });
    }
  }
}

export function Route(options: string | RouteOptions) {
  const normalized: RouteOptions = typeof options === "string" ? { path: options } : options;
  const decorator = createClassDecorator(new RouteBehavior(normalized));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return decorator as unknown as (value: new (...args: any[]) => any, context: ClassDecoratorContext) => void;
}

// ── @Router ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRoute(entry: RouteDefinition | (new (...args: any[]) => any)): RouteDefinition {
  if (typeof entry === "function" && "__routePath" in entry) {
    const e = entry as {
      __routePath: string;
      __routeName?: string;
      __routeMeta?: RouteMeta;
    };
    return {
      path: e.__routePath,
      name: e.__routeName,
      meta: e.__routeMeta,
      component: entry,
    };
  }
  return entry as RouteDefinition;
}

class RouterBehavior extends ClassBehavior {
  constructor(
    private readonly routes: RouteDefinition[],
    private readonly options?: RouterOptions,
  ) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    createRouter(this.routes, this.options);
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(_Enhanced: new (...args: any[]) => unknown, _original: new (...args: any[]) => unknown): void {
    createRouter(this.routes, this.options);
  }
}

// Dual-purpose: @Router([routes], options?) as class decorator, @Router() as field decorator.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Router(routes?: Array<RouteDefinition | (new (...args: any[]) => any)>, options?: RouterOptions): any {
  if (Array.isArray(routes)) {
    const normalizedRoutes = routes.map(normalizeRoute);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClassDecorator(new RouterBehavior(normalizedRoutes, options)) as unknown as (cls: new (...args: any[]) => any, ctx: ClassDecoratorContext) => void;
  }
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useRouter(); },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

// ── @Lazy ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Lazy(loader: () => Promise<{ default: new (...args: any[]) => any }>): any {
  const lazyComp = lazy(loader);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.assign((...args: any[]) => args.length > 0 ? lazyComp : loader(), {
    __isLazy: true as const,
  });
}

// ── Field decorators ──────────────────────────────────────────────────────────

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

export function InjectLayout() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useRouter().currentLayout; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

export function Meta() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get() { return useMeta(); },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

export type { RouteDefinition, RouterOptions };
