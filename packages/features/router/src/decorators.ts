import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
  addClaimableInitializer,
  assertFieldContext,
} from "@praxisjs/decorators";

import { createRouter, useRouter, lazy, useMeta } from "./router";

import type { RouteDefinition, RouterOptions, RouteMeta } from "./types/route";

// ── @Route ────────────────────────────────────────────────────────────────────

export interface RouteOptions {
  path: string;
  name?: string;
  meta?: RouteMeta;
}

function defineStatic(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, writable: false, configurable: false });
}

// Only static metadata for `normalizeRoute`: the class is returned as is, without the per-instance
// subclass a ClassBehavior would add.
export function Route(options: string | RouteOptions) {
  const normalized: RouteOptions = typeof options === "string" ? { path: options } : options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <C extends new (...args: any[]) => any>(value: C, _context: ClassDecoratorContext): C {
    defineStatic(value, "__routePath", normalized.path);
    if (normalized.name !== undefined) defineStatic(value, "__routeName", normalized.name);
    if (normalized.meta !== undefined) defineStatic(value, "__routeMeta", normalized.meta);
    return value;
  };
}

// ── Shared field accessors ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouterFieldDecorator = (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;

// One read-only accessor per kind of field, shared by every instance of every class using it.
function readOnly(get: () => unknown): PropertyDescriptor {
  return {
    get,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    set(): void {},
    enumerable: true,
    configurable: true,
  };
}

const routerDescriptor = readOnly(() => useRouter());
const paramsDescriptor = readOnly(() => useRouter().params);
const queryDescriptor = readOnly(() => useRouter().query);
const locationDescriptor = readOnly(() => useRouter().location);
const layoutDescriptor = readOnly(() => useRouter().currentLayout);
const metaDescriptor = readOnly(() => useMeta());

function routerField(descriptor: PropertyDescriptor): RouterFieldDecorator {
  return function (_value, context) {
    assertFieldContext(context);
    const name = context.name;
    addClaimableInitializer(context, function () {
      Object.defineProperty(this, name, descriptor);
    });
  };
}

// ── @Router ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRoute(entry: RouteDefinition | (new (...args: any[]) => any)): RouteDefinition {
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
  return routerField(routerDescriptor);
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

export function Params(): RouterFieldDecorator {
  return routerField(paramsDescriptor);
}

export function Query(): RouterFieldDecorator {
  return routerField(queryDescriptor);
}

export function Location(): RouterFieldDecorator {
  return routerField(locationDescriptor);
}

export function InjectLayout(): RouterFieldDecorator {
  return routerField(layoutDescriptor);
}

export function Meta(): RouterFieldDecorator {
  return routerField(metaDescriptor);
}

export type { RouteDefinition, RouterOptions };
