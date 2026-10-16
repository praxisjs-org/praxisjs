// @vitest-environment node
import ts from "typescript";
import { describe, it, expect, vi } from "vitest";

// Decorators that follow @praxisjs/decorators' claim protocol: the initializer they add carries,
// under CLAIM, the function that defines the field from its initial value.
const CLAIM = Symbol.for("praxisjs.field.claim");
type Host = Record<PropertyKey, unknown>;

function claimable(define: (host: Host, name: string | symbol, value: unknown) => void) {
  return (_value: undefined, context: ClassFieldDecoratorContext) => {
    const claim = function (this: Host, value: unknown) { define(this, context.name, value); };
    const init = Object.assign(function (this: unknown) { claim.call(this as Host, (this as Host)[context.name]); }, { [CLAIM]: claim });
    context.addInitializer(init);
  };
}

function State() {
  return claimable((host, name, value) => {
    const slot = Symbol(String(name));
    host[slot] = value;
    Object.defineProperty(host, name, {
      get(this: Host) { return this[slot]; },
      set(this: Host, next: unknown) { this[slot] = next; },
      enumerable: true,
      configurable: true,
    });
  });
}

// Keeps the field as a plain value, defining it when the claim runs before the field exists.
const keep = claimable((host, name, value) => {
  if (!Object.hasOwn(host, name)) Object.defineProperty(host, name, { value, writable: true, enumerable: true, configurable: true });
});

const doubled = claimable((host, name, initial) => {
  let value = initial as number;
  Object.defineProperty(host, name, { get: () => value * 2, set: (v: number) => { value = v; }, enumerable: true, configurable: true });
});

import { claimFields, decoratorLoweringPlugin } from "../decorators";

import { inlineHelpers } from "./inline-helpers";

interface TransformResult {
  code: string;
  map: { mappings: string } | null;
}

function lower(code: string, fileName = "/a.ts"): string {
  return ts.transpileModule(code, {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: true },
  }).outputText;
}

// Runs `code` lowered by TypeScript alone and by the plugin, with `scope` in reach, and returns
// what its `run()` produces each way.
function both(code: string, scope: Record<string, unknown>): [unknown, unknown] {
  const plugin = decoratorLoweringPlugin() as unknown as { transform: (c: string, id: string) => TransformResult };
  const plain = lower(code);
  const claimed = inlineHelpers(plugin.transform(code, "/a.ts").code);
  expect(claimed).toContain("__pxField(");
  const names = Object.keys(scope);
  const exec = (js: string) =>
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    (new Function(...names, `${js}\nreturn run();`) as (...args: unknown[]) => unknown)(...names.map((n) => scope[n]));
  return [exec(plain), exec(claimed)];
}

describe("claimed fields", () => {
  it("defines a decorated field through its innermost decorator, in the same order as before", () => {
    const log: string[] = [];
    const tag = (label: string) => (_v: undefined, ctx: ClassFieldDecoratorContext) => {
      ctx.addInitializer(function (this: unknown) {
        log.push(`${label}:${String(ctx.name)}:${JSON.stringify(Object.getOwnPropertyDescriptor(this, ctx.name)?.value ?? "accessor")}`);
      });
      return (value: unknown) => { log.push(`init ${label}:${String(ctx.name)}`); return value; };
    };
    const code = `
      class Base { constructor() { log.push("base"); } }
      class Model extends Base {
        @tag("outer") @State() first = (log.push("first value"), 1);
        plain = (log.push("plain value"), 2);
        @State() second = (log.push("second value"), "s");
        bare;
        @tag("solo") third = 3;
        constructor() { super(); log.push("body"); }
      }
      function run() {
        log.length = 0;
        const m = new Model();
        return [log.slice(), Object.keys(m), m.first, m.plain, m.second, m.third, m.bare];
      }
    `;
    const [plain, claimed] = both(code, { log, tag, State });
    expect(claimed).toEqual(plain);
    expect((claimed as unknown[])[1]).toEqual(["first", "plain", "second", "bare", "third"]);
  });

  it("keeps a decorator that leaves a plain value, one with its own accessor, and stacked state", () => {
    const code = `
      class Box {
        @keep kept = 5;
        @doubled twice = 2;
        @State() count = 1;
      }
      function run() {
        const b = new Box();
        b.twice = 4;
        b.count++;
        return [b.kept, b.twice, b.count, Object.getOwnPropertyDescriptor(b, "kept").writable, typeof Object.getOwnPropertyDescriptor(b, "count").get];
      }
    `;
    const [plain, claimed] = both(code, { keep, doubled, State });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([5, 8, 2, true, "function"]);
  });

  it("keeps reading new.target as a field initializer does, and leaves static and private fields alone", () => {
    const code = `
      class A {
        @State() target = new.target;
        @State() make = function () { return new.target; };
        @State() static shared = 1;
        @State() #hidden = 2;
        hidden() { return this.#hidden; }
      }
      function run() {
        const a = new A();
        return [a.target, a.make(), new a.make() === a.make, A.shared, a.hidden()];
      }
    `;
    const [plain, claimed] = both(code, { State });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([undefined, undefined, true, 1, 2]);
    expect(claimFields(lower("class A { @dec() static s = 1; @dec() #h = 2; }"), "/a.ts")).toBeNull();
  });

  it("evaluates initializers in the field's scope, not in the constructor's", () => {
    const code = `
      const v = "outer v";
      const w = "outer w";
      class Base { constructor(v) { this.base = v; } }
      class A extends Base {
        @State() a = v;
        @State() b = [w, typeof late];
        constructor(v) {
          const w = "ctor w";
          super(w);
          const late = 1;
          this.seen = [v, w, late];
        }
      }
      function run() {
        const a = new A("param v");
        return [a.a, a.b, a.base, a.seen];
      }
    `;
    const [plain, claimed] = both(code, { State });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual(["outer v", ["outer w", "undefined"], "ctor w", ["param v", "ctor w", 1]]);
  });

  it("keeps this, super, private names, the class binding and arrow functions in initializers", () => {
    const code = `
      class Base { greet() { return "base"; } get kind() { return "base kind"; } }
      class A extends Base {
        static count = 0;
        #secret = "s";
        @State() id = ++A.count;
        @State() fromSuper = super.greet() + "/" + super.kind;
        @State() secret = this.#secret;
        @State() self = () => this;
        @State() later = this.id * 10;
        greet() { return "own"; }
      }
      function run() {
        const a = new A();
        const b = new A();
        return [a.id, b.id, a.fromSuper, a.secret, a.self() === a, b.later];
      }
    `;
    const [plain, claimed] = both(code, { State });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([1, 2, "base/base kind", "s", true, 20]);
  });

  it("works for class expressions, classes made by a factory, subclasses and several classes per module", () => {
    const code = `
      const make = (start) => class {
        @State() value = start;
        @keep label = "made " + start;
      };
      const One = make(1);
      const Two = make(2);
      const Named = class Inner { @State() n = Inner.name; };
      class Parent { @State() a = "a"; @State() shared = "parent"; }
      class Child extends Parent { @State() b = this.a + "b"; @State() shared = "child"; }
      function run() {
        const c = new Child();
        return [new One().value, new Two().value, new Two().label, new One().value, new Named().n,
          c.a, c.b, c.shared, Object.keys(c), new Parent().shared];
      }
    `;
    const [plain, claimed] = both(code, { State, keep });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([1, 2, "made 2", 1, "Inner", "a", "ab", "child", ["a", "shared", "b"], "parent"]);
  });

  it("leaves no member on the prototype and keeps every key, name and order", () => {
    const code = `
      const sym = Symbol("s");
      class A {
        @State() "str-name" = 1;
        @State() 0 = 2;
        @State() ["lit"] = 3;
        @State() [sym] = 4;
        @State() handler = () => 5;
        method() {}
      }
      function run() {
        const a = new A();
        return [Reflect.ownKeys(A.prototype).map(String), Reflect.ownKeys(a).map(String),
          a["str-name"], a[0], a.lit, a[sym], a.handler.name, a.handler()];
      }
    `;
    const [plain, claimed] = both(code, { State });
    expect(claimed).toEqual(plain);
    expect((claimed as unknown[])[0]).toEqual(["constructor", "method"]);
  });

  it("runs value initializers, method and accessor decorators, and errors in the same order", () => {
    const log: string[] = [];
    const twice = (_v: undefined, ctx: ClassFieldDecoratorContext) => (value: number) => { log.push(`twice ${String(ctx.name)}`); return value * 2; };
    const bound = (method: (...args: unknown[]) => unknown, ctx: ClassMethodDecoratorContext) => {
      ctx.addInitializer(function (this: unknown) { log.push(`bind ${String(ctx.name)}`); });
      return method;
    };
    const tracked = (target: ClassAccessorDecoratorTarget<unknown, number>, ctx: ClassAccessorDecoratorContext) => ({
      init(value: number) { log.push(`accessor ${String(ctx.name)}`); return value + 1; },
      get(this: unknown) { return target.get.call(this); },
      set(this: unknown, v: number) { target.set.call(this, v); },
    });
    const boom = (_v: undefined, ctx: ClassFieldDecoratorContext) => {
      ctx.addInitializer(function (this: unknown) { log.push("boom"); throw new Error(`boom ${String(ctx.name)}`); });
    };
    const code = `
      class A {
        @State() @twice a = (log.push("a value"), 1);
        @bound m() {}
        @tracked accessor acc = 1;
        @State() b = (log.push("b value"), this.acc);
        get g() { return this.a; }
      }
      class Bad { @State() ok = 1; @boom @State() bad = 2; after = (log.push("after"), 3); }
      function run() {
        log.length = 0;
        const a = new A();
        let error = "";
        try { new Bad(); } catch (e) { error = e.message; }
        return [log.slice(), a.a, a.b, a.acc, a.g, error];
      }
    `;
    const [plain, claimed] = both(code, { log, State, twice, bound, tracked, boom });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([["bind m", "a value", "twice a", "accessor acc", "b value", "boom"], 2, 2, 2, 2, "boom bad"]);
  });

  it("keeps a class decorator that replaces the class, and a class nested in an initializer", () => {
    const wrap = (cls: new () => object) => class extends cls { wrapped = true; };
    const code = `
      @wrap
      class A {
        @State() a = 1;
        @State() inner = new (class { @State() x = 2; @State() y = this.x + 1; })();
        b = 3;
      }
      function run() {
        const a = new A();
        return [a.a, a.inner.x, a.inner.y, a.b, a.wrapped, Object.keys(a)];
      }
    `;
    const [plain, claimed] = both(code, { State, wrap });
    expect(claimed).toEqual(plain);
    expect(claimed).toEqual([1, 2, 3, 3, true, ["a", "inner", "b", "wrapped"]]);
  });

  it("keeps every line of multi-line initializers and comments in place", () => {
    const plugin = decoratorLoweringPlugin() as unknown as { transform: (c: string, id: string) => TransformResult };
    const source = [
      "class A {",
      "  @State() config = {",
      "    a: 1, // first",
      "    b: 2,",
      "  };",
      "  @State() note = // the answer",
      "    42;",
      "  marker = 'here';",
      "}",
      "function run() { const a = new A(); return [a.config, a.note, a.marker]; }",
    ].join("\n");
    const plain = lower(source);
    const claimed = plugin.transform(source, "/a.ts").code;
    const lines = claimed.split("\n").slice(1);
    expect(lines.length).toBe(plain.split("\n").length);
    const plainLines = plain.split("\n");
    for (const marker of ["a: 1, // first", "42", "marker = ", "function run()"]) {
      expect(lines.findIndex((l) => l.includes(marker))).toBe(plainLines.findIndex((l) => l.includes(marker)));
    }
    const [plainResult, claimedResult] = both(source, { State });
    expect(claimedResult).toEqual(plainResult);
    expect(claimedResult).toEqual([{ a: 1, b: 2 }, 42, "here"]);
  });

  it("defines a pending field before a later field that has no prefix of its own", () => {
    const lowered = lower("class A { @State() a = 1; b = 2; }").replace(/\(__runInitializers\(this, _a_extraInitializers\), 2\)/, "2");
    const out = claimFields(lowered, "/a.ts");
    expect(out).toContain('b = (__pxField(this, "a", _a_initializers, _a_extraInitializers), 2)');
  });

  it("does not claim a field whose key is computed from an expression", () => {
    const lowered = lower("class A { @State() a = 1; }").replace(/\n(\s*)a = /, "\n$1[(log(), \"a\")] = ");
    expect(claimFields(lowered, "/a.ts")).toBeNull();
  });

  it("returns null without decorated fields, and keeps the source map lines in place", () => {
    expect(claimFields("const a = 1;", "/a.ts")).toBeNull();
    expect(claimFields(lower("class A { @dec() m() {} }"), "/a.ts")).toBeNull();
    const plugin = decoratorLoweringPlugin() as unknown as { transform: (c: string, id: string) => TransformResult };
    const source = "class A {\n  @State() a = 1;\n  b = 2;\n}\n";
    const result = plugin.transform(source, "/a.ts");
    const plainLines = lower(source).split("\n").length;
    expect(result.code.split("\n").length).toBe(plainLines + 1);
    expect(result.map?.mappings.startsWith(";")).toBe(true);
  });

  it("handles .tsx output, where JSX is kept", () => {
    const out = claimFields(lower("class A { @State() a = 1; render() { return <p>{this.a}</p>; } }", "/a.tsx").replace("React.createElement", "h"), "/a.tsx");
    expect(out).toContain("__pxField(this, \"a\"");
  });

  it("throws when the step after the last field cannot be found", () => {
    const broken = lower("class A { @State() a = 1; }").replace(/__runInitializers\(this, _a_extraInitializers\);/, "");
    expect(() => claimFields(broken, "/a.ts")).toThrow("could not find where the fields of a class finish initializing");
  });
});

describe("claimed fields in a library's compiled files", () => {
  const isLibrary = (id: string) => id.includes("/node_modules/ui/");
  const transform = (code: string, id: string, warn = (_message: string) => undefined) =>
    (decoratorLoweringPlugin(isLibrary) as unknown as {
      transform: (this: { warn: (message: string) => void }, c: string, id: string) => TransformResult | null;
    }).transform.call({ warn }, code, id);

  const model = `
    export class Model {
      @State() count = 1;
      plain = 2;
      @keep kept = 3;
      @doubled twice = 4;
    }
    export function run() {
      const m = new Model();
      m.count++;
      return [Object.keys(m), m.count, m.plain, m.kept, m.twice];
    }
  `;

  it("claims what tsc lowered, behaving the same, one line down", () => {
    const published = lower(model);
    const result = transform(published, "/app/node_modules/ui/dist/model.js") as TransformResult;
    expect(result.code).toContain("__pxField(this, \"count\"");
    expect(result.code.split("\n")).toHaveLength(published.split("\n").length + 1);
    expect(result.map?.mappings.startsWith(";AAAA;AACA")).toBe(true);
    const exec = (js: string) =>
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      (new Function("State", "keep", "doubled", `${js.replace(/^export /gm, "")}\nreturn run();`) as (...args: unknown[]) => unknown)(State, keep, doubled);
    expect(exec(inlineHelpers(result.code))).toEqual(exec(published));
  });

  it("only claims the files of a library that opts in", () => {
    const result = transform(lower(model), "/app/node_modules/other/dist/model.js") as TransformResult;
    expect(result.code).not.toContain("__pxField(");
    expect(result.map).toBeNull();
  });

  it("keeps the helpers inline in a script, which can't import them", () => {
    const script = lower("class Model { @State() count = 1; }");
    const result = transform(script, "/app/node_modules/ui/dist/model.js") as TransformResult;
    expect(result.code.startsWith("const __pxClaim")).toBe(true);
  });

  it("shares the helpers of a library that imports TypeScript's from tslib", () => {
    const tslib = lower(model).replace(/^var __\w+ = \(this && this\.__\w+\) \|\| function[\s\S]*?\n};\n/gm, "");
    expect(tslib).not.toContain("(this && this.__");
    const result = transform(`import { __esDecorate, __runInitializers } from "tslib";\n${tslib}`, "/app/node_modules/ui/dist/model.js") as TransformResult;
    expect(result.code).toMatch(/^import \{ __pxField, __pxTake, __pxValue \} from "virtual:praxisjs\/decorators";/);
  });

  it("warns and leaves the fields as published when a class can't be claimed", () => {
    const broken = lower("export class A { @State() a = 1; }").replace(/__runInitializers\(this, _a_extraInitializers\);/, "");
    const warn = vi.fn();
    const result = transform(broken, "/app/node_modules/ui/dist/a.js", warn) as TransformResult;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("could not find where the fields of a class finish initializing"));
    expect(result.code).not.toContain("__pxField(");
  });
});
