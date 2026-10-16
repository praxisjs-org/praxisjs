// @vitest-environment jsdom
import ts from "typescript";
import { describe, it, expect, afterEach } from "vitest";

import { decoratorLoweringPlugin } from "../decorators";
import { transformTemplates } from "../templates";

import { inlineHelpers } from "./inline-helpers";

// Runs components through the plugin's real pipeline (decorator lowering with claimed fields, then
// compiled templates) and through TypeScript's lowering with plain jsx(), against the framework's
// sources, and checks both render and update the same.

const specifiers = {
  core: "@praxisjs/core",
  internal: "@praxisjs/core/internal",
  decorators: "@praxisjs/decorators",
  runtime: "@praxisjs/runtime",
  jsx: "../../../../foundation/jsx/src/jsx-runtime",
};
const core = (await import(/* @vite-ignore */ specifiers.core)) as Record<string, unknown>;
const internal = (await import(/* @vite-ignore */ specifiers.internal)) as Record<string, unknown>;
const decorators = (await import(/* @vite-ignore */ specifiers.decorators)) as Record<string, unknown>;
const runtime = (await import(/* @vite-ignore */ specifiers.runtime)) as Record<string, unknown> & {
  render: (factory: () => unknown, container: HTMLElement) => () => void;
};
const { jsx, Fragment } = (await import(/* @vite-ignore */ specifiers.jsx)) as {
  jsx: (type: unknown, props: Record<string, unknown>) => Node;
  Fragment: unknown;
};

const HELPERS = [
  "template", "html", "element", "prop", "reactive", "insert", "reactiveOnly", "insertOnly", "scope", "event", "onEvent",
  "className",
];

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
  jsx(type, { ...props, children: children.length <= 1 ? children[0] : children });

interface TransformResult { code: string }
const lowering = decoratorLoweringPlugin() as unknown as { transform: (c: string, id: string) => TransformResult | null };

type Exports = Record<string, unknown>;

/**
 * Compiles a module that ends with `return { ...exports }` with the plugin's pipeline (`compiled`)
 * or with TypeScript's lowering and jsx() alone, and runs it with the framework in scope.
 */
function load(source: string, compiled: boolean, scope: Record<string, unknown> = {}): Exports {
  let code = source;
  if (compiled) {
    code = inlineHelpers(lowering.transform(code, "/app.tsx")?.code ?? code);
    code = transformTemplates(code, "/app.tsx")?.code ?? code;
    code = code.replace(/^import .*\n/, "");
  }
  const { outputText } = ts.transpileModule(`function __module() {\n${code}\n}\nreturn __module();`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React, jsxFactory: "h", jsxFragmentFactory: "Fragment",
      target: ts.ScriptTarget.ES2022, useDefineForClassFields: true,
    },
    fileName: "/app.tsx",
  });
  const all: Record<string, unknown> = { h, Fragment, ...core, ...internal, ...decorators, ...runtime, ...scope };
  for (const name of HELPERS) all[`_$px${name}`] = runtime[`_$${name}`];
  const names = Object.keys(all).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...names, outputText)(...names.map((n) => all[n])) as Exports;
}

const containers: HTMLElement[] = [];
afterEach(() => {
  for (const c of containers.splice(0)) c.remove();
});

function mount(factory: () => unknown): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);
  runtime.render(factory, container);
  return container;
}

// The compiled output has no anchor comment for a reactive child that fills its element alone.
const html = (el: Element) => el.innerHTML.replace(/<!--(?!\[)[^>]*-->/g, "");

/** Mounts `name` from both builds, runs `steps` on each, and compares the DOM after every step. */
function same(source: string, name: string, steps: Array<(m: Exports) => void> = [], scope: Record<string, unknown> = {}): HTMLElement[] {
  const builds = [load(source, true, scope), load(source, false, scope)];
  const views = builds.map((m) => mount(() => h(m[name], null)));
  expect(html(views[0])).toBe(html(views[1]));
  for (const step of steps) {
    for (const m of builds) step(m);
    expect(html(views[0])).toBe(html(views[1]));
  }
  return views;
}

interface Signal<T> { (): T; set(value: T): void }
const signal = internal.signal as <T>(value: T) => Signal<T>;

describe("compiled pipeline — returns, arrows and functions", () => {
  it("renders conditional returns, switch cases, loops and labeled blocks like jsx()", () => {
    const mode = signal(0);
    const source = `
      function pick(n) {
        switch (n) {
          case 0: return <p class="zero">{n}</p>;
          case 1:
          case 2: { if (n === 1) return <b title="one">{n}<i>!</i></b>; return <u>{() => n * 2}</u>; }
          default:
            for (let i = 0; ; i++) if (i === n) return <em data-i={i}>{"loop"}{i}</em>;
        }
      }
      function labeled(n) {
        out: { if (n > 5) break out; return <s class="early">{n}</s>; }
        return <small class="late">{n}</small>;
      }
      @Component()
      class View extends StatefulComponent {
        render() { return <div class="view">{() => pick(mode())}{() => labeled(mode() * 3)}</div>; }
      }
      return { View };
    `;
    same(source, "View", [0, 1, 2, 3, 0].map((n) => () => { mode.set(n); }), { mode });
  });

  it("keeps `this`, arguments and nested arrow bodies in templated arrows and methods", () => {
    const source = `
      @Component()
      class View extends StatefulComponent {
        @State() count = 1;
        label = "n";
        row = (n) => <li class="row">{this.label}{n}{() => this.count}</li>;
        nested = () => () => <span class="deep">{this.label}</span>;
        list() { return [1, 2].map(this.row); }
        args() { return (() => <i class="args">{arguments.length}</i>)(); }
        render() { return <ul class="list">{this.list()}{this.nested()()}{this.args(1, 2)}</ul>; }
      }
      return { View };
    `;
    const views = same(source, "View");
    expect(views[0].textContent).toBe("n11n21n2");
  });

  it("templates JSX in generators, async functions and object methods", async () => {
    const source = `
      function* rows() { yield <b class="g">1</b>; yield <b class="g">{2}</b>; return <b class="g">3</b>; }
      async function late(v) { const node = <i class="a">{v}</i>; await null; return node; }
      const parts = { make() { return <s class="m">{"m"}</s>; } };
      return { rows, late, parts };
    `;
    const outputs: string[] = [];
    for (const compiled of [true, false]) {
      const m = load(source, compiled);
      const container = mount(() => [...(m.rows as () => Iterable<Node>)(), (m.parts as { make(): Node }).make()]);
      const scope = new (runtime.Scope as new () => object)();
      const late = (runtime.runInScope as (s: object, fn: () => Promise<Node>) => Promise<Node>)(scope, () => (m.late as (v: number) => Promise<Node>)(7));
      container.appendChild(await late);
      outputs.push(container.innerHTML);
    }
    expect(outputs[0]).toBe('<b class="g">1</b><b class="g">2</b><s class="m">m</s><i class="a">7</i>');
    expect(outputs[0]).toBe(outputs[1]);
  });

  it("renders components that return arrays, fragments, text and nothing", () => {
    const mode = signal(0);
    const source = `
      @Component()
      class Parts extends StatefulComponent {
        render() {
          if (mode() === 0) return [<li class="a">a</li>, <li>{mode()}</li>, "text"];
          if (mode() === 1) return <><li class="f">f</li>{() => mode()}</>;
          if (mode() === 2) return "only text";
          return null;
        }
      }
      @Component()
      class View extends StatefulComponent {
        render() { return <ul class="parts">{() => (mode(), <Parts />)}</ul>; }
      }
      return { View };
    `;
    same(source, "View", [1, 2, 3, 0].map((n) => () => { mode.set(n); }), { mode });
  });
});

describe("compiled pipeline — reactive children", () => {
  it("switches a reactive child between text, numbers, nodes, arrays, empty and nothing, alone or among siblings", () => {
    const value = signal<unknown>("a");
    const source = `
      const show = (v) => v === "node" ? <b class="n">node</b> : v === "list" ? [<i class="x">1</i>, "two", <i>3</i>] : v;
      @Component()
      class View extends StatefulComponent {
        render() {
          return (
            <div class="root">
              <p class="alone">{() => show(value())}</p>
              <p class="mixed">before{() => show(value())}<span>after</span></p>
              <p class="pair">{() => show(value())}{() => show(value())}</p>
            </div>
          );
        }
      }
      return { View };
    `;
    const steps: unknown[] = ["b", 0, "node", "", "list", null, "c", false, "list", "node", undefined, 42, "a"];
    const views = same(source, "View", steps.map((v) => () => { value.set(v); }), { value });
    expect(views[0].querySelector(".alone")?.childNodes).toHaveLength(1);
  });

  it("updates the text of a reactive child in place and keeps a node a parent region moved", () => {
    const label = signal("a");
    const visible = signal(true);
    const source = `
      @Component()
      class View extends StatefulComponent {
        render() { return <div class="wrap">{() => (visible() ? <p class="in">{() => label()}</p> : null)}</div>; }
      }
      return { View };
    `;
    const [compiled] = same(source, "View", [
      () => { label.set("b"); },
      () => { visible.set(false); },
      () => { label.set("c"); },
      () => { visible.set(true); },
      () => { label.set("d"); },
    ], { label, visible });
    expect(compiled.textContent).toBe("d");
  });
});

describe("compiled pipeline — claimed fields with real decorators", () => {
  it("renders and updates @State, @Prop and @Computed fields, in base and derived components", async () => {
    const outer = signal(1);
    const source = `
      const initial = "module";
      @Component()
      class Base extends StatefulComponent {
        @Prop() start = 0;
        @State() count = this.start;
        @State() name = initial;
      }
      @Component()
      class Counter extends Base {
        @State() step = 2;
        @Computed() get next() { return this.count + this.step; }
        constructor(props) {
          const initial = "constructor";
          super(props);
          this.local = initial;
        }
        render() {
          return (
            <p class="counter" onClick={() => { this.count += this.step; }}>
              {() => this.count}/{() => this.next}/{this.name}/{this.local}
            </p>
          );
        }
      }
      @Component()
      class View extends StatefulComponent {
        render() { return <section class="view">{() => <Counter start={outer()} />}</section>; }
      }
      return { View };
    `;
    const views = same(source, "View", [() => { outer.set(5); }], { outer });
    expect(views[0].textContent).toBe("5/7/module/constructor");
    for (const view of views) (view.querySelector("p") as HTMLElement).click();
    // A binding that reads a computed re-runs a microtask after the change.
    await Promise.resolve();
    expect(html(views[0])).toBe(html(views[1]));
    expect(views[0].textContent).toBe("7/9/module/constructor");
  });
});

describe("compiled pipeline — events", () => {
  it("runs handlers on SVG elements with the element as this and currentTarget", () => {
    const calls: string[] = [];
    const source = `
      @Component()
      class View extends StatefulComponent {
        render() {
          return (
            <svg class="chart" viewBox="0 0 10 10">
              <g class="layer">
                <circle class="dot" r="1" onClick={function (e) { calls.push(this.getAttribute("class") + ":" + (e.currentTarget === this)); }} />
                <rect class="box" width="1" height="1" onPointerDown={() => { calls.push("rect"); }} />
              </g>
            </svg>
          );
        }
      }
      return { View };
    `;
    const views = same(source, "View", [], { calls });
    for (const view of views) {
      view.querySelector("circle")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      view.querySelector("rect")?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    }
    expect(calls).toEqual(["dot:true", "rect", "dot:true", "rect"]);
  });

  it("runs handlers inside a portal whose target is outside the document", () => {
    const calls: string[] = [];
    const target = document.createElement("div");
    const open = signal(true);
    const source = `
      @Component()
      class View extends StatefulComponent {
        render() {
          return (
            <div class="host">
              {() => open() ? <Portal to={target}><button class="in-portal" onClick={() => { calls.push("portal"); }}>go</button></Portal> : null}
            </div>
          );
        }
      }
      return { View };
    `;
    const m = load(source, true, { calls, target, open });
    mount(() => h(m.View, null));
    const button = target.querySelector("button") as HTMLButtonElement;
    button.click();
    expect(calls).toEqual(["portal"]);
    open.set(false);
    expect(target.querySelector("button")).toBeNull();
    button.click();
    expect(calls).toEqual(["portal"]);
  });

  it("keeps the event order of nested elements and stops at stopPropagation", () => {
    const calls: string[] = [];
    const source = `
      @Component()
      class View extends StatefulComponent {
        render() {
          return (
            <div class="outer" onClick={() => { calls.push("outer"); }}>
              <p class="mid" onClick={() => { calls.push("mid"); }}>
                <button class="go" onClick={() => { calls.push("button"); }}>go</button>
                <button class="stop" onClick={(e) => { calls.push("stop"); e.stopPropagation(); }}>stop</button>
              </p>
            </div>
          );
        }
      }
      return { View };
    `;
    const views = same(source, "View", [], { calls });
    for (const view of views) {
      (view.querySelector(".go") as HTMLElement).click();
      (view.querySelector(".stop") as HTMLElement).click();
    }
    const once = ["button", "mid", "outer", "stop"];
    expect(calls).toEqual([...once, ...once]);
  });
});

describe("compiled pipeline — hydration", () => {
  it("hydrates server HTML rendered from the same components, keeping the real elements", () => {
    const label = signal("a");
    const items = signal(["x", "y"]);
    const clicks: string[] = [];
    const source = `
      @Component()
      class View extends StatefulComponent {
        render() {
          return (
            <main class="page">
              <h1 class="title">{() => label()}</h1>
              <p class="mixed">count: {() => items().length}<span>!</span></p>
              <ul class="items">{() => items().map((item) => <li class="item" onClick={() => { clicks.push(item); }}>{item}</li>)}</ul>
              <footer>{label()}</footer>
            </main>
          );
        }
      }
      return { View };
    `;
    const server = mount(() => h(load(source, false, { label, items, clicks }).View, null));
    const container = document.createElement("div");
    container.setAttribute("data-praxis-ssg", "");
    container.innerHTML = server.innerHTML;
    document.body.appendChild(container);
    containers.push(container);
    const realTitle = container.querySelector("h1");
    (runtime.enableHydration as () => void)();
    runtime.render(() => h(load(source, true, { label, items, clicks }).View, null), container);
    expect(container.querySelector("h1")).toBe(realTitle);
    expect(html(container)).toBe(html(server));

    label.set("b");
    items.set(["x", "y", "z"]);
    expect(container.querySelector("h1")?.textContent).toBe("b");
    expect(container.querySelector(".mixed")?.textContent).toBe("count: 3!");
    (container.querySelectorAll("li")[2] as HTMLElement).click();
    (container.querySelectorAll("li")[0] as HTMLElement).click();
    expect(clicks).toEqual(["z", "x"]);
  });
});
