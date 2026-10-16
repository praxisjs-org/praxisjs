// @vitest-environment node
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import ts from "typescript";
import { afterAll, describe, it, expect, vi } from "vitest";

import { Libraries, librariesPlugin, prebundlePlugins, type LibraryTransforms } from "../libraries";

interface Resolved { id: string; external?: boolean | "absolute" | "relative" }
type ResolveFn = (source: string, importer: string | undefined, options: Record<string, unknown>) => Promise<Resolved | null>;
interface Hooks {
  name: string;
  config?: (config: { root?: string }) => unknown;
  buildStart?: () => void;
  resolveId?: (this: { resolve: ResolveFn }, source: string, importer: string | undefined, options?: Record<string, unknown>) => unknown;
  load?: (id: string) => unknown;
  transform?: (this: { warn: (message: string) => void }, code: string, id: string) => unknown;
}

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture(files: Record<string, string | object>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "praxisjs-libraries-")));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof content === "string" ? content : JSON.stringify(content));
  }
  return root;
}

// tsc's output for a decorated component, as a library built with it ships.
function compiled(source: string): string {
  return ts.transpileModule(source, {
    fileName: "/widget.tsx",
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      useDefineForClassFields: true,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "@praxisjs/jsx",
    },
  }).outputText;
}

const widget = `import { State } from "@praxisjs/decorators";
export class Widget {
  @State() count = 0;
  @State() label = "a";
  render() { return <p class="w">{() => this.count}</p>; }
}
`;

function app() {
  const root = fixture({
    "package.json": { name: "app", dependencies: { "lib-dist": "*", "lib-src": "*", "plain": "*", "@acme/ui": "*", "lib-off": "*", "missing": "*" } },
    "src/main.ts": "",
    "node_modules/lib-dist/package.json": { name: "lib-dist", praxisjs: { optimize: true }, dependencies: { "lib-dep": "*" } },
    "node_modules/lib-dist/dist/package.json": { type: "module" },
    "node_modules/lib-dist/dist/widget.js": compiled(widget),
    "node_modules/lib-dep/package.json": { name: "lib-dep", praxisjs: { optimize: true }, peerDependencies: { "lib-dist": "*" } },
    "store/lib-src/package.json": { name: "lib-src", praxisjs: { optimize: true, rootDir: "src", outDir: "dist" } },
    "store/lib-src/dist/widget.js": compiled(widget),
    "store/lib-src/dist/util.mjs": "",
    "store/lib-src/dist/view.jsx": "",
    "store/lib-src/dist/data.cjs": "",
    "store/lib-src/dist/LICENSE": "",
    "store/lib-src/dist/orphan.js": "",
    "store/lib-src/src/widget.tsx": widget,
    "store/lib-src/src/util.mts": "",
    "store/lib-src/src/view.tsx": "",
    "node_modules/plain/package.json": { name: "plain" },
    "node_modules/@acme/ui/package.json": { name: "@acme/ui" },
    "node_modules/lib-off/package.json": { name: "lib-off", praxisjs: { optimize: true } },
    "node_modules/escape/package.json": { name: "escape", praxisjs: { optimize: true, rootDir: "../plain", outDir: "dist" } },
    "node_modules/broken/package.json": "{ not json",
    "node_modules/listed/package.json": "[]",
  });
  symlinkSync(join(root, "store/lib-src"), join(root, "node_modules/lib-src"));
  return root;
}

const transforms: LibraryTransforms = { keyedLists: true, templates: /\.[jt]sx(?:$|\?)/ };

describe("Libraries", () => {
  it("finds the libraries an app depends on, through other libraries and by option", () => {
    const root = app();
    const libraries = new Libraries({ "@acme/*": true, "lib-off": false, "named-only": true, "dropped": false });
    expect(libraries.discover(root).sort()).toEqual(["@acme/ui", "lib-dep", "lib-dist", "lib-src", "named-only"]);
  });

  it("finds no library in a folder without a package.json", () => {
    expect(new Libraries().discover(fixture({ "a.txt": "" }))).toEqual([]);
  });

  it("tells the files of a library from the app's own and from virtual modules", () => {
    const root = app();
    const libraries = new Libraries();
    expect(libraries.isLibraryFile(join(root, "node_modules/lib-dist/dist/widget.js?v=1"))).toBe(true);
    // Cached for the second lookup of the same folder.
    expect(libraries.isLibraryFile(join(root, "node_modules/lib-dist/dist/other.js"))).toBe(true);
    expect(libraries.isLibraryFile(join(root, "src/main.ts"))).toBe(false);
    expect(libraries.isLibraryFile(join(root, "node_modules/plain/index.js"))).toBe(false);
    expect(libraries.isLibraryFile(join(root, "node_modules/broken/index.js"))).toBe(false);
    expect(libraries.isLibraryFile(join(root, "node_modules/listed/index.js"))).toBe(false);
    expect(libraries.isLibraryFile("\0virtual:x")).toBe(false);
  });

  it("finds no package for a file outside of any", () => {
    expect(new Libraries().isLibraryFile("/praxisjs-no-such-dir/a.js")).toBe(false);
  });

  it("lets an option opt a package in, a scope in, or a package out", () => {
    const root = app();
    const libraries = new Libraries({ "plain": true, "@acme/*": { rootDir: "src", outDir: "dist" }, "lib-dist": false });
    expect(libraries.isLibraryFile(join(root, "node_modules/plain/index.js"))).toBe(true);
    expect(libraries.isLibraryFile(join(root, "node_modules/@acme/ui/index.js"))).toBe(true);
    expect(libraries.isLibraryFile(join(root, "node_modules/lib-dist/dist/widget.js"))).toBe(false);
  });

  it("maps a compiled file to the source it comes from", () => {
    const root = app();
    const libraries = new Libraries();
    const lib = join(root, "store/lib-src");
    expect(libraries.sourceFile(join(lib, "dist/widget.js"))).toBe(join(lib, "src/widget.tsx"));
    expect(libraries.sourceFile(join(lib, "dist/util.mjs"))).toBe(join(lib, "src/util.mts"));
    expect(libraries.sourceFile(join(lib, "dist/view.jsx"))).toBe(join(lib, "src/view.tsx"));
    expect(libraries.sourceFile(join(lib, "dist/data.cjs"))).toBeNull();
    expect(libraries.sourceFile(join(lib, "dist/LICENSE"))).toBeNull();
    expect(libraries.sourceFile(join(lib, "dist/orphan.js"))).toBeNull();
    expect(libraries.sourceFile(join(lib, "src/widget.tsx"))).toBeNull();
    expect(libraries.sourceFile(join(root, "node_modules/lib-dist/dist/widget.js"))).toBeNull();
    // A rootDir that leaves the package is ignored.
    expect(libraries.sourceFile(join(root, "node_modules/escape/dist/a.js"))).toBeNull();
  });

  it("takes the source folders from the option over the package.json", () => {
    const root = fixture({
      "node_modules/lib/package.json": { name: "lib", praxisjs: { optimize: true, rootDir: "src", outDir: "dist" } },
      "node_modules/lib/lib/a.js": "",
      "node_modules/lib/source/a.ts": "",
    });
    const libraries = new Libraries({ lib: { rootDir: "source", outDir: "lib" } });
    expect(libraries.sourceFile(join(root, "node_modules/lib/lib/a.js"))).toBe(join(root, "node_modules/lib/source/a.ts"));
  });

  it("tells which imports may land in a compiled file with a source", () => {
    const root = app();
    const libraries = new Libraries();
    libraries.discover(root);
    const dist = join(root, "store/lib-src/dist/widget.js");
    expect(libraries.mayResolveToSource("lib-src", undefined)).toBe(true);
    expect(libraries.mayResolveToSource("lib-src/sub/path", undefined)).toBe(true);
    expect(libraries.mayResolveToSource("lib-dist", undefined)).toBe(false);
    expect(libraries.mayResolveToSource("@acme/ui/x", undefined)).toBe(false);
    expect(libraries.mayResolveToSource("\0virtual", dist)).toBe(false);
    expect(libraries.mayResolveToSource("./util.mjs", undefined)).toBe(false);
    expect(libraries.mayResolveToSource("./util.mjs", "\0virtual")).toBe(false);
    expect(libraries.mayResolveToSource("./util.mjs", `${dist}?v=1`)).toBe(true);
    expect(libraries.mayResolveToSource("/abs/util.mjs", dist)).toBe(true);
    expect(libraries.mayResolveToSource("./util", join(root, "store/lib-src/src/widget.tsx"))).toBe(false);
    expect(libraries.mayResolveToSource("./util", join(root, "src/main.ts"))).toBe(false);
  });

  it("reads package.json files again once cleared", () => {
    const root = fixture({ "node_modules/lib/package.json": { name: "lib" } });
    const libraries = new Libraries();
    const file = join(root, "node_modules/lib/a.js");
    expect(libraries.isLibraryFile(file)).toBe(false);
    writeFileSync(join(root, "node_modules/lib/package.json"), JSON.stringify({ name: "lib", praxisjs: { optimize: true } }));
    expect(libraries.isLibraryFile(file)).toBe(false);
    libraries.clear();
    expect(libraries.isLibraryFile(file)).toBe(true);
  });
});

function hooks(plugin: unknown): Hooks {
  return plugin as Hooks;
}

describe("librariesPlugin()", () => {
  it("runs the transforms in the dependency optimizer and keeps the libraries out of SSR externals", () => {
    const root = app();
    const plugin = hooks(librariesPlugin(new Libraries(), transforms));
    const config = plugin.config?.({ root }) as { optimizeDeps: { rolldownOptions: { plugins: Hooks[] } }; ssr: { noExternal: string[] } };
    expect(config.ssr.noExternal.sort()).toEqual(["lib-dep", "lib-dist", "lib-off", "lib-src"]);
    expect(config.optimizeDeps.rolldownOptions.plugins.map((p) => p.name)).toEqual([
      expect.stringMatching(/^praxisjs:libraries\([0-9a-f]{8}\)$/),
      "praxisjs:keyed-lists",
      "praxisjs:decorators",
      "praxisjs:templates",
      "praxisjs:libraries-jsx",
    ]);
  });

  it("changes nothing when the app has no library", () => {
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(fixture({ "package.json": { name: "app" } }));
    expect(hooks(librariesPlugin(new Libraries(), transforms)).config?.({})).toBeNull();
    cwd.mockRestore();
  });

  it("clears what it read of the packages when a build starts", () => {
    const libraries = new Libraries();
    const clear = vi.spyOn(libraries, "clear");
    hooks(librariesPlugin(libraries, transforms)).buildStart?.();
    expect(clear).toHaveBeenCalled();
  });

  it("resolves a compiled file of a library with sources to its source", async () => {
    const root = app();
    const libraries = new Libraries();
    libraries.discover(root);
    const plugin = hooks(librariesPlugin(libraries, transforms));
    const lib = join(root, "store/lib-src");
    const resolve = vi.fn<ResolveFn>(() => Promise.resolve({ id: join(lib, "dist/widget.js?v=1") }));
    const resolveId = (source: string, importer?: string) => plugin.resolveId?.call({ resolve }, source, importer, { kind: "import-statement" });

    expect(await resolveId("lib-src")).toEqual({ id: join(lib, "src/widget.tsx?v=1") });
    expect(resolve).toHaveBeenCalledWith("lib-src", undefined, { kind: "import-statement", skipSelf: true });
    expect(await resolveId("lib-dist")).toBeNull();

    resolve.mockResolvedValueOnce(null);
    expect(await resolveId("lib-src")).toBeNull();
    resolve.mockResolvedValueOnce({ id: "lib-src", external: true });
    expect(await resolveId("lib-src")).toEqual({ id: "lib-src", external: true });
    resolve.mockResolvedValueOnce({ id: join(lib, "dist/orphan.js"), external: false });
    expect(await resolveId("./orphan.js", join(lib, "dist/widget.js"))).toEqual({ id: join(lib, "dist/orphan.js"), external: false });
  });

  it("pins the JSX runtime of a library's JSX files", () => {
    const root = app();
    const plugin = hooks(librariesPlugin(new Libraries(), transforms));
    const file = join(root, "store/lib-src/src/widget.tsx");
    const result = plugin.transform?.call({ warn: vi.fn() }, "export const a = <p />;", `${file}?v=1`) as { code: string; map: { mappings: string } };
    expect(result.code).toBe("/* @jsxImportSource @praxisjs/jsx */ export const a = <p />;");
    expect(result.map.mappings).not.toBe("");
    expect(plugin.transform?.call({ warn: vi.fn() }, "/** @jsxImportSource x */ <p />", file)).toBeNull();
    expect(plugin.transform?.call({ warn: vi.fn() }, "export {}", join(root, "store/lib-src/dist/widget.js"))).toBeNull();
    expect(plugin.transform?.call({ warn: vi.fn() }, "<p />", join(root, "src/app.tsx"))).toBeNull();
  });
});

describe("prebundlePlugins()", () => {
  function plugins(option = {}, steps = transforms) {
    const root = app();
    const libraries = new Libraries(option);
    libraries.discover(root);
    const byName = new Map(prebundlePlugins(libraries, steps).map((p) => [p.name.replace(/\(.*\)$/, ""), hooks(p)]));
    return { root, byName, get: (name: string) => byName.get(name) as Hooks };
  }

  it("names the first plugin after what the plugins do, for Vite's cache of pre-bundled dependencies", () => {
    const first = (option: object, steps: LibraryTransforms) => prebundlePlugins(new Libraries(option as never), steps)[0].name;
    expect(first({}, transforms)).toBe(first({}, transforms));
    expect(first({}, transforms)).not.toBe(first({ x: true }, transforms));
    expect(first({}, transforms)).not.toBe(first({}, { ...transforms, templates: null }));
    expect(first({}, transforms)).not.toBe(first({}, { ...transforms, keyedLists: false }));
  });

  it("leaves out the keyed-list rewrite and the templates when the app turns them off", () => {
    const { byName } = plugins({}, { keyedLists: false, templates: null });
    expect([...byName.keys()]).toEqual(["praxisjs:libraries", "praxisjs:decorators", "praxisjs:libraries-jsx"]);
  });

  it("resolves compiled files to their sources", async () => {
    const { root, get } = plugins();
    const lib = join(root, "store/lib-src");
    const resolve = vi.fn<ResolveFn>(() => Promise.resolve({ id: join(lib, "dist/widget.js") }));
    expect(await get("praxisjs:libraries").resolveId?.call({ resolve }, "lib-src", undefined, { kind: "import-statement" }))
      .toEqual({ id: join(lib, "src/widget.tsx") });
    expect(resolve).toHaveBeenCalledWith("lib-src", undefined, { kind: "import-statement", skipSelf: true });
  });

  it("rewrites the keyed lists of a library's JSX files only", () => {
    const { root, get } = plugins();
    const keyed = get("praxisjs:keyed-lists");
    const file = join(root, "store/lib-src/src/widget.tsx");
    const code = "export const v = <ul>{() => items().map((item) => <li key={item.id}>{item.text}</li>)}</ul>;";
    expect((keyed.transform?.call({ warn: vi.fn() }, code, file) as { code: string }).code).toContain("__PraxisFor");
    expect(keyed.transform?.call({ warn: vi.fn() }, code, join(root, "src/app.tsx"))).toBeNull();
    expect(keyed.transform?.call({ warn: vi.fn() }, code, join(root, "store/lib-src/dist/widget.js"))).toBeNull();
    expect(keyed.transform?.call({ warn: vi.fn() }, "export const v = <p />;", file)).toBeNull();
    // Only a warning, nothing rewritten.
    const unkeyable = "export const v = <ul>{() => items().map((item) => <li key={item.id}>{item.text}</li>).filter(Boolean)}</ul>;";
    expect(keyed.transform?.call({ warn: vi.fn() }, unkeyable, file)).toBeNull();
  });

  it("claims the fields of a library's compiled files and serves the shared helpers", () => {
    const { root, get } = plugins();
    const decorators = get("praxisjs:decorators");
    expect(decorators.resolveId?.call({ resolve: vi.fn() }, "virtual:praxisjs/decorators", undefined)).toBe("\0virtual:praxisjs/decorators");
    expect(decorators.resolveId?.call({ resolve: vi.fn() }, "other", undefined)).toBeNull();
    expect(decorators.load?.("\0virtual:praxisjs/decorators")).toContain("export var __esDecorate");
    expect(decorators.load?.("other")).toBeNull();
    const file = join(root, "node_modules/lib-dist/dist/widget.js");
    const out = decorators.transform?.call({ warn: vi.fn() }, compiled(widget), file) as { code: string };
    expect(out.code).toContain("__pxField(this, \"count\"");
    expect(decorators.transform?.call({ warn: vi.fn() }, compiled(widget), join(root, "src/widget.js"))).toBeNull();
  });

  it("warns and leaves the fields as published when the compiled class can't be claimed", () => {
    const { root, get } = plugins();
    // The constructor that runs the last field's extra initializers is gone.
    const odd = compiled("const d = (..._: unknown[]) => undefined;\nexport class A { @d() x = 1; constructor() {} }")
      .replace(/constructor\(\) \{[^}]*\}/, "");
    const warn = vi.fn();
    const out = get("praxisjs:decorators").transform?.call({ warn }, odd, join(root, "node_modules/lib-dist/dist/odd.js")) as { code: string };
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("its decorated fields are left as published"));
    expect(out.code).not.toContain("__pxField(");
  });

  it("compiles the templates of a library's JSX files only", () => {
    const { root, get } = plugins();
    const templates = get("praxisjs:templates");
    const code = "export const v = <p class=\"a\">{() => 1}</p>;";
    expect((templates.transform?.call({ warn: vi.fn() }, code, join(root, "store/lib-src/src/widget.tsx")) as { code: string }).code)
      .toContain("_$pxtemplate");
    expect(templates.transform?.call({ warn: vi.fn() }, code, join(root, "src/app.tsx"))).toBeNull();
    expect(templates.transform?.call({ warn: vi.fn() }, code, join(root, "store/lib-src/dist/widget.js"))).toBeNull();
  });

  it("pins the JSX runtime of a library's JSX files", () => {
    const { root, get } = plugins();
    const out = get("praxisjs:libraries-jsx").transform?.call({ warn: vi.fn() }, "<p />", join(root, "store/lib-src/src/widget.tsx")) as { code: string };
    expect(out.code.startsWith("/* @jsxImportSource @praxisjs/jsx */")).toBe(true);
  });
});
