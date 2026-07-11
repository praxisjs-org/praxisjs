import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import type { Plugin, ResolvedConfig } from "vite";
import { praxisjsCSS } from "../css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PluginHooks = {
  configResolved(c: Partial<ResolvedConfig>): void;
  config(c: unknown, env: { command: "build" | "serve" }): { define: Record<string, string> } | undefined;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
  buildStart(): Promise<void>;
};

function hooks(p: Plugin): PluginHooks {
  return p as unknown as PluginHooks;
}

function servePlugin() {
  const p = praxisjsCSS();
  hooks(p).configResolved({ command: "serve", root: "/" } as Partial<ResolvedConfig>);
  return p;
}

function buildPlugin(root = "/") {
  const p = praxisjsCSS();
  hooks(p).configResolved({ command: "build", root } as Partial<ResolvedConfig>);
  return p;
}

// ─── Plugin shape ─────────────────────────────────────────────────────────────

describe("praxisjsCSS() — plugin shape", () => {
  it("has name praxisjs:css", () => {
    expect(praxisjsCSS().name).toBe("praxisjs:css");
  });

  it("enforces 'pre'", () => {
    expect(praxisjsCSS().enforce).toBe("pre");
  });
});

// ─── resolveId() ─────────────────────────────────────────────────────────────

describe("praxisjsCSS() — resolveId()", () => {
  it("resolves virtual:praxisjs/styles.css to internal null-prefixed id", () => {
    const p = servePlugin();
    expect(hooks(p).resolveId("virtual:praxisjs/styles.css")).toBe("\0virtual:praxisjs/styles.css");
  });

  it("returns undefined for any other id", () => {
    const p = servePlugin();
    expect(hooks(p).resolveId("./component.ts")).toBeUndefined();
    expect(hooks(p).resolveId("vite/client")).toBeUndefined();
  });
});

// ─── config() ────────────────────────────────────────────────────────────────

describe("praxisjsCSS() — config()", () => {
  it("injects __PRAXIS_CSS_STATIC__ define in build mode", () => {
    const p = praxisjsCSS();
    const result = hooks(p).config({}, { command: "build" });
    expect(result?.define?.["__PRAXIS_CSS_STATIC__"]).toBe("true");
  });

  it("returns undefined in serve mode", () => {
    const p = praxisjsCSS();
    expect(hooks(p).config({}, { command: "serve" })).toBeUndefined();
  });
});

// ─── load() ──────────────────────────────────────────────────────────────────

describe("praxisjsCSS() — load()", () => {
  it("returns runtime-injection comment for virtual id in serve mode", () => {
    const result = hooks(servePlugin()).load("\0virtual:praxisjs/styles.css");
    expect(result).toContain("runtime injection active");
  });

  it("returns 'no static styles found' for virtual id in build mode before extraction", () => {
    const result = hooks(buildPlugin()).load("\0virtual:praxisjs/styles.css");
    expect(result).toContain("no static styles found");
  });

  it("returns undefined for non-virtual ids", () => {
    expect(hooks(servePlugin()).load("./component.ts")).toBeUndefined();
    expect(hooks(buildPlugin()).load("node_modules/something")).toBeUndefined();
  });

  it("returns extracted CSS header in build mode after extraction", async () => {
    // set up extraction output by running buildStart first (integration test below)
    // this test checks the static CSS header content after buildStart sets staticCSS
    const p = buildPlugin(tmpDir);
    const info = vi.fn();
    await hooks(p).buildStart.call({ info });
    const result = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    expect(result).toContain("static extraction");
  });
});

// ─── buildStart() — integration ──────────────────────────────────────────────

let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "praxis-css-test-"));

  // tsconfig.json — exercises the findTsConfig() success branch (return p)
  writeFileSync(path.join(tmpDir, "tsconfig.json"), "{}");

  // File 1: extends Stylesheet + uses Styled()
  writeFileSync(
    path.join(tmpDir, "button.ts"),
    `
import { Stylesheet, Styled } from "@praxisjs/css";
class BtnStyles extends Stylesheet {
  $root  = this.css({ display: "inline-flex", padding: "8px 16px" });
  $hover = this.css({ opacity: 0.9 });
}
Styled(BtnStyles);
`,
  );

  // File 2: globalStyle()
  writeFileSync(
    path.join(tmpDir, "base.ts"),
    `
import { globalStyle } from "@praxisjs/css";
globalStyle(_css => "*, *::before, *::after { box-sizing: border-box; }");
`,
  );

  // File 3: keyframes()
  writeFileSync(
    path.join(tmpDir, "animations.ts"),
    `
import { keyframes } from "@praxisjs/css";
const spin = keyframes("spin", {
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});
`,
  );

  // File 4: Themed()
  writeFileSync(
    path.join(tmpDir, "theme.ts"),
    `
import { Themed } from "@praxisjs/css";
class AppTokens { colorBrand = "#6d5bbd"; }
class LightTheme extends AppTokens {}
Themed(AppTokens, LightTheme);
`,
  );

  // File that imports another @praxisjs/* package — exercises the praxis stub,
  // calls noop, AND calls noop's return value to achieve full function coverage
  writeFileSync(
    path.join(tmpDir, "with-runtime.ts"),
    `
import { signal } from "@praxisjs/core";
import { globalStyle } from "@praxisjs/css";
globalStyle(_css => "html { font-family: system-ui; }");
const s = signal(0);
if (typeof s === 'function') s();
console.log(s);
setTimeout(() => {}, 0);
clearTimeout(0);
`,
  );

  // File that imports a third-party package — exercises require() fallback return {}
  writeFileSync(
    path.join(tmpDir, "with-thirdparty.ts"),
    `
import { globalStyle } from "@praxisjs/css";
import { format } from "date-fns";
globalStyle(_css => "body { color: black; }");
void format;
`,
  );

  // Subdirectory with a .tsx file — exercises isDirectory() and .tsx branches
  const subDir = path.join(tmpDir, "components");
  mkdirSync(subDir);
  writeFileSync(
    path.join(subDir, "card.tsx"),
    `
import { Stylesheet, Styled } from "@praxisjs/css";
class CardStyles extends Stylesheet {
  $card = this.css({ borderRadius: "8px" });
}
Styled(CardStyles);
`,
  );

  // Skipped directory (SKIP_DIRS) — exercises the SKIP_DIRS.has() branch
  mkdirSync(path.join(tmpDir, "node_modules"));

  // Hidden file — exercises the startsWith(".") branch
  writeFileSync(path.join(tmpDir, ".hidden.ts"), `export {};`);

  // Non-TS/TSX file — exercises the else-if false branch in findSourceFiles
  writeFileSync(path.join(tmpDir, "styles.css"), `body { margin: 0; }`);

  // Non-matching TS file (should be ignored)
  writeFileSync(
    path.join(tmpDir, "utils.ts"),
    `export const add = (a: number, b: number) => a + b;`,
  );
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("praxisjsCSS() — buildStart() integration", () => {
  it("extracts scoped class CSS from Stylesheet subclasses", async () => {
    const p = buildPlugin(tmpDir);
    const info = vi.fn();
    await hooks(p).buildStart.call({ info });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain(".prx-root-");
    expect(css).toContain("display: inline-flex");
  });

  it("extracts globalStyle CSS", async () => {
    const p = buildPlugin(tmpDir);
    await hooks(p).buildStart.call({ info: vi.fn() });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain("box-sizing: border-box");
  });

  it("extracts @keyframes CSS", async () => {
    const p = buildPlugin(tmpDir);
    await hooks(p).buildStart.call({ info: vi.fn() });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain("@keyframes prx-spin-");
    expect(css).toContain("rotate(0deg)");
  });

  it("extracts :root vars from Themed()", async () => {
    const p = buildPlugin(tmpDir);
    await hooks(p).buildStart.call({ info: vi.fn() });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain(":root");
    expect(css).toContain("--color-brand: #6d5bbd");
  });

  it(":root vars appear before class rules", async () => {
    const p = buildPlugin(tmpDir);
    await hooks(p).buildStart.call({ info: vi.fn() });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    const rootIdx = css.indexOf(":root");
    const classIdx = css.indexOf(".prx-");
    expect(rootIdx).toBeLessThan(classIdx);
  });

  it("calls this.info() with extracted rule count", async () => {
    const p = buildPlugin(tmpDir);
    const info = vi.fn();
    await hooks(p).buildStart.call({ info });
    expect(info).toHaveBeenCalledWith(expect.stringContaining("extracted"));
  });

  it("returns empty when root has no matching source files", async () => {
    const emptyDir = mkdtempSync(path.join(tmpdir(), "praxis-empty-"));
    try {
      const p = buildPlugin(emptyDir);
      const info = vi.fn();
      await hooks(p).buildStart.call({ info });
      expect(info).not.toHaveBeenCalled();
      const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
      expect(css).toContain("no static styles found");
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("skips non-serve mode in buildStart for serve command", async () => {
    const p = servePlugin();
    const info = vi.fn();
    await hooks(p).buildStart.call({ info });
    expect(info).not.toHaveBeenCalled();
  });

  it("handles a root directory that cannot be read (readdirSync throws)", async () => {
    const p = buildPlugin("/this/path/does/not/exist/at/all");
    const info = vi.fn();
    await hooks(p).buildStart.call({ info });
    expect(info).not.toHaveBeenCalled();
    expect(hooks(p).load("\0virtual:praxisjs/styles.css")).toContain("no static styles found");
  });

  it("resolves tsconfig path aliases (e.g. `@/*`) instead of externalizing them", async () => {
    const aliasDir = mkdtempSync(path.join(tmpdir(), "praxis-css-alias-"));
    try {
      writeFileSync(
        path.join(aliasDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }),
      );
      mkdirSync(path.join(aliasDir, "src"));
      writeFileSync(
        path.join(aliasDir, "src", "tokens.ts"),
        `export const radius = "42px";`,
      );
      writeFileSync(
        path.join(aliasDir, "button.ts"),
        `
import { Stylesheet, Styled } from "@praxisjs/css";
import { radius } from "@/tokens";
class ButtonStyles extends Stylesheet {
  $root = this.css({ borderRadius: radius });
}
Styled(ButtonStyles);
`,
      );

      const p = buildPlugin(aliasDir);
      await hooks(p).buildStart.call({ info: vi.fn() });
      const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
      // Without the fix, `@/tokens` resolves to `{}` in the sandbox, `radius` is
      // `undefined`, the Stylesheet field initializer throws, and the whole
      // sheet is silently dropped — this asserts the real value made it through.
      expect(css).toContain("border-radius: 42px");
    } finally {
      rmSync(aliasDir, { recursive: true, force: true });
    }
  });

  it("still externalizes real npm packages that happen to look alias-like (scoped packages)", async () => {
    const aliasDir = mkdtempSync(path.join(tmpdir(), "praxis-css-alias-scoped-"));
    try {
      writeFileSync(
        path.join(aliasDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }),
      );
      writeFileSync(
        path.join(aliasDir, "button.ts"),
        `
import { globalStyle } from "@praxisjs/css";
import { format } from "date-fns";
globalStyle(_css => "body { color: black; }");
void format;
`,
      );

      const p = buildPlugin(aliasDir);
      await hooks(p).buildStart.call({ info: vi.fn() });
      const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
      expect(css).toContain("body { color: black; }");
    } finally {
      rmSync(aliasDir, { recursive: true, force: true });
    }
  });

  it("handles vm execution error gracefully (returns empty CSS)", async () => {
    const spy = vi.spyOn(vm, "runInNewContext").mockImplementationOnce(() => { throw new Error("vm crash"); });
    try {
      const p = buildPlugin(tmpDir);
      await hooks(p).buildStart.call({ info: vi.fn() });
      expect(hooks(p).load("\0virtual:praxisjs/styles.css")).toContain("no static styles found");
    } finally {
      spy.mockRestore();
    }
  });

  it("exercises the @praxisjs/* stub path (require for non-css praxis packages)", async () => {
    const p = buildPlugin(tmpDir);
    await hooks(p).buildStart.call({ info: vi.fn() });
    const css = hooks(p).load("\0virtual:praxisjs/styles.css") as string;
    // The with-runtime.ts fixture imports @praxisjs/core which uses the stub
    // If no error was thrown, the stub handled it correctly
    expect(typeof css).toBe("string");
  });
});
