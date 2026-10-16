// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { getComponentAnchor, signal } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { getCurrentScope } from "../context";
import { mountElement } from "../element";
import { acceptsHotUpdate, registerHot } from "../hmr";
import { For, render } from "../index";
import { Scope } from "../scope";

// Every mounted component of this file is tracked: hot replacement turns on with the first
// registration and stays on for the module.

const log: string[] = [];

function version(label: string, tag = "p") {
  return class extends StatefulComponent {
    static __isComponent = true as const;
    static __isStateless = false;
    onMount() { log.push(`mount ${label}`); }
    onUnmount() { log.push(`unmount ${label}`); }
    render() {
      log.push(`render ${label}`);
      return mountElement(tag, { class: label, children: label }, getCurrentScope());
    }
  };
}

// Runs the queued microtasks (remounts and onMount drains) until none is left.
function stubMicrotasks(): () => void {
  const jobs: Array<() => void> = [];
  vi.stubGlobal("queueMicrotask", (fn: () => void) => { jobs.push(fn); });
  return () => {
    while (jobs.length > 0) (jobs.shift() as () => void)();
  };
}

function mount(factory: () => Node | Node[] | null): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(factory, container);
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  log.length = 0;
  document.body.innerHTML = "";
});

describe("hot replacement of components", () => {
  it("mounts every instance of an updated class again with the new class, in place", () => {
    const run = stubMicrotasks();
    const V1 = version("one");
    expect(registerHot(V1, "/app.tsx#App")).toBe(true);
    const container = mount(() => [
      document.createTextNode("("),
      ...mountComponent(V1, {}, getCurrentScope()),
      ...mountComponent(V1, {}, getCurrentScope()),
      document.createTextNode(")"),
    ]);
    run();
    expect(container.innerHTML).toBe('(<!--[]--><p class="one">one</p><!--[/]--><!--[]--><p class="one">one</p><!--[/]-->)');
    log.length = 0;

    registerHot(version("two"), "/app.tsx#App");
    run();
    expect(container.textContent).toBe("(twotwo)");
    expect(log).toEqual(["unmount one", "render two", "unmount one", "render two", "mount two", "mount two"]);
  });

  it("keeps the bounds a reactive child and a list hold, and mounts the newest class from an old reference", () => {
    const run = stubMicrotasks();
    const V1 = version("one", "li");
    registerHot(V1, "/row.tsx#Row");
    const show = signal(true);
    const rows = signal([1, 2, 3]);
    const container = mount(() => [
      mountElement("div", { children: () => (show() ? mountComponent(V1, {}, getCurrentScope()) : null) }, getCurrentScope()),
      mountElement("ul", { children: mountComponent(For as never, { each: rows, children: () => mountComponent(V1, {}, getCurrentScope()) }, getCurrentScope()) }, getCurrentScope()),
    ]);
    run();
    registerHot(version("two", "li"), "/row.tsx#Row");
    run();
    expect(container.textContent).toBe("twotwotwotwo");

    rows.set([3, 1]);
    expect(container.querySelector("ul")?.textContent).toBe("twotwo");
    show.set(false);
    expect(container.querySelector("div")?.innerHTML).toBe("<!---->");
    show.set(true);
    expect(container.querySelector("div")?.textContent).toBe("two");
    rows.set([1, 2, 3, 4]);
    expect(container.querySelectorAll("li.two")).toHaveLength(5);
  });

  it("renders a parent and its child updated together once each, and anchors the new instance", () => {
    const run = stubMicrotasks();
    const Child1 = version("child");
    registerHot(Child1, "/child.tsx#Child");
    let parentRenders = 0;
    let instance: object | null = null;
    const parent = (label: string) => class extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        parentRenders++;
        instance = this;
        return mountElement("section", { "data-v": label, children: mountComponent(Child1, {}, getCurrentScope()) }, getCurrentScope());
      }
    };
    const Parent1 = parent("1");
    registerHot(Parent1, "/parent.tsx#Parent");
    run();
    const view = mount(() => mountComponent(Parent1, {}, getCurrentScope()));
    run();
    parentRenders = 0;
    log.length = 0;

    registerHot(parent("2"), "/parent.tsx#Parent");
    registerHot(version("child 2"), "/child.tsx#Child");
    run();
    expect(parentRenders).toBe(1);
    expect(log.filter((l) => l.startsWith("render"))).toEqual(["render child 2"]);
    expect(view.querySelector("section")?.getAttribute("data-v")).toBe("2");
    expect(getComponentAnchor(instance as unknown as object)?.parentNode).toBe(view);
  });

  it("leaves a detached instance as it is, and stops tracking disposed ones", () => {
    const run = stubMicrotasks();
    const V1 = version("one");
    registerHot(V1, "/aside.tsx#Aside");
    const scope = new Scope();
    const kept = mountComponent(V1, {}, scope);
    for (const node of kept) node.parentNode?.removeChild(node);
    const gone = new Scope();
    mountComponent(V1, {}, gone);
    gone.dispose();
    run();
    log.length = 0;
    registerHot(version("two"), "/aside.tsx#Aside");
    run();
    expect(log).toEqual([]);
    expect((kept[1] as Element).className).toBe("one");
  });

  it("does not resolve a subclass of a registered class to its base", () => {
    stubMicrotasks();
    const Base = version("base");
    registerHot(Base, "/base.tsx#Base");
    class Sub extends Base {
      render() { return mountElement("b", { children: "sub" }, getCurrentScope()); }
    }
    const nodes = mountComponent(Sub, {}, new Scope());
    expect((nodes[0] as Element).textContent).toBe("sub");
  });

  it("reports the first error of a remount after mounting the others", () => {
    const run = stubMicrotasks();
    const V1 = version("one");
    registerHot(V1, "/err.tsx#Err");
    const container = mount(() => [0, 1, 2].flatMap(() => mountComponent(V1, {}, getCurrentScope())));
    run();
    let built = 0;
    const Broken = class extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      constructor(props: Record<string, unknown>) {
        super(props);
        built++;
        if (built < 3) throw new Error(`broken constructor ${String(built)}`);
      }
      render() { return document.createTextNode("fixed"); }
    };
    registerHot(Broken, "/err.tsx#Err");
    expect(run).toThrow("broken constructor 1");
    expect(container.textContent).toBe("fixed");
  });

  it("registers components only, and accepts an update whose exports are all registered components", () => {
    const A = version("a");
    const B = version("b");
    registerHot(A, "/mod.tsx#A");
    expect(registerHot(B, "/mod.tsx#B")).toBe(true);
    expect(registerHot(B, "/mod.tsx#B")).toBe(true);
    expect(registerHot(class Plain {}, "/mod.tsx#Plain")).toBe(false);
    expect(registerHot("text", "/mod.tsx#text")).toBe(false);
    expect(acceptsHotUpdate({ A, B })).toBe(true);
    expect(acceptsHotUpdate({ A, helper: () => 1 })).toBe(false);
    expect(acceptsHotUpdate({ A, value: 1 })).toBe(false);
    expect(acceptsHotUpdate({ Plain: class {} })).toBe(false);
    expect(acceptsHotUpdate({})).toBe(false);
    expect(acceptsHotUpdate(undefined)).toBe(false);
  });
});
