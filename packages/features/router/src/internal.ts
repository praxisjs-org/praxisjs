export type {
  RouteLocationInternal,
  RouteParamsInternal,
  RouteQueryInternal,
  RouteMeta,
  CompiledRoute,
} from "./types/route";
// `createRouter` is already public within this package (used by the `@Router`
// decorator); exposed here for `@praxisjs/ssg`'s prerender runner, which needs
// to rebind the router to a fresh `window.location` before each route — the
// `@Router([...])` class decorator only calls it once, at first module import.
export { createRouter } from "./router";
// `@Router([...])` accepts a mix of plain RouteDefinition objects and bare
// @Route-decorated component classes; `@praxisjs/ssg` needs routes in the
// same shape apps already write, so it normalizes them the same way here
// instead of requiring a separately-maintained, RouteDefinition-only list.
export { normalizeRoute } from "./decorators";
