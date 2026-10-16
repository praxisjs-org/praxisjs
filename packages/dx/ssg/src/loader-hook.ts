import type { ResolveFnOutput, ResolveHookContext } from "node:module";

// Asynchronous twin of `resolveSync` in index.ts, loaded through module.register() on Node versions
// without module.registerHooks(). It must have no relative imports of its own: it has to work before
// the extensionless-import problem it fixes is worked around. See index.ts for the full story.
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
