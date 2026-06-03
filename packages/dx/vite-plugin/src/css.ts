import { existsSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { build as esbuildBuild } from "esbuild";

import { extractionModule } from "@praxisjs/css/extract";

import type { Plugin, ResolvedConfig } from "vite";

// ─── Constants ────────────────────────────────────────────────────────────────

// The .css extension is required so Vite recognises this as a CSS asset and
// emits it as a separate file rather than inlining it into a JS module.
const VIRTUAL_ID = "virtual:praxisjs/styles.css";
const RESOLVED_ID = "\0virtual:praxisjs/styles.css";

const HAS_CSS_CONTENT =
  /extends\s+(Reactive)?Stylesheet\b|\bStyled\s*\(|\bkeyframes\s*\(|\bglobalStyle\s*\(|\bThemed\s*\(/;

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".cache", "out"]);

// ─── File scanner ─────────────────────────────────────────────────────────────

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (entry.isDirectory()) files.push(...findSourceFiles(full));
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

function findTsConfig(root: string): string | undefined {
  const p = path.join(root, "tsconfig.json");
  return existsSync(p) ? p : undefined;
}

// ─── Noop stub for @praxisjs/* packages (except @praxisjs/css) ───────────────

// Regular function (not arrow) so it can be used as a base class via `extends`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noop(this: any, ..._args: unknown[]): (...a: unknown[]) => unknown {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
}

function makePraxisStub(): Record<string, unknown> {
  return new Proxy({} as Record<string | symbol, unknown>, { get: () => noop });
}

// ─── CSS extractor ────────────────────────────────────────────────────────────

async function extractStaticCSS(root: string): Promise<string> {
  const candidates = findSourceFiles(root)
    .filter((f) => HAS_CSS_CONTENT.test(readFileSync(f, "utf-8")));
  if (candidates.length === 0) return "";

  // Each candidate is wrapped in try/catch so one bad file doesn't abort extraction.
  const entry = candidates
    .map((f) => `try { require(${JSON.stringify(f)}); } catch {}`)
    .join("\n");

  let bundleCode: string;
  try {
    const result = await esbuildBuild({
      stdin: { contents: entry, loader: "js", resolveDir: root },
      bundle: true,
      write: false,
      format: "cjs",
      platform: "node",
      target: "node20",
      tsconfig: findTsConfig(root),
      plugins: [
        {
          name: "praxisjs-css-extract",
          setup(build) {
            // @praxisjs/css is handled by the vm sandbox (extractionModule).
            // Keep all @praxisjs/* external so esbuild emits plain require()
            // calls — no __toESM wrapping that would break Proxy property access.
            build.onResolve({ filter: /^@praxisjs\// }, () => ({ external: true }));
            build.onResolve({ filter: /^[^./]/ }, () => ({ external: true }));
          },
        },
      ],
      logLevel: "silent",
    });
    bundleCode = result.outputFiles[0].text;
  } catch {
    return "";
  }

  const collected: string[] = [];
  const cssMod = extractionModule((css: string, prepend?: boolean) => {
    if (prepend) collected.unshift(css); else collected.push(css);
  });
  const praxisStub = makePraxisStub();

  const sandbox: Record<string, unknown> = {
    require: (id: string) => {
      if (id === "@praxisjs/css") return cssMod;
      if (id.startsWith("@praxisjs/")) return praxisStub;
      return {};
    },
    console: { log: noop, warn: noop, error: noop },
    process: { env: {} },
    setTimeout: noop,
    clearTimeout: noop,
  };

  try {
    vm.runInNewContext(bundleCode, sandbox);
  } catch {
    return "";
  }

  return collected.join("\n");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Extracts all `@Styled()`, `keyframes()`, and `globalStyle()` CSS at build
 * time and emits it as `virtual:praxisjs/styles.css`.
 *
 * In production:
 * - CSS lives in a static asset with normal HTTP caching.
 * - Runtime `<style>` injection is disabled (`__PRAXIS_CSS_STATIC__ = true`).
 *
 * In development:
 * - The virtual module is empty; CSS is injected at runtime.
 * - HMR works without extra configuration.
 *
 * @example
 * // vite.config.ts
 * import { praxisjs, praxisjsCSS } from '@praxisjs/vite-plugin'
 * export default defineConfig({ plugins: [praxisjs(), praxisjsCSS()] })
 */
export function praxisjsCSS(): Plugin {
  let config: ResolvedConfig;
  let staticCSS = "";

  return {
    name: "praxisjs:css",
    enforce: "pre",

    configResolved(c) {
      config = c;
    },

    config(_, env) {
      if (env.command === "build") {
        return { define: { __PRAXIS_CSS_STATIC__: JSON.stringify(true) } };
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;
      if (config.command === "serve") return "/* @praxisjs/css: runtime injection active */";
      return staticCSS
        ? `/* @praxisjs/css: static extraction */\n${staticCSS}`
        : "/* @praxisjs/css: no static styles found */";
    },

    async buildStart() {
      if (config.command !== "build") return;
      staticCSS = await extractStaticCSS(config.root);
      if (staticCSS) {
        this.info(`@praxisjs/css: extracted ${String(staticCSS.split("\n").length)} CSS rules`);
      }
    },
  };
}
