import { batch, computed, selector, signal, trackPendingResource, type Selector } from "@praxisjs/core/internal";
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
  // Static paths are looked up by key; only routes with params or `**` need a regex scan.
  private readonly _staticIndex = new Map<string, number>();
  private readonly _dynamic: Array<{ index: number; route: CompiledRoute }> = [];
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
  private _lastMatchPath: string | undefined;
  private _lastMatch: CompiledRoute | undefined;
  private _lastExec: RegExpExecArray | null = null;
  private readonly _scrollBehavior: RouterOptions["scrollBehavior"];
  private _activePath: Selector<string> | undefined;
  private readonly _onPopState = (): void => {
    void this.syncFromBrowser();
  };

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

    // Tracked as a pending resource so an SSG prerender pass's
    // flushPendingResources() waits for lazy route/layout components to
    // resolve before serializing — otherwise the nested Vite server can
    // close (or move on to the next page) while this is still awaiting a
    // dynamic import, turning a routine navigation into an unhandled
    // rejection against an already-closed module runner. No-op on the client.
    trackPendingResource(this.resolveAndSetComponent(initial.path));

    window.addEventListener("popstate", this._onPopState);
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
    const index = this.compiled.push(compiled) - 1;
    if (paramNames.length === 0 && !fullPath.includes("**")) {
      if (!this._staticIndex.has(fullPath)) this._staticIndex.set(fullPath, index);
    } else {
      this._dynamic.push({ index, route: compiled });
    }
    if (route.name) this._nameMap.set(route.name, compiled);

    if (route.children) {
      for (const child of route.children) {
        this.addRoute(child, fullPath === "/" ? "" : fullPath, route.component);
      }
    }
  }

  // A navigation matches the same path several times (location, component, layout, hooks); the
  // lookup runs once per path instead. Declaration order still decides: a dynamic route declared
  // before an identical static one wins, so only dynamic routes ahead of the static hit are tried.
  private matchRoute(path: string): CompiledRoute | undefined {
    if (path === this._lastMatchPath) return this._lastMatch;
    const staticIndex = this._staticIndex.get(path) ?? this.compiled.length;
    let match: CompiledRoute | undefined = this.compiled[staticIndex] as CompiledRoute | undefined;
    let exec: RegExpExecArray | null = null;
    for (const entry of this._dynamic) {
      if (entry.index > staticIndex) break;
      exec = entry.route.regex.exec(path);
      if (exec !== null) {
        match = entry.route;
        break;
      }
    }
    this._lastMatchPath = path;
    this._lastMatch = match;
    this._lastExec = exec;
    return match;
  }

  private buildLocation(
    pathname: string,
    search: string,
    hash: string,
  ): RouteLocationInternal {
    const matched = this.matchRoute(pathname);
    const params: RouteParamsInternal = {};
    const exec = this._lastExec;
    if (matched && exec !== null) {
      const { paramNames } = matched;
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = exec[i + 1] ?? "";
      }
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

  private async resolveComponent(route: CompiledRoute): Promise<RouteComponent> {
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

  private async resolveLayout(layout: RouteComponent | LazyRouteComponent): Promise<RouteComponent> {
    if (!this.isLazy(layout)) return layout;
    const cached = this._resolvedLayouts.get(layout);
    if (cached) return cached;
    const mod = await layout();
    this._resolvedLayouts.set(layout, mod.default);
    return mod.default;
  }

  // Component and layout when neither needs a network round-trip (plain components, or lazy ones
  // already loaded) — lets navigation apply them with no microtask gap.
  private resolveSync(route: CompiledRoute): { component: RouteComponent; layout: RouteComponent | null } | undefined {
    const { component } = route.definition;
    const resolved = this.isLazy(component) ? this._resolvedComponents.get(component) : component;
    if (!resolved) return undefined;

    if (!route.layout) return { component: resolved, layout: null };
    const resolvedLayout = this.isLazy(route.layout) ? this._resolvedLayouts.get(route.layout) : route.layout;
    return resolvedLayout ? { component: resolved, layout: resolvedLayout } : undefined;
  }

  // Component and layout are resolved concurrently (two lazy chunks no longer load one after the
  // other) and applied together, so RouterView rebuilds the page once with a consistent pair
  // instead of showing the page without its layout first.
  private async resolveAndSetComponent(path: string): Promise<void> {
    const seq = ++this._navSeq;

    const route = this.matchRoute(path);
    if (!route) {
      batch(() => {
        this._component.set(null);
        this._layout.set(null);
      });
      return;
    }

    const ready = this.resolveSync(route);
    if (ready) {
      batch(() => {
        this._component.set(ready.component);
        this._layout.set(ready.layout);
      });
      return;
    }

    const layoutResult = (route.layout ? this.resolveLayout(route.layout) : Promise.resolve(null)).then(
      (layout) => ({ layout, error: undefined as unknown, failed: false }),
      (error: unknown) => ({ layout: null, error, failed: true }),
    );
    const component = await this.resolveComponent(route);
    const { layout, error, failed } = await layoutResult;
    if (seq !== this._navSeq) return;
    batch(() => {
      this._component.set(component);
      if (!failed) this._layout.set(layout);
    });
    // The page is already shown; a layout that failed to load is still reported to the caller.
    if (failed) throw error;
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

  /**
   * Whether `path` is the current location's path. Reactive: inside an effect it re-runs only when
   * this path becomes or stops being the current one, not on every navigation.
   */
  isActive(path: string): boolean {
    this._activePath ??= selector(() => this._location().path);
    return this._activePath(path);
  }

  /** Stops listening to browser history. `createRouter()` calls it on the router it replaces. */
  destroy(): void {
    window.removeEventListener("popstate", this._onPopState);
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

  private resolveTarget(
    target: NavigationInput,
    query: RouteQueryInternal | undefined,
    hash: string | undefined,
  ): { path: string; search: string; hashStr: string } {
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

    return {
      path,
      search: effectiveQuery ? "?" + new URLSearchParams(effectiveQuery).toString() : "",
      hashStr: effectiveHash ? `#${effectiveHash}` : "",
    };
  }

  async push(target: NavigationInput, query?: RouteQueryInternal, hash?: string, _redirectDepth = 0): Promise<void> {
    if (_redirectDepth > 10) {
      const displayPath = typeof target === "string" ? target : target.name;
      console.warn(`[Router] Maximum redirect depth exceeded navigating to "${displayPath}"`);
      return;
    }

    const { path, search, hashStr } = this.resolveTarget(target, query, hash);
    const fullUrl = path + search + hashStr;

    const loc = this.buildLocation(path, search, hashStr);

    // Save scroll position of the page we are leaving before the guard runs,
    // so it's preserved even when beforeEnter triggers a redirect.
    if (_redirectDepth === 0) this.saveCurrentScrollPosition();

    const matched = this.matchRoute(path);
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
    const { path, search, hashStr } = this.resolveTarget(target, query, undefined);
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
  _router?.destroy();
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
