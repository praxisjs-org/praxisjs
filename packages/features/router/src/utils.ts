import type { RouteQueryInternal } from "./types/route";

export function compilePath(path: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const paramNames: string[] = [];

  // /users/:id/posts/:postId  → /users/([^/]+)/posts/([^/]+)
  // /users/:id?               → /users/([^/]+)?  (optional segment)
  // /docs/**                  → /docs/(.*)
  const regexStr = path
    .replace(/\*\*/g, "(.*)")
    .replace(/:([^/?]+)(\?)?/g, (_: string, name: string, optional: string | undefined) => {
      paramNames.push(name);
      return optional ? "([^/]+)?" : "([^/]+)";
    });

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

export function parseQuery(search: string): RouteQueryInternal {
  const query: RouteQueryInternal = {};
  if (!search || search === "?") return query;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}
