// @vitest-environment node
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import ts from "typescript";
import { build, type Rolldown } from "vite";
import { afterAll, describe, it, expect } from "vitest";

import { praxisjs, type PraxisJSVitePluginOptions } from "../index";

// Builds an app whose components come from libraries in its node_modules, built with tsc as they are
// published, and runs the bundle: what the plugin does to a library must not change what it renders.

interface Window {
  document: Document;
  eval: (code: string) => unknown;
}
// Vite doesn't build in vitest's jsdom environment, so the bundle runs in a window of its own.
// jsdom is not a dependency of the plugin, so it is loaded by specifier rather than typechecked.
const jsdom = "jsdom";
const { JSDOM } = (await import(/* @vite-ignore */ jsdom)) as {
  JSDOM: new (html: string, options: { runScripts: "outside-only" }) => { window: Window };
};

const packages = resolve(__dirname, "../../../..");
const source = (path: string) => resolve(packages, path);
const alias = [
  { find: /^@praxisjs\/shared\/internal$/, replacement: source("foundation/shared/src/internal.ts") },
  { find: /^@praxisjs\/shared$/, replacement: source("foundation/shared/src/index.ts") },
  { find: /^@praxisjs\/core\/internal$/, replacement: source("foundation/core/src/internal.ts") },
  { find: /^@praxisjs\/core$/, replacement: source("foundation/core/src/index.ts") },
  { find: /^@praxisjs\/decorators$/, replacement: source("foundation/decorators/src/index.ts") },
  { find: /^@praxisjs\/runtime$/, replacement: source("foundation/runtime/src/index.ts") },
  { find: /^@praxisjs\/jsx\/jsx-(dev-)?runtime$/, replacement: source("foundation/jsx/src/jsx-runtime.ts") },
];

const counter = `import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";

@Component()
export class Counter extends StatefulComponent {
  @Prop() label = "count";
  @State() count = 0;
  @State() items = [{ id: 1 }, { id: 2 }];

  render() {
    return (
      <div class="counter">
        <button onClick={() => { this.count++; this.items = [...this.items, { id: this.items.length + 1 }]; }}>
          {this.label}: {() => this.count}
        </button>
        <ul>{() => this.items.map((item) => <li key={item.id}>{item.id}</li>)}</ul>
      </div>
    );
  }
}
`;

function tsc(code: string): string {
  return ts.transpileModule(code, {
    fileName: "/counter.tsx",
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      useDefineForClassFields: true,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "@praxisjs/jsx",
    },
  }).outputText;
}

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function app(praxisjsField: object | null): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "praxisjs-libraries-build-")));
  roots.push(root);
  const files: Record<string, string> = {
    "package.json": JSON.stringify({ name: "app", dependencies: { "ui-lib": "*" } }),
    "main.tsx": `import { render } from "@praxisjs/runtime";
import { Counter } from "ui-lib";
render(() => <Counter label="clicks" />, document.getElementById("root"));
`,
    "node_modules/ui-lib/package.json": JSON.stringify({
      name: "ui-lib",
      type: "module",
      exports: { ".": "./dist/index.js" },
      ...(praxisjsField === null ? {} : { praxisjs: praxisjsField }),
    }),
    "node_modules/ui-lib/dist/index.js": "export { Counter } from \"./counter.js\";\n",
    "node_modules/ui-lib/dist/counter.js": tsc(counter),
    "node_modules/ui-lib/src/index.ts": "export { Counter } from \"./counter\";\n",
    "node_modules/ui-lib/src/counter.tsx": counter,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

async function bundle(root: string, options: PraxisJSVitePluginOptions = {}): Promise<Rolldown.OutputChunk> {
  const output = (await build({
    root,
    configFile: false,
    logLevel: "silent",
    mode: "production",
    plugins: [praxisjs({ hmr: false, ...options })],
    resolve: { alias },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    oxc: { jsx: { importSource: "@praxisjs/jsx" }, target: "es2022" },
    build: { write: false, minify: false, sourcemap: true, rollupOptions: { input: join(root, "main.tsx") } },
  })) as Rolldown.RolldownOutput;
  return output.output.find((file): file is Rolldown.OutputChunk => file.type === "chunk") as Rolldown.OutputChunk;
}

// Renders the bundle and clicks its button twice. Comments are left out: a keyed list rewritten into
// <For> keeps its rows between comments of its own.
function run(chunk: Rolldown.OutputChunk): string[] {
  const { window } = new JSDOM("<div id=\"root\"></div>", { runScripts: "outside-only" });
  window.eval(chunk.code);
  const html = () => window.document.body.innerHTML.replaceAll("<!---->", "");
  const states = [html()];
  for (let i = 0; i < 2; i++) {
    window.document.querySelector("button")?.click();
    states.push(html());
  }
  return states;
}

const fromLibrary = (chunk: Rolldown.OutputChunk, path: string) => chunk.moduleIds.some((id) => id.endsWith(`node_modules/ui-lib/${path}`));

describe("libraries in a production build", () => {
  it("leaves a library that doesn't opt in as published", async () => {
    const chunk = await bundle(app(null));
    expect(fromLibrary(chunk, "dist/counter.js")).toBe(true);
    expect(chunk.code).not.toContain("__pxField(");
  });

  it("claims the decorated fields of a library's compiled files, rendering the same", async () => {
    const published = run(await bundle(app(null)));
    const chunk = await bundle(app({ optimize: true }));
    expect(fromLibrary(chunk, "dist/counter.js")).toBe(true);
    expect(chunk.code).toContain("__pxField(");
    expect(run(chunk)).toEqual(published);
    expect(published[2]).toContain("clicks: 2");
    expect(published[2]).toContain("<li>4</li>");
  });

  it("compiles a library with sources from them, rendering the same", async () => {
    const published = run(await bundle(app(null)));
    const chunk = await bundle(app({ optimize: true, rootDir: "src", outDir: "dist" }));
    expect(fromLibrary(chunk, "src/counter.tsx")).toBe(true);
    expect(fromLibrary(chunk, "dist/counter.js")).toBe(false);
    expect(chunk.code).toContain("__pxField(");
    expect(chunk.code).toContain("cloneNode(true)");
    expect(chunk.moduleIds.some((id) => id.endsWith("runtime/src/list.ts"))).toBe(true);
    expect(chunk.map?.sources.some((path) => path.endsWith("node_modules/ui-lib/src/counter.tsx"))).toBe(true);
    expect(run(chunk)).toEqual(published);
  });

  it("lets the app opt a library in or out", async () => {
    const optedIn = await bundle(app(null), { libraries: { "ui-lib": { rootDir: "src", outDir: "dist" } } });
    expect(fromLibrary(optedIn, "src/counter.tsx")).toBe(true);
    const optedOut = await bundle(app({ optimize: true, rootDir: "src", outDir: "dist" }), { libraries: false });
    expect(fromLibrary(optedOut, "dist/counter.js")).toBe(true);
    expect(optedOut.code).not.toContain("__pxField(");
  });

  it("follows the app's own template and keyed-list settings", async () => {
    const root = app({ optimize: true, rootDir: "src", outDir: "dist" });
    const plain = await bundle(root, { templates: false, keyedLists: false });
    expect(plain.code).not.toContain("cloneNode(true)");
    expect(plain.moduleIds.some((id) => id.endsWith("runtime/src/list.ts"))).toBe(false);
    const restricted = await bundle(root, { templates: { include: /\/app\// } });
    expect(restricted.code).not.toContain("cloneNode(true)");
    const all = await bundle(root, { templates: {}, libraries: true });
    expect(all.code).toContain("cloneNode(true)");
  });
});
