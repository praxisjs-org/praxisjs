export type RouteParamsInternal = Record<string, string>;
export type RouteQueryInternal = Record<string, string>;

export interface RouteLocationInternal {
  path: string;
  params: RouteParamsInternal;
  query: RouteQueryInternal;
  hash: string;
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
  component: RouteComponent | LazyRouteComponent;
  layout?: RouteComponent | LazyRouteComponent;
  children?: RouteDefinition[];
  beforeEnter?: (
    to: RouteLocationInternal,
    from: RouteLocationInternal | null,
  ) => boolean | string | Promise<boolean | string>;
}

export interface CompiledRoute {
  definition: RouteDefinition;
  regex: RegExp;
  paramNames: string[];
  layout?: RouteComponent | LazyRouteComponent;
}
