// @vitest-environment node
import ts from "typescript";
import { describe, it, expect } from "vitest";

import { HELPERS_ID, PX_FIELD_HELPER_LINES, decoratorLoweringPlugin, helpersModule, shareHelpers } from "../decorators";

import { inlineHelpers } from "./inline-helpers";

interface TransformResult {
  code: string;
}

const plugin = () => decoratorLoweringPlugin() as unknown as { transform: (code: string, id: string) => TransformResult | null };

function lower(code: string): string {
  return ts.transpileModule(code, {
    fileName: "/a.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: true },
  }).outputText;
}

const moduleUrl = (code: string) => `data:text/javascript,${encodeURIComponent(code)}`;

const MEMBERS = `
export class B {}
@d("A") export class A extends B {
  @d("s") static s = 1; @d("f") f = 2; @d("x") "my-x" = 3; @d("m") m() { return 1; } @d("sm") static sm() { return 2; }
  @d("q") "q-m"() { return 3; } @d("a") accessor a = 4; @d("g") get g() { return 5; } @d("p") #p = 6;
}
@d("C") export class C { @d("y") y = 7; }
`;

describe("compact decoration calls", () => {
  it("replaces the calls of public fields and methods, the class and its metadata, and nothing else", () => {
    const source = `const d = (tag) => () => undefined;\n${MEMBERS}`;
    const lowered = lower(source);
    const out = (plugin().transform(source, "/a.ts") as TransformResult).code;
    expect(out.split("\n")[0]).toContain(`, __pxMeta, __pxDecorateMethod, __pxDecorateField, __pxDecorateClass, __pxSetMeta } from "${HELPERS_ID}";`);
    expect(out).toContain('__pxDecorateField(_static_s_decorators, "s", true, _metadata, _static_s_initializers, _static_s_extraInitializers);');
    expect(out).toContain('__pxDecorateField(_f_decorators, "f", false, _metadata, _f_initializers, _f_extraInitializers);');
    expect(out).toContain('__pxDecorateField(_member_decorators, "my-x", false, _metadata, _member_initializers, _member_extraInitializers);');
    expect(out).toContain('__pxDecorateMethod(this, _m_decorators, "m", false, _metadata, _instanceExtraInitializers);');
    expect(out).toContain('__pxDecorateMethod(this, _static_sm_decorators, "sm", true, _metadata, _staticExtraInitializers);');
    expect(out).toContain('__pxDecorateMethod(this, _member_decorators_1, "q-m", false, _metadata, _instanceExtraInitializers);');
    expect(out).toContain("__pxDecorateClass(_classDescriptor = { value: _classThis }, _classDecorators, _metadata, _classExtraInitializers);");
    expect(out).toContain("const _metadata = __pxMeta(_classSuper);");
    expect(out).toContain("const _metadata = __pxMeta();");
    expect(out).toContain("__pxSetMeta(_classThis, _metadata);");
    // accessor, getter and private members keep TypeScript's call
    expect(out.match(/__esDecorate\(/g)).toHaveLength(3);
    expect(out.split("\n").length).toBe(lowered.split("\n").length + PX_FIELD_HELPER_LINES);
  });

  it("serves the helpers from the virtual module", async () => {
    const helpers = (await import(/* @vite-ignore */ moduleUrl(helpersModule()))) as Record<string, unknown>;
    for (const name of ["__pxDecorateField", "__pxDecorateMethod", "__pxDecorateClass", "__pxMeta", "__pxSetMeta"]) {
      expect(typeof helpers[name]).toBe("function");
    }
  });

  it("compacts a library built with tsc too", () => {
    const library = lower("import { d } from './d';\nexport class A {\n  @d() x = 1;\n}\n");
    const out = (plugin().transform(library, "/node_modules/lib/dist/a.js") as TransformResult).code;
    expect(out).toContain('__pxDecorateField(_x_decorators, "x", false, _metadata, _x_initializers, _x_extraInitializers);');
    expect(out).not.toContain("__esDecorate(null");
  });

  // Runs MEMBERS lowered by TypeScript alone and by the plugin, with decorators that log every
  // context they get and what they can do with it, and compares the logs.
  async function run(compact: boolean, withMetadata: boolean): Promise<unknown[]> {
    const source = `
      const log = [];
      const contexts = [];
      const d = (tag) => (value, context) => {
        contexts.push(context);
        log.push(["decorate", tag, typeof value, Object.keys(context), context.access && Object.keys(context.access),
          context.access && [context.access.has.name, context.access.get.name, context.access.set?.name], typeof context.metadata]);
        if (context.metadata) context.metadata[tag] = context.name;
        context.addInitializer(function () { log.push(["init", tag, typeof this]); });
        try { context.addInitializer(undefined); } catch (e) { log.push(["bad init", tag, e.message]); }
        if (context.kind === "method") return function (...args) { log.push(["call", tag]); return value.apply(this, args) * 10; };
        if (context.kind === "field") return (v) => v * 10;
        if (context.kind === "class") return class extends value { static tagged = tag; };
        return undefined;
      };
      ${MEMBERS}
      const late = contexts.map((context) => { try { context.addInitializer(() => {}); return "added"; } catch (e) { return e.message; } });
      export const result = () => {
        const a = new A();
        const c = new C();
        log.push(["values", a.f, a["my-x"], A.s, a.m(), A.sm(), a["q-m"](), a.a, a.g, c.y, A.tagged, C.tagged, late]);
        for (const context of contexts) {
          if (!context.access) continue;
          const target = context.static ? A : context.name === "y" ? c : a;
          const read = context.access.has(target) ? context.access.get(target) : "missing";
          if (context.kind === "field" && !context.private) context.access.set(target, 42);
          log.push(["access", context.name, typeof read, context.access.get(target) === 42 || context.kind !== "field" || context.private]);
        }
        const meta = (cls) => withMetadata ? JSON.stringify({ ...cls[Symbol.metadata] }) + Object.keys(Object.getPrototypeOf(cls[Symbol.metadata]) ?? {}) : String(cls[Symbol.metadata]);
        log.push(["metadata", meta(A), meta(C)]);
        return log;
      };
    `;
    const code = compact
      ? inlineHelpers((plugin().transform(source, "/a.ts") as TransformResult).code)
      : lower(source);
    const metadata = Symbol("Symbol.metadata");
    const symbol = Symbol as unknown as { metadata?: symbol };
    if (withMetadata) symbol.metadata = metadata;
    try {
      const { result } = (await import(/* @vite-ignore */ moduleUrl(`const withMetadata = ${String(withMetadata)};\n${code}`))) as {
        result: () => unknown[];
      };
      return result();
    } finally {
      delete symbol.metadata;
    }
  }

  it("decorates exactly like __esDecorate, with and without Symbol.metadata", async () => {
    for (const withMetadata of [false, true]) {
      const expected = await run(false, withMetadata);
      expect(expected.length).toBeGreaterThan(30);
      expect(await run(true, withMetadata)).toEqual(expected);
    }
  });

  it("throws the errors __esDecorate throws for results that are not functions", async () => {
    for (const member of ["@d x = 1;", "@d m() {}"]) {
      const source = `const d = () => 1;\nexport class A { ${member} }\nexport class B {}`;
      const ts1 = lower(source);
      const compact = inlineHelpers((plugin().transform(source, "/a.ts") as TransformResult).code);
      await expect(import(/* @vite-ignore */ moduleUrl(ts1))).rejects.toThrow("Function expected");
      await expect(import(/* @vite-ignore */ moduleUrl(compact))).rejects.toThrow("Function expected");
    }
    const source = "const d = () => 1;\n@d export class A {}";
    await expect(import(/* @vite-ignore */ moduleUrl(inlineHelpers((plugin().transform(source, "/a.ts") as TransformResult).code))))
      .rejects.toThrow("Function expected");
  });

  it("leaves every call it cannot prove to be one of the compact shapes", () => {
    const source = "const d = () => undefined;\n@d export class A extends B {\n  @d f = 1;\n  @d m() {}\n}\n";
    const lowered = lower(source);
    const field = /__esDecorate\(null, null, _f_decorators, (\{ kind: "field".*?metadata: _metadata \}), _f_initializers, _f_extraInitializers\);/.exec(lowered) as RegExpExecArray;
    const method = /__esDecorate\(this, null, _m_decorators, \{ kind: "method".*?metadata: _metadata \}, null, _instanceExtraInitializers\);/.exec(lowered) as RegExpExecArray;
    const klass = /__esDecorate\(null, _classDescriptor = \{ value: _classThis \}, _classDecorators, \{ kind: "class", name: _classThis.name, metadata: _metadata \}, null, _classExtraInitializers\);/.exec(lowered) as RegExpExecArray;
    const [fieldCall, fieldContext] = field;
    const [methodCall] = method;
    const [classCall] = klass;
    const variants: Array<[string, string]> = [
      // any call
      [fieldCall, fieldCall.replace(", _f_extraInitializers);", ");")],
      [fieldCall, fieldCall.replace(fieldContext, "_context")],
      [fieldCall, fieldCall.replace('kind: "field"', '..."field"')],
      [fieldCall, fieldCall.replace('kind: "field"', '"kind": "field"')],
      [fieldCall, fieldCall.replace("_f_decorators", "[d]")],
      [fieldCall, fieldCall.replace("_f_extraInitializers)", "[])")],
      [fieldCall, fieldCall.replace(", metadata: _metadata", "")],
      [fieldCall, fieldCall.replace("metadata: _metadata", "metadata: void 0")],
      [fieldCall, fieldCall.replace('kind: "field"', "kind: k")],
      [fieldCall, fieldCall.replace('kind: "field"', 'kind: "getter"')],
      // fields and methods
      [fieldCall, fieldCall.replace("private: false, ", "")],
      [fieldCall, fieldCall.replace("null, null", "null, {}")],
      [fieldCall, fieldCall.replace('name: "f"', "name: n")],
      [fieldCall, fieldCall.replace('name: "f"', "name: 'f'")],
      [fieldCall, fieldCall.replace("private: false", "private: true")],
      [fieldCall, fieldCall.replace("static: false", "static: s")],
      [fieldCall, fieldCall.replace("__esDecorate(null", "__esDecorate(this")],
      [fieldCall, fieldCall.replace("_f_initializers", "null")],
      [fieldCall, fieldCall.replace("obj.f = value;", "obj.g = value;")],
      [methodCall, methodCall.replace("__esDecorate(this", "__esDecorate(null")],
      [methodCall, methodCall.replace("}, null, _instance", "}, _inits, _instance")],
      [methodCall, methodCall.replace("get: obj => obj.m", "get: obj => obj.n")],
      // the class
      [classCall, classCall.replace("metadata: _metadata", "static: false, metadata: _metadata")],
      [classCall, classCall.replace("__esDecorate(null", "__esDecorate(this")],
      [classCall, classCall.replace("}, null, _classExtra", "}, _inits, _classExtra")],
      [classCall, classCall.replace("_classDescriptor = { value: _classThis }", "_classDescriptor")],
      [classCall, classCall.replace("_classDescriptor = { value: _classThis }", "_classDescriptor || { value: _classThis }")],
      [classCall, classCall.replace("{ value: _classThis }", "{ value: _classThis, other: 1 }")],
      [classCall, classCall.replace("{ value: _classThis }", "{ value: this }")],
      [classCall, classCall.replace("name: _classThis.name", 'name: "A"')],
      [classCall, classCall.replace("name: _classThis.name", "name: _classThis.title")],
      [classCall, classCall.replace("name: _classThis.name", "name: other.name")],
    ];
    for (const [call, variant] of variants) {
      const shared = shareHelpers(lowered.replace(call, variant), "/a.js") as string;
      expect(shared).toContain(variant);
    }
  });
});
