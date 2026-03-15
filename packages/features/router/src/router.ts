import { computed, signal } from "@praxisjs/core/internal";
import type { Signal, Computed } from "@praxisjs/shared";

import { compilePath, parseQuery } from "./utils";

import type {
  CompiledRoute,
  LazyRouteComponent,
  RouteComponent,
  RouteDefinition,
  RouteLocation,
  RouteParams,
  RouteQuery,
} from "./types/route";

export class Router {
  private readonly compiled: CompiledRoute[] = [];
  private readonly _location: Signal<RouteLocation>;
  private _prevLocation: RouteLocation | null = null;
  private readonly _component: Signal<RouteComponent | null>;
  private readonly _loading: Signal<boolean>;
  private readonly _resolvedComponents = new Map<
    LazyRouteComponent,
    RouteComponent
  >();

  readonly location: Signal<RouteLocation>;
  readonly currentComponent: Signal<RouteComponent | null>;
  readonly loading: Signal<boolean>;
  readonly params: Computed<RouteParams>;
  readonly query: Computed<RouteQuery>;

  constructor(routes: RouteDefinition[]) {
    for (const route of routes) {
      this.addRoute(route);
    }

    const initial = this.buildLocation(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    this._location = signal<RouteLocation>(initial);
    this._loading = signal<boolean>(false);
    this._component = signal<RouteComponent | null>(null);

    this.location = this._location;
    this.currentComponent = this._component;
    this.loading = this._loading;

    this.params = computed(() => this._location().params);
    this.query = computed(() => this._location().query);

    void this.resolveAndSetComponent(initial.path);

    window.addEventListener("popstate", () => {
      void this.syncFromBrowser();
    });
  }

  private addRoute(route: RouteDefinition, prefix = ""): void {
    const fullPath = prefix + route.path;
    const { regex, paramNames } = compilePath(fullPath);
    this.compiled.push({ definition: route, regex, paramNames });

    if (route.children) {
      for (const child of route.children) {
        this.addRoute(child, fullPath === "/" ? "" : fullPath);
      }
    }
  }

  private buildLocation(
    pathname: string,
    search: string,
    hash: string,
  ): RouteLocation {
    const params = this.matchParams(pathname);
    return {
      path: pathname,
      params,
      query: parseQuery(search),
      hash: hash.replace("#", ""),
    };
  }

  private matchParams(path: string): RouteParams {
    for (const route of this.compiled) {
      const match = route.regex.exec(path);
      if (!match) continue;
      const params: RouteParams = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1] ?? "";
      });
      return params;
    }
    return {};
  }

  private isLazy(
    c: RouteComponent | LazyRouteComponent,
  ): c is LazyRouteComponent {
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

  private async resolveAndSetComponent(path: string): Promise<void> {
    const component = await this.resolveComponent(path);
    this._component.set(component);
  }

  private async syncFromBrowser(): Promise<void> {
    const loc = this.buildLocation(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    this._location.set(loc);
    await this.resolveAndSetComponent(loc.path);
  }

  async push(path: string, query?: RouteQuery, hash?: string, _redirectDepth = 0): Promise<void> {
    if (_redirectDepth > 10) {
      console.warn(`[Router] Maximum redirect depth exceeded navigating to "${path}"`);
      return;
    }

    const search = query ? "?" + new URLSearchParams(query).toString() : "";
    const hashStr = hash ? `#${hash}` : "";
    const fullUrl = path + search + hashStr;

    const loc = this.buildLocation(path, search, hashStr);

    const matched = this.compiled.find((r) => r.regex.test(path));
    if (matched?.definition.beforeEnter) {
      const result = await matched.definition.beforeEnter(
        loc,
        this._prevLocation,
      );
      if (result === false) return;
      if (typeof result === "string") {
        return this.push(result, undefined, undefined, _redirectDepth + 1);
      }
    }

    this._prevLocation = this._location();
    window.history.pushState(null, "", fullUrl);
    this._location.set(loc);
    await this.resolveAndSetComponent(path);
  }

  async replace(path: string, query?: RouteQuery): Promise<void> {
    const search = query ? "?" + new URLSearchParams(query).toString() : "";
    const loc = this.buildLocation(path, search, "");

    this._prevLocation = this._location();
    window.history.replaceState(null, "", path + search);
    this._location.set(loc);
    await this.resolveAndSetComponent(path);
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

let _router: Router | null = null;

export function lazy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: new (...args: any[]) => any }>,
): LazyRouteComponent {
  return Object.assign(() => loader(), { __isLazy: true as const });
}

export function createRouter(routes: RouteDefinition[]): Router {
  _router = new Router(routes);
  return _router;
}

export function useRouter(): Router {
  if (!_router) throw new Error("[Router] createRouter() was not called.");
  return _router;
}

export function useParams(): Computed<RouteParams> {
  return useRouter().params;
}

export function useQuery(): Computed<RouteQuery> {
  return useRouter().query;
}

export function useLocation(): Signal<RouteLocation> {
  return useRouter().location;
}
