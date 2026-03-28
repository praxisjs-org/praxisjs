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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return decorator as unknown as (value: new (...args: any[]) => any, context: ClassDecoratorContext) => void;
}

// ── @RouterConfig ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRoute(entry: RouteDefinition | (new (...args: any[]) => any)): RouteDefinition {
  if (typeof entry === "function" && "__routePath" in entry) {
    return { path: (entry as { __routePath: string }).__routePath, component: entry };
  }
  return entry as RouteDefinition;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RouterConfig(routes: Array<RouteDefinition | (new (...args: any[]) => any)>): (cls: new (...args: any[]) => any, ctx: ClassDecoratorContext) => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function(cls: new (...args: any[]) => any, _ctx: ClassDecoratorContext) {
    createRouter(routes.map(normalizeRoute));
    return cls;
  };
}

// ── @Lazy ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Lazy(loader: () => Promise<{ default: new (...args: any[]) => any }>): any {
  const lazyComp = lazy(loader);
  // Dual-purpose: works inline in route definitions (0 args) and as a class decorator (2 args).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.assign((...args: any[]) => args.length > 0 ? lazyComp : loader(), {
    __isLazy: true as const,
  });
}

// ── Field decorators ──────────────────────────────────────────────────────────

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

export type { RouteDefinition, RouteLocation, RouteParams, RouteQuery };
