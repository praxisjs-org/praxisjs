import ts from "typescript";
import { describe, it, expect, vi } from "vitest";

import { praxisjs, decoratorLoweringPlugin } from "../index";

// `ts.transpileModule`'s own types mark `diagnostics` and `sourceMapText` as
// optional regardless of the options passed in — wrapping it lets a couple
// of tests below simulate that contract even though it never happens with
// the fixed options `decoratorLoweringPlugin()` always calls it with.
vi.mock("typescript", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("typescript") & {
    default: typeof import("typescript");
  };
  return {
    ...actual,
    default: {
      ...actual.default,
      transpileModule: vi.fn(actual.default.transpileModule),
    },
  };
});

interface TransformResult {
  code: string;
  map?: unknown;
}

interface NamedPlugin {
  name?: string;
  enforce?: string;
  config?: () => unknown;
  transform?: (code: string, id: string) => string | TransformResult | null | undefined;
  handleHotUpdate?: (ctx: { file: string; server: unknown }) => void;
}

function transformedCode(result: string | TransformResult | null | undefined): string | null | undefined {
  if (result == null || typeof result === "string") return result;
  return result.code;
}

function findPlugin(plugins: ReturnType<typeof praxisjs>, name: string): NamedPlugin {
  const plugin = (plugins as NamedPlugin[]).find((p) => p.name === name);
  if (!plugin) throw new Error(`plugin "${name}" not found`);
  return plugin;
}

describe("praxisjs() plugin factory", () => {
  it("returns three plugins by default (decorators + core + hmr)", () => {
    const plugins = praxisjs();
    expect(plugins).toHaveLength(3);
  });

  it("returns two plugins when hmr is disabled", () => {
    const plugins = praxisjs({ hmr: false });
    expect(plugins).toHaveLength(2);
  });

  it("core plugin has the correct name", () => {
    const core = findPlugin(praxisjs(), "praxisjs:core");
    expect(core.name).toBe("praxisjs:core");
  });

  it("core plugin enforces 'pre'", () => {
    const core = findPlugin(praxisjs(), "praxisjs:core");
    expect(core.enforce).toBe("pre");
  });

  it("hmr plugin has the correct name", () => {
    const hmr = findPlugin(praxisjs(), "praxisjs:hmr");
    expect(hmr.name).toBe("praxisjs:hmr");
  });

  it("hmr plugin enforces 'post'", () => {
    const hmr = findPlugin(praxisjs(), "praxisjs:hmr");
    expect(hmr.enforce).toBe("post");
  });

  it("omits the hmr plugin when hmr is disabled", () => {
    const plugins = praxisjs({ hmr: false }) as NamedPlugin[];
    expect(plugins.find((p) => p.name === "praxisjs:hmr")).toBeUndefined();
  });

  it("includes the decorator-lowering plugin", () => {
    const plugins = praxisjs();
    expect(findPlugin(plugins, "praxisjs:decorators")).toBeDefined();
  });
});

describe("decoratorLoweringPlugin() standalone export", () => {
  it("is exported so it can be reused outside of praxisjs(), e.g. in vitest.config.ts", () => {
    const plugin = decoratorLoweringPlugin() as NamedPlugin;
    expect(plugin.name).toBe("praxisjs:decorators");
  });

  it("lowers decorators the same way whether reused standalone or via praxisjs()", () => {
    const code = `
      function Dec() { return function (v, ctx) {}; }
      class Foo {
        @Dec()
        accent = "red";
      }
    `;
    const standalone = decoratorLoweringPlugin() as NamedPlugin;
    const result = transformedCode(standalone.transform?.(code, "component.ts"));
    expect(result).toBeTruthy();
    expect(result).not.toContain("@Dec()");
  });
});

describe("praxisjs:decorators transform()", () => {
  it("lowers a real decorator into runtime-executable code", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      function Dec() { return function (v, ctx) {}; }
      class Foo {
        @Dec()
        accent = "red";
      }
    `;
    const result = transformedCode(decorators.transform?.(code, "component.ts"));
    expect(result).toBeTruthy();
    expect(result).not.toContain("@Dec()");
  });

  it("returns null for a file with '@' only in a comment (no real decorator)", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      export function identity(signal) { return signal; }
    `;
    const result = decorators.transform?.(code, "utils.ts");
    expect(result).toBeNull();
  });

  it("returns null for non-JS/TS files", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const result = decorators.transform?.("@import 'x.css';", "styles.css");
    expect(result).toBeNull();
  });

  it("lowers a real decorator in a .tsx file, leaving JSX untouched", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      function Dec() { return function (v, ctx) {}; }
      class Foo {
        @Dec()
        accent = "red";
        render() { return <div>{this.accent}</div>; }
      }
    `;
    const result = transformedCode(decorators.transform?.(code, "component.tsx"));
    expect(result).toBeTruthy();
    expect(result).not.toContain("@Dec()");
    expect(result).toContain("<div>{this.accent}</div>");
  });

  it("lowers a real decorator in a .jsx file, leaving JSX untouched", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      function Dec() { return function (v, ctx) {}; }
      class Foo {
        @Dec()
        accent = "red";
        render() { return <div>{this.accent}</div>; }
      }
    `;
    const result = transformedCode(decorators.transform?.(code, "component.jsx"));
    expect(result).toBeTruthy();
    expect(result).not.toContain("@Dec()");
    expect(result).toContain("<div>{this.accent}</div>");
  });

  it("lowers a real decorator in a plain .js file", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      function Dec() { return function (v, ctx) {}; }
      class Foo {
        @Dec()
        accent = "red";
      }
    `;
    const result = transformedCode(decorators.transform?.(code, "component.js"));
    expect(result).toBeTruthy();
    expect(result).not.toContain("@Dec()");
  });

  it("keeps a field decorator's addInitializer running after super() in a derived class", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      function Dec() {
        return function (value, ctx) {
          ctx.addInitializer(function () { this.order.push("field:" + ctx.name); });
        };
      }
      class Base {
        constructor(order) { this.order = order; this.order.push("super"); }
      }
      class Comp extends Base {
        @Dec()
        accent = "red";
        constructor(order) {
          super(order);
          order.push("after-super");
        }
      }
    `;
    const result = transformedCode(decorators.transform?.(code, "component.ts"));
    expect(result).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(`${result as string}\nreturn Comp;`);
    const Comp = factory() as new (order: string[]) => unknown;
    const order: string[] = [];
    new Comp(order);
    expect(order).toEqual(["super", "field:accent", "after-super"]);
  });

  it("throws on invalid decorator syntax instead of silently emitting broken code", () => {
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const code = `
      class Foo {
        @ accent = "red";
      }
    `;
    // An absolute id (as Vite always passes) makes TypeScript canonicalize
    // the file name while formatting the diagnostic message.
    expect(() => decorators.transform?.(code, "/src/component.ts")).toThrow();
  });

  it("returns a null map when ts.transpileModule omits sourceMapText", () => {
    const transpileModule = ts.transpileModule as unknown as ReturnType<typeof vi.fn>;
    transpileModule.mockReturnValueOnce({
      outputText: "class Foo {}",
      diagnostics: [],
      sourceMapText: undefined,
    });
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    const result = decorators.transform?.("class Foo { @Dec() x = 1; }", "component.ts");
    expect(result).toEqual({ code: "class Foo {}", map: null });
  });

  it("does not throw when ts.transpileModule omits diagnostics", () => {
    const transpileModule = ts.transpileModule as unknown as ReturnType<typeof vi.fn>;
    transpileModule.mockReturnValueOnce({
      outputText: "class Foo {}",
      diagnostics: undefined,
      sourceMapText: undefined,
    });
    const decorators = findPlugin(praxisjs(), "praxisjs:decorators");
    expect(() =>
      decorators.transform?.("class Foo { @Dec() x = 1; }", "component.ts"),
    ).not.toThrow();
  });
});

describe("praxisjs:core config()", () => {
  it("sets oxc target to es2022", () => {
    const core = findPlugin(praxisjs(), "praxisjs:core");
    const config = core.config?.();
    expect(config).toEqual({ oxc: { target: "es2022" } });
  });
});

describe("praxisjs:core transform()", () => {
  it("returns null for .tsx files when autoImport is enabled", () => {
    const core = findPlugin(praxisjs({ autoImport: true }), "praxisjs:core");
    const result = core.transform?.("const x = 1;", "component.tsx");
    expect(result).toBeNull();
  });

  it("returns null for .jsx files when autoImport is enabled", () => {
    const core = findPlugin(praxisjs({ autoImport: true }), "praxisjs:core");
    const result = core.transform?.("const x = 1;", "component.jsx");
    expect(result).toBeNull();
  });

  it("returns undefined (no-op) for non-.tsx/.jsx files", () => {
    const core = findPlugin(praxisjs({ autoImport: true }), "praxisjs:core");
    const result = core.transform?.("const x = 1;", "module.ts");
    expect(result).toBeUndefined();
  });

  it("returns undefined when autoImport is false", () => {
    const core = findPlugin(praxisjs({ autoImport: false }), "praxisjs:core");
    const result = core.transform?.("const x = 1;", "component.tsx");
    expect(result).toBeUndefined();
  });

  it("returns undefined when code already imports @praxisjs/jsx/jsx-runtime", () => {
    const core = findPlugin(praxisjs({ autoImport: true }), "praxisjs:core");
    const code = 'import "@praxisjs/jsx/jsx-runtime"; const x = 1;';
    const result = core.transform?.(code, "component.tsx");
    expect(result).toBeUndefined();
  });
});

describe("praxisjs:hmr handleHotUpdate()", () => {
  function makeMockServer() {
    return {
      ws: {
        send: vi.fn(),
      },
    };
  }

  it("sends custom event for .ts files", () => {
    const hmr = findPlugin(praxisjs({ hmr: true }), "praxisjs:hmr");
    const server = makeMockServer();
    hmr.handleHotUpdate?.({ file: "src/app.ts", server });
    expect(server.ws.send).toHaveBeenCalledWith({
      type: "custom",
      event: "praxisjs:component-update",
      data: { file: "src/app.ts" },
    });
  });

  it("sends custom event for .tsx files", () => {
    const hmr = findPlugin(praxisjs({ hmr: true }), "praxisjs:hmr");
    const server = makeMockServer();
    hmr.handleHotUpdate?.({ file: "src/component.tsx", server });
    expect(server.ws.send).toHaveBeenCalledWith({
      type: "custom",
      event: "praxisjs:component-update",
      data: { file: "src/component.tsx" },
    });
  });

  it("does not send event for non-.ts/.tsx files", () => {
    const hmr = findPlugin(praxisjs({ hmr: true }), "praxisjs:hmr");
    const server = makeMockServer();
    hmr.handleHotUpdate?.({ file: "src/style.css", server });
    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("does not send event for .js files", () => {
    const hmr = findPlugin(praxisjs({ hmr: true }), "praxisjs:hmr");
    const server = makeMockServer();
    hmr.handleHotUpdate?.({ file: "src/utils.js", server });
    expect(server.ws.send).not.toHaveBeenCalled();
  });
});
