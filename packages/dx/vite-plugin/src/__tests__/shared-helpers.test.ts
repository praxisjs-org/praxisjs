// @vitest-environment node
import ts from "typescript";
import { describe, it, expect } from "vitest";

import { HELPERS_ID, decoratorLoweringPlugin, helpersModule, shareHelpers } from "../decorators";

interface TransformResult {
  code: string;
  map: { mappings: string } | null;
}

interface LoweringPlugin {
  resolveId: (id: string) => string | null;
  load: (id: string) => string | null;
  transform: (code: string, id: string) => TransformResult | null;
}

const plugin = () => decoratorLoweringPlugin() as unknown as LoweringPlugin;

function lower(code: string): string {
  return ts.transpileModule(code, {
    fileName: "/a.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: true },
  }).outputText;
}

const moduleUrl = (code: string) => `data:text/javascript,${encodeURIComponent(code)}`;

const TS_HELPERS = [
  "__esDecorate", "__runInitializers", "__setFunctionName", "__propKey",
  "__classPrivateFieldIn", "__classPrivateFieldGet", "__classPrivateFieldSet",
];

describe("shared decorator helpers", () => {
  it("serves one module with TypeScript's decorator helpers and the claimed fields' ones", async () => {
    const lowering = plugin();
    const resolved = lowering.resolveId(HELPERS_ID);
    expect(resolved).toBe(`\0${HELPERS_ID}`);
    expect(lowering.resolveId("./other")).toBeNull();
    expect(lowering.load(resolved as string)).toBe(helpersModule());
    expect(lowering.load("/a.ts")).toBeNull();

    const helpers = (await import(/* @vite-ignore */ moduleUrl(helpersModule()))) as Record<string, unknown>;
    for (const name of [...TS_HELPERS, "__pxField", "__pxTake"]) expect(typeof helpers[name]).toBe("function");
    expect(typeof helpers.__pxValue).toBe("symbol");
  });

  it("imports the helpers of a lowered module instead of defining them, keeping every line", () => {
    const source = "export class A {\n  @dec() m() {}\n  @dec() get g() { return 1; }\n}\n";
    const result = plugin().transform(source, "/a.ts") as TransformResult;
    const [first] = result.code.split("\n");
    expect(first).toBe(`import { __runInitializers, __esDecorate, __pxMeta, __pxDecorateMethod, __pxSetMeta } from "${HELPERS_ID}";`);
    expect(result.code).not.toContain("this.__esDecorate");
    expect(result.code.split("\n").length).toBe(lower(source).split("\n").length);
  });

  it("runs lowered modules against the shared helpers as real ES modules", async () => {
    const helpersUrl = moduleUrl(helpersModule());
    const source = `
      const CLAIM = Symbol.for("praxisjs.field.claim");
      function State() {
        return (_value, context) => {
          const claim = function (value) {
            let current = value;
            Object.defineProperty(this, context.name, { get: () => current, set: (v) => { current = v; }, enumerable: true, configurable: true });
          };
          const init = Object.assign(function () { claim.call(this, this[context.name]); }, { [CLAIM]: claim });
          context.addInitializer(init);
        };
      }
      const log = [];
      const logged = (value, context) => function (...args) { log.push(context.name); return value.apply(this, args); };
      export class Counter {
        @State() count = 1;
        @logged increment() { this.count++; return this.count; }
      }
      export { log };
    `;
    const lowered = (plugin().transform(source, "/counter.ts") as TransformResult).code;
    const counterModule = (await import(/* @vite-ignore */ moduleUrl(lowered.replace(HELPERS_ID, helpersUrl)))) as {
      Counter: new () => { count: number; increment: () => number };
      log: string[];
    };
    const counter = new counterModule.Counter();
    expect(Object.getOwnPropertyDescriptor(counter, "count")?.get).toBeTypeOf("function");
    expect(counter.increment()).toBe(2);
    expect(counterModule.log).toEqual(["increment"]);
  });

  it("shares the helpers a library built with tsc wrote into an ES module of its own", () => {
    const library = lower("import { dec } from './dec';\nexport class A {\n  @dec() m() {}\n}\n");
    expect(library).toContain("(this && this.__esDecorate)");
    const result = plugin().transform(library, "/node_modules/lib/dist/a.js") as TransformResult;
    expect(result.map).toBeNull();
    expect(result.code).toContain(`import { __runInitializers, __esDecorate, __pxMeta, __pxDecorateMethod, __pxSetMeta } from "${HELPERS_ID}";`);
    expect(result.code).not.toContain("this.__esDecorate");
    expect(result.code.split("\n").length).toBe(library.split("\n").length);
  });

  it("leaves a script alone, which cannot import, and code without the helpers", () => {
    const script = lower("class A {\n  @dec() m() {}\n}\n");
    expect(plugin().transform(script, "/vendor/a.js")).toBeNull();
    expect(plugin().transform("export const a = 1;\n", "/a.js")).toBeNull();
    expect(plugin().transform("export const a = (this && this.__a) || 1;\n", "/a.js")).toBeNull();
  });

  it("keeps a helper written differently from TypeScript's, and anything shaped otherwise", () => {
    const code = [
      "export const x = 1, y = 2;",
      "var { z } = globalThis;",
      "var w;",
      "var v = 1;",
      "var u = x && y;",
      "var __t = (that && that.__t) || function () {};",
      "var __runInitializers = (this && this.__runInitializers) || function () { return \"custom\"; };",
      "var __propKey = (this && this.__propKey) || function (x) {",
      "    return typeof x === \"symbol\" ? x : \"\".concat(x);",
      "};",
    ].join("\n");
    const shared = shareHelpers(code, "/a.js", ts.ScriptKind.JS) as string;
    expect(shared.split("\n")).toEqual([
      "export const x = 1, y = 2;",
      "var { z } = globalThis;",
      "var w;",
      "var v = 1;",
      "var u = x && y;",
      "var __t = (that && that.__t) || function () {};",
      "var __runInitializers = (this && this.__runInitializers) || function () { return \"custom\"; };",
      `import { __propKey } from "${HELPERS_ID}";`,
      "",
      "",
    ]);
    expect(shareHelpers("var __runInitializers = (this && this.__runInitializers) || function () {};", "/a.js")).toBeNull();
  });
});
