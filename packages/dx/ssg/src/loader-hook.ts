import type { ResolveFnOutput, ResolveHookContext } from "node:module";

// Loaded as a standalone hook module via module.register() (see register.ts)
// — only used as a fallback on Node versions without the newer, in-thread
// module.registerHooks() API, so it must have zero relative imports of its
// own: this file needs to work *before* the extensionless-import problem it
// exists to fix has been worked around. See register.ts for the full story.
//
// Every other @praxisjs/* package is built with tsc, which emits relative
// specifiers exactly as written in source ("./router", not "./router.js") —
// harmless for every consumer so far, since they're all resolved through a
// bundler (Vite/esbuild/rollup), which resolves extensionless specifiers
// fine. Node's own ESM resolver does not: it's spec-strict and requires an
// explicit extension on relative specifiers. This hook retries with ".js" /
// "/index.js" on the two failure modes that produces.
const RETRYABLE_CODES = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);

type NextResolve = (
  specifier: string,
  context?: Partial<ResolveHookContext>,
) => ResolveFnOutput | Promise<ResolveFnOutput>;

export async function resolve(
  specifier: string,
  context: ResolveHookContext,
  nextResolve: NextResolve,
): Promise<ResolveFnOutput> {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && code !== undefined && RETRYABLE_CODES.has(code)) {
      for (const candidate of [`${specifier}.js`, `${specifier}/index.js`]) {
        try {
          return await nextResolve(candidate, context);
        } catch {
          // try the next candidate
        }
      }
    }
    throw err;
  }
}
