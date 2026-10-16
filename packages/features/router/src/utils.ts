import type { RouteQueryInternal } from "./types/route";

const TOKEN_RE = /\*\*|:([^/?]+)(\?)?/g;
const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(literal: string): string {
  return literal.replace(REGEX_SPECIAL_RE, "\\$&");
}

export function compilePath(path: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const paramNames: string[] = [];

  // /users/:id/posts/:postId  → /users/([^/]+)/posts/([^/]+)
  // /users/:id?               → /users/([^/]+)?  (optional segment)
  // /docs/**                  → /docs/(.*)
  // Everything else is literal, so a `.` or `(` in a path never acts as regex syntax.
  let source = "";
  let last = 0;
  for (const match of path.matchAll(TOKEN_RE)) {
    source += escapeRegex(path.slice(last, match.index));
    const name = match[1] as string | undefined;
    if (name === undefined) {
      source += "(.*)";
    } else {
      paramNames.push(name);
      source += match[2] ? "([^/]+)?" : "([^/]+)";
    }
    last = match.index + match[0].length;
  }
  source += escapeRegex(path.slice(last));

  return {
    regex: new RegExp(`^${source}$`),
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
