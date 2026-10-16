// @vitest-environment node
import { resolve } from "node:path";

import { build, type Plugin, type Rolldown } from "vite";
import { describe, it, expect } from "vitest";

import { praxisjs } from "../index";

// Builds small apps for production against the framework's sources, as an app's bundler would, and
// checks what ends up in them: what an app does not use must stay out.

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
  // The decorators an app keeps in its production code, not the panel.
  { find: /^@praxisjs\/devtools$/, replacement: source("dx/devtools/src/decorators/index.ts") },
];

function app(files: Record<string, string>): Plugin {
  return {
    name: "test-app",
    enforce: "pre",
    resolveId(id) {
      const name = id.replace(/^\/app\//, "").replace(/^\.\//, "");
      return name in files ? `/app/${name}` : null;
    },
    load(id) {
      return id.startsWith("/app/") ? files[id.slice(5)] : null;
    },
  };
}

async function bundle(files: Record<string, string>, minify: boolean): Promise<Rolldown.OutputChunk> {
  const output = (await build({
    configFile: false,
    logLevel: "silent",
    mode: "production",
    plugins: [app(files), praxisjs({ hmr: false })],
    resolve: { alias },
    // Vite inlines the NODE_ENV it runs under, which is "test" here.
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    oxc: { jsx: { importSource: "@praxisjs/jsx" }, target: "es2022" },
    build: { write: false, minify, rollupOptions: { input: "/app/main.tsx" } },
  })) as Rolldown.RolldownOutput;
  return output.output[0] as Rolldown.OutputChunk;
}

const counter = `
  import { StatefulComponent } from "@praxisjs/core";
  import { Component, State } from "@praxisjs/decorators";
  import { Trace } from "@praxisjs/devtools";
  @Trace()
  @Component()
  export class Counter extends StatefulComponent {
    @State() count = 0;
    render() { return <button onClick={() => { this.count++; }}>{() => this.count}</button>; }
  }
`;

const list = `
  import { StatefulComponent } from "@praxisjs/core";
  import { Component, State } from "@praxisjs/decorators";
  import { For } from "@praxisjs/runtime";
  @Component()
  export class Todos extends StatefulComponent {
    @State() items = [{ id: 1, text: "a" }];
    render() { return <ul><For each={() => this.items} by="id">{(item) => <li>{() => item().text}</li>}</For></ul>; }
  }
`;

const main = (imports: string[]) => `
  import { render } from "@praxisjs/runtime";
  ${imports.map((name) => `import { ${name} } from "./${name.toLowerCase()}.tsx";`).join("\n")}
  render(() => <div>${imports.map((name) => `<${name} />`).join("")}</div>, document.body);
`;

const included = (chunk: Rolldown.OutputChunk, path: string) =>
  chunk.moduleIds.some((id) => id.endsWith(path) && chunk.modules[id].renderedLength > 0);

describe("production bundles", () => {
  it("leave out the lists, selectors and devtools of an app that does not use them", async () => {
    const chunk = await bundle({ "main.tsx": main(["Counter"]), "counter.tsx": counter }, false);
    expect(included(chunk, "runtime/src/template.ts")).toBe(true);
    expect(included(chunk, "runtime/src/list.ts")).toBe(false);
    expect(included(chunk, "core/src/signal/selector.ts")).toBe(false);
    expect(included(chunk, "devtools/src/core/registry.ts")).toBe(false);
  });

  it("keep Index's positional update out of an app that only uses For", async () => {
    const chunk = await bundle({ "main.tsx": main(["Todos"]), "todos.tsx": list }, false);
    expect(chunk.code).toContain("updateKeyed");
    expect(chunk.code).not.toContain("updatePositional");
  });

  it("carry one copy of the decorator helpers and no graph instrumentation", async () => {
    const chunk = await bundle({ "main.tsx": main(["Counter", "Todos"]), "counter.tsx": counter, "todos.tsx": list }, true);
    expect(chunk.code.split("Cannot add initializers after decoration has completed")).toHaveLength(2);
    // The decorators package's own CLAIM key, and the helpers' one.
    expect(chunk.code.split("praxisjs.field.claim")).toHaveLength(3);
    expect(chunk.code).not.toContain("performance.now");
  });
});
