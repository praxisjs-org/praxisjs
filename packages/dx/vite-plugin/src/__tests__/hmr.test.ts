// @vitest-environment jsdom
import ts from "typescript";
import { describe, it, expect, vi } from "vitest";

import { hmrPlugin, transformHmr } from "../hmr";

const specifiers = { core: "@praxisjs/core", runtime: "@praxisjs/runtime" };
const core = (await import(/* @vite-ignore */ specifiers.core)) as Record<string, unknown>;
const runtime = (await import(/* @vite-ignore */ specifiers.runtime)) as Record<string, unknown> & {
  render: (factory: () => unknown, container: HTMLElement) => () => void;
  mountComponent: (ctor: unknown, props: Record<string, unknown>, scope: unknown) => Node[];
  getCurrentScope: () => unknown;
};

interface Hot {
  accept: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}

/** Runs a module transformed for hot replacement with `hot` as its `import.meta.hot`. */
function run(source: string, hot: Hot | undefined): Record<string, unknown> {
  const code = (transformHmr(source, "/src/app.tsx") ?? source)
    .replace(/^import \{ _\$hmrRegister.*\n/m, "")
    .replaceAll("import.meta.hot", "hot")
    .replace(/export class (\w+)/g, "class $1");
  const { outputText } = ts.transpileModule(`${code}\nreturn { ${[...source.matchAll(/export class (\w+)/g)].map((m) => m[1]).join(", ")} };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve },
  });
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function("StatefulComponent", "hot", "__pxHotRegister", "__pxHotAccepts", outputText)(
    core.StatefulComponent, hot, runtime._$hmrRegister, runtime._$hmrAccepts,
  ) as Record<string, unknown>;
}

describe("transformHmr", () => {
  it("registers every top-level class and accepts the update of a module that only exports classes", () => {
    const out = transformHmr(
      "import { A } from './a';\nexport class App {}\nclass Local {}\nexport type Props = {};\nexport interface I {}\nexport { Local as Other };\n",
      "/src/app.tsx?t=1",
    ) ?? "";
    expect(out.startsWith("import { A } from './a';\nexport class App {}\n")).toBe(true);
    expect(out).toContain('import { _$hmrRegister as __pxHotRegister, _$hmrAccepts as __pxHotAccepts } from "@praxisjs/runtime";');
    expect(out).toContain('__pxHotRegister(App, "/src/app.tsx#App");\n__pxHotRegister(Local, "/src/app.tsx#Local");');
    expect(out).toContain("import.meta.hot.accept((mod) => { if (!__pxHotAccepts(mod)) import.meta.hot.invalidate(); });");
  });

  it("registers classes but leaves the update to Vite when the module exports anything else", () => {
    const others = [
      "export class A {}\nexport const value = 1;",
      "export class A {}\nexport function helper() {}",
      "export class A {}\nexport enum E { X }",
      "export class A {}\nexport * from './b';",
      "export class A {}\nexport { b } from './b';",
      "export class A {}\nconst b = 1;\nexport { b };",
      "class A {}\nexport default 1 + 1;",
      "export default class {}\nclass A {}",
      "class A {}\nexport * as ns from './b';",
    ];
    for (const source of others) {
      const out = transformHmr(source, "/src/a.ts") ?? "";
      expect(out).toContain('__pxHotRegister(A, "/src/a.ts#A");');
      expect(out).not.toContain("accept(");
    }
    expect(transformHmr("class A {}\nexport default A;\nexport type { T } from './t';\nexport { type U };\ndeclare const x: number;\nexport declare const y: number;", "/src/a.ts")).toContain("accept(");
    expect(transformHmr("class A {}", "/src/a.ts")).not.toContain("accept(");
  });

  it("ignores modules without a runtime class, and files that are not scripts", () => {
    expect(transformHmr("export const a = 1;", "/src/a.ts")).toBeNull();
    expect(transformHmr("// a class of its own\nexport const a = 1;", "/src/a.ts")).toBeNull();
    expect(transformHmr("export declare class A {}", "/src/a.ts")).toBeNull();
    expect(transformHmr(".class {}", "/src/a.css")).toBeNull();
    for (const file of ["/a.jsx", "/a.js", "/a.mjs", "/a.cjs", "/a.mts", "/a.cts"]) {
      expect(transformHmr("export class A {}", file)).toContain("__pxHotRegister(A");
    }
  });
});

describe("hmrPlugin", () => {
  type Transform = (code: string, id: string, options?: { ssr?: boolean }) => { code: string; map: null } | null;
  interface HmrHooks { transform: Transform; configResolved: (config: { root: string }) => void }

  it("transforms client modules of the app only, keeping the source map", () => {
    const plugin = hmrPlugin() as unknown as HmrHooks;
    plugin.configResolved({ root: "/app" });
    expect(plugin.transform("export class A {}", "/app/src/a.ts")).toEqual({ code: expect.stringContaining("__pxHotRegister(A") as unknown, map: null });
    expect(plugin.transform("export class A {}", "/app/src/a.ts", { ssr: true })).toBeNull();
    expect(plugin.transform("export class A {}", "/app/node_modules/x/a.js")).toBeNull();
    expect(plugin.transform("export class A {}", "/repo/packages/core/dist/a.js")).toBeNull();
    expect(plugin.transform("export class A {}", "\0virtual:a")).toBeNull();
    expect(plugin.transform("export const a = 1;", "/app/src/a.ts")).toBeNull();
    const slash = hmrPlugin() as unknown as HmrHooks;
    slash.configResolved({ root: "/app/" });
    expect(slash.transform("export class A {}", "/app/a.ts")).not.toBeNull();
    expect((hmrPlugin() as unknown as HmrHooks).transform("export class A {}", "/a.ts")).not.toBeNull();
  });
});

describe("hot replacement end to end", () => {
  it("re-renders mounted components when their module runs again, and hands other updates on", async () => {
    const hot: Hot = { accept: vi.fn(), invalidate: vi.fn() };
    const source = (label: string) => `
      export class Counter extends StatefulComponent {
        static __isComponent = true;
        render() { return document.createTextNode("${label}"); }
      }
    `;
    const first = run(source("one"), hot);
    const container = document.createElement("div");
    runtime.render(() => runtime.mountComponent(first.Counter, {}, runtime.getCurrentScope()), container);
    expect(container.textContent).toBe("one");

    const second = run(source("two"), hot);
    const accept = hot.accept.mock.calls[0][0] as (mod: unknown) => void;
    accept(second);
    expect(hot.invalidate).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(container.textContent).toBe("two");

    accept({ Counter: second.Counter, helper: () => 1 });
    accept(undefined);
    expect(hot.invalidate).toHaveBeenCalledTimes(2);
    expect(run(source("three"), undefined).Counter).toBeTypeOf("function");
  });
});
