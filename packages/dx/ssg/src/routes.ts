import type { RouteComponent, RouteDefinition } from "@praxisjs/router";
import { normalizeRoute } from "@praxisjs/router/internal";

/** Expands the one dynamic route it's declared on into concrete paths — colocated alternative to the global `getStaticPaths` export on `root`. Takes precedence over it for that route. Receives the route's own full path, so helpers like `@praxisjs/content`'s `collectionStaticPaths()` don't need it repeated. */
export type RouteStaticPaths = (fullPath: string) => Promise<string[]>;

/** Same shape `@Router([...])` itself accepts — a plain RouteDefinition (optionally with its own `getStaticPaths`) or a bare @Route-decorated class. */
export type RouteEntry = (RouteDefinition & { getStaticPaths?: RouteStaticPaths }) | RouteComponent;

/** Normalizes top-level route entries the same way the `@Router` decorator does, before passing them to `createRouter`. */
export function normalizeRoutes(routes: RouteEntry[]): RouteDefinition[] {
  return routes.map(normalizeRoute);
}

export interface FlattenedRoute {
  route: RouteDefinition;
  fullPath: string;
}

/** Mirrors RouterInstance's own path-prefixing in @praxisjs/router (router.ts's addRoute). */
export function flattenRoutes(routes: RouteDefinition[], prefix = ""): FlattenedRoute[] {
  const out: FlattenedRoute[] = [];
  for (const route of routes) {
    const fullPath = prefix + route.path;
    out.push({ route, fullPath });
    if (route.children) {
      out.push(...flattenRoutes(route.children, fullPath === "/" ? "" : fullPath));
    }
  }
  return out;
}

// Matches the same segment shapes @praxisjs/router's compilePath() does (utils.ts):
// ":name", ":name?" (optional param), "**" (catch-all).
const DYNAMIC_SEGMENT = /:[^/?]+\??|\*\*/;

export function isStaticPath(path: string): boolean {
  return !DYNAMIC_SEGMENT.test(path);
}

export type GetStaticPaths = (route: RouteDefinition, fullPath: string) => Promise<string[]>;

export interface ResolvePathsConfig {
  routes: RouteDefinition[];
  getStaticPaths?: GetStaticPaths;
}

/**
 * Resolves every concrete path to prerender: static routes are used as-is;
 * dynamic routes (`:slug`, `**`) are expanded via the route's own
 * `getStaticPaths` if it declared one, falling back to the global
 * `getStaticPaths` — otherwise they're skipped (documented: nothing to
 * enumerate without either).
 */
export async function resolvePaths(config: ResolvePathsConfig): Promise<string[]> {
  const flattened = flattenRoutes(config.routes);
  const paths = new Set<string>();

  for (const { route, fullPath } of flattened) {
    if (isStaticPath(fullPath)) {
      paths.add(fullPath);
      continue;
    }
    // normalizeRoute() passes plain route-literal objects through unchanged,
    // so this survives even though RouteDefinition itself doesn't declare it.
    const ownStaticPaths = (route as { getStaticPaths?: RouteStaticPaths }).getStaticPaths;
    const expanded = ownStaticPaths
      ? await ownStaticPaths(fullPath)
      : config.getStaticPaths
        ? await config.getStaticPaths(route, fullPath)
        : undefined;
    if (!expanded) continue;
    for (const p of expanded) paths.add(p);
  }

  return Array.from(paths);
}

/** `/` -> `index.html`; `/about` -> `about/index.html`; trailing-slash convention. */
export function pathToOutputFile(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "index.html" : `${trimmed}/index.html`;
}
