import type { Computed, Signal } from "@praxisjs/shared";

import type { RouteParamsInternal, RouteQueryInternal, RouteLocationInternal, RouteComponent } from "./types/route";

export type RouteParams = Computed<RouteParamsInternal>;
export type RouteQuery = Computed<RouteQueryInternal>;
export type RouteLocation = Signal<RouteLocationInternal>;
export type LayoutInstance = Signal<RouteComponent | null>;

export { RouterInstance } from "./router";
export type {
  RouteDefinition,
  RouteComponent,
  LazyRouteComponent,
} from "./types/route";

export { RouterView, RouterOutlet, Link } from "./components";
export { Route, Router, Lazy, Params, Query, Location, InjectLayout } from "./decorators";
