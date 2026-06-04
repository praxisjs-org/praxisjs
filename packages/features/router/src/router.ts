import { computed, signal } from "@praxisjs/core/internal";
import type { Signal, Computed } from "@praxisjs/shared";

import { compilePath, parseQuery } from "./utils";

import type {
  CompiledRoute,
  LazyRouteComponent,
  NamedNavigationTarget,
  NavigationInput,
  RouteComponent,
  RouteDefinition,
  RouteLocationInternal,
  RouteMeta,
  RouterOptions,
  RouteParamsInternal,
  RouteQueryInternal,
  SavedScrollPosition,
} from "./types/route";

type AfterEachHandler = (to: RouteLocationInternal, from: RouteLocationInternal | null) => void;

// Keys used to persist scroll position in history.state without colliding with app state.
const STATE_SX = "__praxis_sx";
const STATE_SY = "__praxis_sy";

export class RouterInstance {
  private readonly compiled: CompiledRoute[] = [];
  private readonly _nameMap = new Map<string, CompiledRoute>();
  private readonly _location: Signal<RouteLocationInternal>;
  private _prevLocation: RouteLocationInternal | null = null;
  private readonly _component: Signal<RouteComponent | null>;
  private readonly _layout: Signal<RouteComponent | null>;
  private readonly _loading: Signal<boolean>;
  private _navSeq = 0;
  private readonly _resolvedComponents = new Map<LazyRouteComponent, RouteComponent>();
  private readonly _resolvedLayouts = new Map<LazyRouteComponent, RouteComponent>();
  private readonly _afterEachHandlers: AfterEachHandler[] = [];
  private readonly _scrollBehavior: RouterOptions["scrollBehavior"];

  readonly location: Signal<RouteLocationInternal>;
  readonly currentComponent: Signal<RouteComponent | null>;
  readonly currentLayout: Signal<RouteComponent | null>;
  readonly loading: Signal<boolean>;
  readonly params: Computed<RouteParamsInternal>;
  readonly query: Computed<RouteQueryInternal>;
  readonly meta: Computed<RouteMeta>;

  constructor(routes: RouteDefinition[], options: RouterOptions = {}) {
    this._scrollBehavior = options.scrollBehavior;

    for (const route of routes) {
      this.addRoute(route);
    }

    const initial = this.buildLocation(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    this._location = signal(initial);
    this._loading = signal(false);
    this._component = signal<RouteComponent | null>(null);
    this._layout = signal<RouteComponent | null>(null);

    this.location = this._location;
    this.currentComponent = this._component;
    this.currentLayout = this._layout;
    this.loading = this._loading;

    this.params = computed(() => this._location().params);
    this.query = computed(() => this._location().query);
    this.meta = computed(() => this._location().meta);

    void this.resolveAndSetComponent(initial.path);

    window.addEventListener("popstate", () => {
      void this.syncFromBrowser();
    });
  }

  private addRoute(
    route: RouteDefinition,
    prefix = "",
    inheritedLayout?: RouteComponent | LazyRouteComponent,
  ): void {
    const fullPath = prefix + route.path;
    const { regex, paramNames } = compilePath(fullPath);
    const effectiveLayout = route.layout ?? inheritedLayout;
    const compiled: CompiledRoute = { definition: route, fullPath, regex, paramNames, layout: effectiveLayout };
    this.compiled.push(compiled);
    if (route.name) this._nameMap.set(route.name, compiled);

    if (route.children) {
      for (const child of route.children) {
        this.addRoute(child, fullPath === "/" ? "" : fullPath, route.component);
      }
    }
  }

  private matchRoute(path: string): CompiledRoute | undefined {
    return this.compiled.find((r) => r.regex.test(path));
  }

  private buildLocation(
    pathname: string,
    search: string,
    hash: string,
  ): RouteLocationInternal {
    const matched = this.matchRoute(pathname);
    const params: RouteParamsInternal = {};
    if (matched) {
      const m = matched.regex.exec(pathname) as RegExpExecArray;
      matched.paramNames.forEach((name, i) => {
        params[name] = m[i + 1] ?? "";
      });
    }
    return {
      path: pathname,
      params,
      query: parseQuery(search),
      hash: hash.replace("#", ""),
      name: matched?.definition.name,
      meta: matched?.definition.meta ?? {},
    };
  }

  private isLazy(c: RouteComponent | LazyRouteComponent): c is LazyRouteComponent {
    return "__isLazy" in c && c.__isLazy;
  }

  private async resolveComponent(path: string): Promise<RouteComponent | null> {
    for (const route of this.compiled) {
      if (!route.regex.test(path)) continue;
      const { component } = route.definition;
      if (!this.isLazy(component)) return component;

      const cached = this._resolvedComponents.get(component);
      if (cached) return cached;

      this._loading.set(true);
      try {
        const mod = await component();
        this._resolvedComponents.set(component, mod.default);
        return mod.default;
      } finally {
        this._loading.set(false);
      }
    }
    return null;
  }

  private async resolveLayout(layout: RouteComponent | LazyRouteComponent): Promise<RouteComponent> {
    if (!this.isLazy(layout)) return layout;
    const cached = this._resolvedLayouts.get(layout);
    if (cached) return cached;
    const mod = await layout();
    this._resolvedLayouts.set(layout, mod.default);
    return mod.default;
  }

  private async resolveLayoutForPath(path: string): Promise<RouteComponent | null> {
    for (const route of this.compiled) {
      if (!route.regex.test(path)) continue;
      if (!route.layout) return null;
      return this.resolveLayout(route.layout);
    }
    return null;
  }

  private async resolveAndSetComponent(path: string): Promise<void> {
    const seq = ++this._navSeq;
    const component = await this.resolveComponent(path);
    if (seq !== this._navSeq) return;
    this._component.set(component);
    const layout = await this.resolveLayoutForPath(path);
    if (seq !== this._navSeq) return;
    this._layout.set(layout);
  }

  private runAfterHooks(to: RouteLocationInternal, from: RouteLocationInternal | null): void {
    const matched = this.matchRoute(to.path);
    matched?.definition.afterEnter?.(to, from);
    for (const handler of this._afterEachHandlers) {
      handler(to, from);
    }
  }

  private saveCurrentScrollPosition(): void {
    const current = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.replaceState(
      { ...current, [STATE_SX]: window.scrollX, [STATE_SY]: window.scrollY },
      "",
    );
  }

  private async applyScroll(
    to: RouteLocationInternal,
    from: RouteLocationInternal | null,
    savedPosition: SavedScrollPosition | null,
  ): Promise<void> {
    if (!this._scrollBehavior) return;
    // One microtask lets PraxisJS flush reactive effects so the newly-mounted
    // component is in the DOM before scrollBehavior queries hash targets.
    await Promise.resolve();
    const target = await this._scrollBehavior(to, from, savedPosition);
    if (target === false) return;
    if ("el" in target) {
      const el =
        typeof target.el === "string"
          ? document.querySelector(target.el)
          : target.el;
      if (el instanceof Element) {
        el.scrollIntoView();
      }
    } else {
      window.scrollTo(target.left ?? 0, target.top ?? 0);
    }
  }

  private readSavedScrollPosition(): SavedScrollPosition | null {
    const state = (window.history.state ?? {}) as Record<string, unknown>;
    const sx = state[STATE_SX];
    const sy = state[STATE_SY];
    return typeof sx === "number" && typeof sy === "number"
      ? { left: sx, top: sy }
      : null;
  }

  private async syncFromBrowser(): Promise<void> {
    const savedPosition = this.readSavedScrollPosition();
    const from = this._location();
    const loc = this.buildLocation(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    this._location.set(loc);
    await this.resolveAndSetComponent(loc.path);
    this.runAfterHooks(loc, from);
    await this.applyScroll(loc, from, savedPosition);
  }

  /**
   * Register a handler called after every completed navigation.
   * Returns an unregister function.
   */
  afterEach(handler: AfterEachHandler): () => void {
    this._afterEachHandlers.push(handler);
    return () => {
      const idx = this._afterEachHandlers.indexOf(handler);
      if (idx !== -1) this._afterEachHandlers.splice(idx, 1);
    };
  }

  /** Resolve a named navigation target to a path string. */
  resolvePath(target: NamedNavigationTarget): string {
    const route = this._nameMap.get(target.name);
    if (!route) {
      throw new Error(`[Router] No route with name "${target.name}".`);
    }
    const params = target.params ?? {};
    return route.fullPath.replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)\??/g,
      (_, n: string) => params[n] ?? "",
    );
  }

  async push(target: NavigationInput, query?: RouteQueryInternal, hash?: string, _redirectDepth = 0): Promise<void> {
    if (_redirectDepth > 10) {
      const displayPath = typeof target === "string" ? target : target.name;
      console.warn(`[Router] Maximum redirect depth exceeded navigating to "${displayPath}"`);
      return;
    }

    let path: string;
    let effectiveQuery = query;
    let effectiveHash = hash;

    if (typeof target !== "string") {
      path = this.resolvePath(target);
      effectiveQuery = target.query ?? query;
      effectiveHash = target.hash ?? hash;
    } else {
      path = target;
    }

    // Extract an inline hash fragment from the path string (e.g. "/article#section")
    // when no separate hash argument was provided.
    if (!effectiveHash) {
      const hashIdx = path.indexOf("#");
      if (hashIdx !== -1) {
        effectiveHash = path.slice(hashIdx + 1);
        path = path.slice(0, hashIdx);
      }
    }

    const search = effectiveQuery ? "?" + new URLSearchParams(effectiveQuery).toString() : "";
    const hashStr = effectiveHash ? `#${effectiveHash}` : "";
    const fullUrl = path + search + hashStr;

    const loc = this.buildLocation(path, search, hashStr);

    // Save scroll position of the page we are leaving before the guard runs,
    // so it's preserved even when beforeEnter triggers a redirect.
    if (_redirectDepth === 0) this.saveCurrentScrollPosition();

    const matched = this.compiled.find((r) => r.regex.test(path));
    if (matched?.definition.beforeEnter) {
      const result = await matched.definition.beforeEnter(loc, this._prevLocation);
      if (result === false) return;
      if (typeof result === "string") {
        return this.push(result, undefined, undefined, _redirectDepth + 1);
      }
    }

    const from = this._location();
    this._prevLocation = from;
    window.history.pushState(null, "", fullUrl);
    this._location.set(loc);
    await this.resolveAndSetComponent(path);
    this.runAfterHooks(loc, from);
    await this.applyScroll(loc, from, null);
  }

  async replace(target: NavigationInput, query?: RouteQueryInternal): Promise<void> {
    let path: string;
    let effectiveQuery = query;

    let effectiveHash: string | undefined;

    if (typeof target !== "string") {
      path = this.resolvePath(target);
      effectiveQuery = target.query ?? query;
      effectiveHash = target.hash;
    } else {
      path = target;
    }

    // Extract an inline hash fragment from the path string.
    if (!effectiveHash) {
      const hashIdx = path.indexOf("#");
      if (hashIdx !== -1) {
        effectiveHash = path.slice(hashIdx + 1);
        path = path.slice(0, hashIdx);
      }
    }

    const search = effectiveQuery ? "?" + new URLSearchParams(effectiveQuery).toString() : "";
    const hashStr = effectiveHash ? `#${effectiveHash}` : "";
    const loc = this.buildLocation(path, search, hashStr);

    const from = this._location();
    this._prevLocation = from;
    window.history.replaceState(null, "", path + search + hashStr);
    this._location.set(loc);
    await this.resolveAndSetComponent(path);
    this.runAfterHooks(loc, from);
    await this.applyScroll(loc, from, null);
  }

  back(): void {
    window.history.back();
  }
  forward(): void {
    window.history.forward();
  }

  go(delta: number): void {
    window.history.go(delta);
  }
}

let _router: RouterInstance | null = null;

export function lazy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: new (...args: any[]) => any }>,
): LazyRouteComponent {
  return Object.assign(() => loader(), { __isLazy: true as const });
}

export function createRouter(routes: RouteDefinition[], options?: RouterOptions): RouterInstance {
  _router = new RouterInstance(routes, options);
  return _router;
}

export function useRouter(): RouterInstance {
  if (!_router) throw new Error("[Router] createRouter() was not called.");
  return _router;
}

export function useParams(): Computed<RouteParamsInternal> {
  return useRouter().params;
}

export function useQuery(): Computed<RouteQueryInternal> {
  return useRouter().query;
}

export function useLocation(): Signal<RouteLocationInternal> {
  return useRouter().location;
}

export function useMeta(): Computed<RouteMeta> {
  return useRouter().meta;
}
