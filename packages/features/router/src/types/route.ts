export type RouteParamsInternal = Record<string, string>;
export type RouteQueryInternal = Record<string, string>;
export type RouteMeta = Record<string, unknown>;

export interface RouteLocationInternal {
  path: string;
  params: RouteParamsInternal;
  query: RouteQueryInternal;
  hash: string;
  name: string | undefined;
  meta: RouteMeta;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteComponent = new (...args: any[]) => any;

export interface LazyRouteComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (): Promise<{ default: new (...args: any[]) => any }>;
  readonly __isLazy: true;
}

export interface RouteDefinition {
  path: string;
  name?: string;
  meta?: RouteMeta;
  component: RouteComponent | LazyRouteComponent;
  layout?: RouteComponent | LazyRouteComponent;
  children?: RouteDefinition[];
  beforeEnter?: (
    to: RouteLocationInternal,
    from: RouteLocationInternal | null,
  ) => boolean | string | Promise<boolean | string>;
  afterEnter?: (
    to: RouteLocationInternal,
    from: RouteLocationInternal | null,
  ) => void;
}

export interface CompiledRoute {
  definition: RouteDefinition;
  fullPath: string;
  regex: RegExp;
  paramNames: string[];
  layout?: RouteComponent | LazyRouteComponent;
}

export interface NamedNavigationTarget {
  name: string;
  params?: RouteParamsInternal;
  query?: RouteQueryInternal;
  hash?: string;
}

export type NavigationInput = string | NamedNavigationTarget;

/** Saved scroll coordinates passed to `scrollBehavior` on back/forward navigation. */
export interface SavedScrollPosition {
  top: number;
  left: number;
}

/** The value returned by `scrollBehavior`. Return `false` to skip scrolling. */
export type ScrollPosition =
  | { top?: number; left?: number }
  | { el: string | Element }
  | false;

export type ScrollBehavior = (
  to: RouteLocationInternal,
  from: RouteLocationInternal | null,
  savedPosition: SavedScrollPosition | null,
) => ScrollPosition | Promise<ScrollPosition>;

export interface RouterOptions {
  scrollBehavior?: ScrollBehavior;
}
