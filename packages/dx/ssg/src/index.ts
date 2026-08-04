import { readFile, writeFile, mkdir } from "node:fs/promises";
import * as nodeModule from "node:module";
import { dirname, join } from "node:path";

import { createServer, type Plugin, type ResolvedConfig } from "vite";

import type { RouterOptions } from "@praxisjs/router";
import type { ComponentConstructor } from "@praxisjs/shared/internal";

import type * as PrerenderModule from "./prerender";
import type { GetStaticPaths, RouteEntry } from "./routes";
import type { ResolveFnOutput, ResolveHookContext } from "node:module";

export type { GetStaticPaths, RouteEntry, RouteStaticPaths } from "./routes";

export interface SSGConfig {
  /**
   * Module specifier exporting the root component as its default export and
   * the route table (same one passed to `@Router([...])`) as a named
   * `routes` export, e.g. `"./src/app.tsx"`. Loaded through Vite's own SSR
   * module graph — not imported directly by `vite.config.ts` — so the config
   * file itself never needs to resolve JSX/component source.
   *
   * A dynamic route can expand itself into concrete paths by declaring its
   * own `getStaticPaths` directly on the route object (see `RouteEntry`) —
   * the recommended default, since it's colocated with the route and needs
   * no path matching. `root` may *also* export a named `getStaticPaths` as a
   * fallback for routes that don't declare their own; a route's own always
   * takes precedence.
   *
   * Either way, this can only be reached through `root`, never passed as a
   * plain config value here: Vite's own config loader bundles
   * `vite.config.ts` with a minimal bundler that inlines relative imports
   * (only bare package specifiers get externalized) but never lowers TC39
   * decorators. A `getStaticPaths` written inline in `vite.config.ts` that
   * reaches a decorated class through a relative import — e.g. one that
   * loads a `@Collection`-decorated schema to enumerate content slugs —
   * would bundle that raw decorator syntax straight into the config bundle,
   * which Node cannot then execute. Exporting it from the same module as
   * `root` (or from a route reachable from it) avoids this: it only ever
   * loads through `ssrLoadModule`, which runs the app's real Vite pipeline
   * (decorator lowering included).
   */
  root: string;
  routerOptions?: RouterOptions;
  /** CSS selector for the mount container inside `index.html`. Default: `#app`. */
  containerSelector?: string;
  /**
   * Enables client-side hydration (reconciling the prerendered DOM instead of
   * discarding it). Default: `true`. Set to `false` to fall back to a plain
   * client remount over the static HTML — no reconciliation runs at all,
   * client or server, and `render()` in `@praxisjs/runtime` never sees the
   * hydration marker.
   */
  hydrate?: boolean;
}

// ── extensionless-relative-import retry hook ────────────────────────────────
//
// Every other @praxisjs/* package is built with tsc, which emits relative
// specifiers exactly as written in source ("./router", not "./router.js") —
// harmless for every consumer so far, since they're all resolved through a
// bundler (Vite/esbuild/rollup), which resolves extensionless specifiers
// fine. Node's own ESM resolver does not: it's spec-strict and requires an
// explicit extension on relative specifiers, and @praxisjs/ssg is the first
// package here that needs to load that dependency chain (router, core, head,
// runtime) directly through Node, when `closeBundle` below dynamically
// imports ./prerender.
//
// This lives inline in the package's main entry, with zero relative imports
// of its own, rather than in a separate module: `registerLoaderHook()` must
// run *before* anything reachable from this file needs the workaround it
// installs, and a relative import here would hit the exact problem it's
// meant to fix before it ever gets the chance to run.
const RETRYABLE_CODES = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);

function resolveSync(
  specifier: string,
  context: ResolveHookContext,
  nextResolve: (specifier: string, context?: Partial<ResolveHookContext>) => ResolveFnOutput,
): ResolveFnOutput {
  try {
    return nextResolve(specifier, context);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && code !== undefined && RETRYABLE_CODES.has(code)) {
      for (const candidate of [`${specifier}.js`, `${specifier}/index.js`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // try the next candidate
        }
      }
    }
    throw err;
  }
}

let hookRegistered = false;

/**
 * Installs the retry hook above for the rest of this process. Idempotent.
 * `ssgPlugin()` calls this itself before dynamically importing
 * `@praxisjs/ssg/prerender` — only needed directly if you're calling
 * `prerender()` from your own Node script instead of going through
 * `ssgPlugin()`, and must run before that import.
 *
 * Prefers `module.registerHooks()` (in-thread, sync, Node 22.15+) and falls
 * back to the older `module.register()` (off-thread, needs its own module
 * file — see loader-hook.ts, the asynchronous twin of `resolveSync` above)
 * on earlier Node versions.
 */
export function registerLoaderHook(): void {
  if (hookRegistered) return;
  hookRegistered = true;
  if (typeof nodeModule.registerHooks === "function") {
    nodeModule.registerHooks({ resolve: resolveSync });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional fallback for Node < 22.15, which has no registerHooks
    nodeModule.register(new URL("./loader-hook.js", import.meta.url));
  }
}

// ── plugin ───────────────────────────────────────────────────────────────

interface RootModule {
  default?: ComponentConstructor;
  routes?: RouteEntry[];
  getStaticPaths?: GetStaticPaths;
}

async function loadEntry(
  resolvedConfig: ResolvedConfig,
  root: string,
  withDomGlobals: typeof PrerenderModule.withDomGlobals,
): Promise<{
  root: ComponentConstructor;
  routes: RouteEntry[];
  getStaticPaths: GetStaticPaths | undefined;
  close: () => Promise<void>;
}> {
  const server = await createServer({
    configFile: resolvedConfig.configFile,
    root: resolvedConfig.root,
    server: { middlewareMode: true, watch: null },
    appType: "custom",
    // Every @praxisjs/* package (and anything else in node_modules) must
    // resolve through plain Node `import()` here — the same path `prerender()`
    // itself uses to load @praxisjs/core/runtime/router/head — instead of
    // being re-processed through Vite's SSR transform. Two different copies
    // of @praxisjs/core would mean two separate component-instance registries:
    // mountComponent() (from the plain-Node copy prerender.ts imports) would
    // construct instances that @Router([...])'s decorator (baked into the
    // Vite-SSR-transformed copy the root module was loaded with) doesn't
    // recognize as valid components.
    ssr: { external: true },
    // No client ever connects to this server and nothing here benefits from
    // pre-bundling npm deps for browser delivery — and a background
    // (re-)optimization pass restarting mid-request looked like a plausible
    // cause of "transport was disconnected" errors on lazy-loaded routes.
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    // @Router([...])'s class decorator calls createRouter() at
    // module-evaluation time — ssrLoadModule() below runs that as a side
    // effect of importing the root module, so it needs *a* window in place
    // already, even though nothing is actually being rendered yet (the real,
    // per-route window gets installed later, in prerender()).
    const mod = await withDomGlobals("<!doctype html><html><head></head><body></body></html>", "http://localhost/", async () => {
      return (await server.ssrLoadModule(root)) as RootModule;
    });
    if (!mod.default) {
      throw new Error(`[@praxisjs/ssg] "${root}" has no default export — expected the root component.`);
    }
    if (!mod.routes) {
      throw new Error(`[@praxisjs/ssg] "${root}" has no named "routes" export — expected the same route table passed to @Router([...]).`);
    }
    // Left open, closed by the caller after prerender() finishes: routes
    // wrapped in Lazy(() => import(...)) keep their loader closures bound to
    // *this* server's module runner for as long as they might still be
    // invoked — closing it here would break lazy routes on every page after
    // the first that needs them.
    return { root: mod.default, routes: mod.routes, getStaticPaths: mod.getStaticPaths, close: () => server.close() };
  } catch (err) {
    await server.close();
    throw err;
  }
}

export function ssgPlugin(config: SSGConfig): Plugin {
  let resolvedConfig: ResolvedConfig;

  // Before anything below ever dynamically imports ./prerender — see the
  // retry-hook section above for why this needs to happen here.
  registerLoaderHook();

  return {
    name: "praxisjs:ssg",
    apply: "build",
    configResolved(c) {
      resolvedConfig = c;
    },
    async closeBundle() {
      const { prerender, withDomGlobals } = (await import("./prerender"));

      const outDir = resolvedConfig.build.outDir;
      const templatePath = join(resolvedConfig.root, outDir, "index.html");
      const template = await readFile(templatePath, "utf-8");
      const { root, routes, getStaticPaths, close } = await loadEntry(resolvedConfig, config.root, withDomGlobals);

      let pages;
      try {
        pages = await prerender({
          root,
          routes,
          routerOptions: config.routerOptions,
          getStaticPaths,
          template,
          containerSelector: config.containerSelector,
          hydrate: config.hydrate,
        });
      } finally {
        await close();
      }

      for (const page of pages) {
        const outFile = join(resolvedConfig.root, outDir, page.file);
        await mkdir(dirname(outFile), { recursive: true });
        await writeFile(outFile, page.html, "utf-8");
      }
    },
  };
}
