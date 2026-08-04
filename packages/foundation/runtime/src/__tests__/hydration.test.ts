// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { isServerRenderPass, setServerRenderPass, signal } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { getCurrentScope } from "../context";
import { mountElement } from "../element";
import { reconcile } from "../hydration";
import { registerReactiveNode } from "../hydration-context";
import { render, Portal } from "../index";
import { Scope } from "../scope";

const SSG_MARKER = "data-praxis-ssg";

/** Renders `factory` into a throwaway container and returns the resulting markup, simulating SSR output. */
function ssrHTML(factory: () => Node | Node[] | null): string {
  const serverContainer = document.createElement("div");
  const unmount = render(factory, serverContainer);
  const html = serverContainer.innerHTML;
  unmount();
  return html;
}

function hydratable(factory: () => Node | Node[] | null): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = ssrHTML(factory);
  container.setAttribute(SSG_MARKER, "1");
  document.body.appendChild(container);
  return container;
}

afterEach(() => { setServerRenderPass(false); });

describe("render() — hydration (build + reconcile)", () => {
  it("adopts a flat element instead of recreating it", () => {
    const factory = () => mountElement("p", { id: "greet", children: "hello" }, new Scope());
    const container = hydratable(factory);
    const serverEl = container.querySelector("#greet");
    expect(serverEl).not.toBeNull();

    render(factory, container);

    expect(container.querySelector("#greet")).toBe(serverEl);
    document.body.removeChild(container);
  });

  it("adopts nested elements at every level — the case that broke the ambient-cursor attempt", () => {
    const factory = () => mountElement("div", {
      id: "outer",
      children: mountElement("span", { id: "inner", children: "text" }, new Scope()),
    }, new Scope());
    const container = hydratable(factory);
    const outerBefore = container.querySelector("#outer");
    const innerBefore = container.querySelector("#inner");

    render(factory, container);

    expect(container.querySelector("#outer")).toBe(outerBefore);
    expect(container.querySelector("#inner")).toBe(innerBefore);
    expect(container.textContent).toBe("text");
    document.body.removeChild(container);
  });

  it("adopts three levels deep with siblings at each level", () => {
    const factory = () => mountElement("ul", {
      id: "list",
      children: [
        mountElement("li", { id: "a", children: mountElement("b", { children: "1" }, new Scope()) }, new Scope()),
        mountElement("li", { id: "b", children: "2" }, new Scope()),
      ],
    }, new Scope());
    const container = hydratable(factory);
    const before = {
      list: container.querySelector("#list"),
      a: container.querySelector("#a"),
      b: container.querySelector("#b"),
      bold: container.querySelector("b"),
    };

    render(factory, container);

    expect(container.querySelector("#list")).toBe(before.list);
    expect(container.querySelector("#a")).toBe(before.a);
    expect(container.querySelector("#b")).toBe(before.b);
    expect(container.querySelector("b")).toBe(before.bold);
    document.body.removeChild(container);
  });

  it("wires event listeners onto the adopted (real) element via replay", () => {
    let clicks = 0;
    const factory = () => mountElement("div", {
      children: mountElement("button", { onClick: () => { clicks++; }, children: "Click" }, new Scope()),
    }, new Scope());
    const container = hydratable(factory);
    const buttonBefore = container.querySelector("button");

    render(factory, container);

    expect(container.querySelector("button")).toBe(buttonBefore);
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);
    document.body.removeChild(container);
  });

  it("hydrates reactive text and keeps reacting to signal changes afterwards", () => {
    const text = signal("initial");
    const factory = () => mountElement("span", { children: () => text() }, new Scope());
    const container = hydratable(factory);
    expect(container.textContent).toBe("initial");

    render(factory, container);

    text.set("updated");
    expect(container.textContent).toBe("updated");
    text.set("initial");
    document.body.removeChild(container);
  });

  it("hydrates a reactive list of elements, keeping real nodes, and stays correct after a later update", () => {
    const items = signal(["a", "b", "c"]);
    const factory = () => mountElement("ul", {
      id: "list",
      children: () => items().map((item) => mountElement("li", { children: item }, new Scope())),
    }, new Scope());
    const container = hydratable(factory);
    const list = container.querySelector("#list") as HTMLElement;
    const firstLiBefore = list.querySelector("li");
    expect(container.textContent).toBe("abc");

    render(factory, container);

    expect(container.querySelector("#list")?.querySelector("li")).toBe(firstLiBefore);
    expect(container.textContent).toBe("abc");

    // A subsequent reactive update must diff correctly — this only works if
    // reconcile() rewrote mountReactive's `currentNodes` bookkeeping in place
    // when it kept the real <li> elements instead of the fresh ones.
    items.set(["x", "y"]);
    expect(container.textContent).toBe("xy");
    items.set(["z"]);
    expect(container.textContent).toBe("z");
    document.body.removeChild(container);
  });

  it("hydrates a component nested inside another component, firing onMount/onUnmount correctly", async () => {
    class Inner extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onMount() {}
      onUnmount() {}
      render() { return mountElement("em", { children: "inner" }, getCurrentScope()); }
    }
    class Outer extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onMount() {}
      render() {
        return mountElement("section", {
          children: mountComponent(Inner, {}, getCurrentScope()),
        }, getCurrentScope());
      }
    }

    const factory = () => mountComponent(Outer, {}, getCurrentScope());
    const container = hydratable(factory);
    const emBefore = container.querySelector("em");

    const outerMount = vi.spyOn(Outer.prototype, "onMount");
    const innerMount = vi.spyOn(Inner.prototype, "onMount");
    const innerUnmount = vi.spyOn(Inner.prototype, "onUnmount");
    const dispose = render(factory, container);
    await Promise.resolve();

    expect(outerMount).toHaveBeenCalledOnce();
    expect(innerMount).toHaveBeenCalledOnce();
    expect(container.querySelector("em")).toBe(emBefore);
    expect(container.textContent).toBe("inner");

    dispose();
    expect(innerUnmount).toHaveBeenCalledOnce();

    outerMount.mockRestore();
    innerMount.mockRestore();
    innerUnmount.mockRestore();
    document.body.removeChild(container);
  });

  it("a tag mismatch at one node replaces only that node — siblings stay adopted", () => {
    const factory = () => mountElement("div", {
      id: "wrap",
      children: [
        mountElement("p", { id: "before", children: "before" }, new Scope()),
        mountElement("span", { id: "target", children: "new" }, new Scope()),
        mountElement("p", { id: "after", children: "after" }, new Scope()),
      ],
    }, new Scope());

    const container = document.createElement("div");
    container.innerHTML =
      '<div id="wrap"><p id="before">before</p><strong id="target">old</strong><p id="after">after</p></div>';
    container.setAttribute(SSG_MARKER, "1");
    document.body.appendChild(container);

    const beforeEl = container.querySelector("#before");
    const afterEl = container.querySelector("#after");

    render(factory, container);

    expect(container.querySelector("#before")).toBe(beforeEl);
    expect(container.querySelector("#after")).toBe(afterEl);
    expect(container.querySelector("#target")?.tagName.toLowerCase()).toBe("span");
    expect(container.textContent).toBe("beforenewafter");
    document.body.removeChild(container);
  });

  it("appends extra fresh nodes when the real DOM has fewer children than the fresh tree", () => {
    // Client factory produces three items; the server only rendered two —
    // exercises reconcile()'s mismatch branch once realCursor has run out.
    const factory = () => mountElement("ul", {
      id: "list",
      children: [
        mountElement("li", { id: "a", children: "a" }, new Scope()),
        mountElement("li", { id: "b", children: "b" }, new Scope()),
        mountElement("li", { id: "c", children: "c" }, new Scope()),
      ],
    }, new Scope());

    const container = document.createElement("div");
    container.innerHTML = '<ul id="list"><li id="a">a</li><li id="b">b</li></ul>';
    container.setAttribute(SSG_MARKER, "1");
    document.body.appendChild(container);

    const aBefore = container.querySelector("#a");
    const bBefore = container.querySelector("#b");

    render(factory, container);

    expect(container.querySelector("#a")).toBe(aBefore);
    expect(container.querySelector("#b")).toBe(bBefore);
    expect(container.querySelector("#c")?.textContent).toBe("c");
    expect(container.querySelectorAll("#list > li")).toHaveLength(3);
    document.body.removeChild(container);
  });

  it("keeps the real element even when its fresh counterpart bypassed mountElement (nothing recorded to replay)", () => {
    class RawComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        const el = document.createElement("mark");
        el.id = "raw";
        el.textContent = "raw content";
        return el;
      }
    }

    const factory = () => mountComponent(RawComp, {}, getCurrentScope());
    const container = hydratable(factory);
    const markBefore = container.querySelector("#raw");

    render(factory, container);

    expect(container.querySelector("#raw")).toBe(markBefore);
    expect(container.textContent).toBe("raw content");
    document.body.removeChild(container);
  });

  it("removes trailing real nodes the fresh tree no longer produces", () => {
    // Server rendered three items; the client factory only produces two —
    // exercises reconcile()'s cleanup loop for leftover real siblings past
    // the end of freshChildren.
    const factory = () => mountElement("ul", {
      id: "list",
      children: [
        mountElement("li", { id: "a", children: "a" }, new Scope()),
        mountElement("li", { id: "b", children: "b" }, new Scope()),
      ],
    }, new Scope());

    const container = document.createElement("div");
    container.innerHTML =
      '<ul id="list"><li id="a">a</li><li id="b">b</li><li id="c">c</li></ul>';
    container.setAttribute(SSG_MARKER, "1");
    document.body.appendChild(container);

    const aBefore = container.querySelector("#a");
    const bBefore = container.querySelector("#b");

    render(factory, container);

    expect(container.querySelector("#a")).toBe(aBefore);
    expect(container.querySelector("#b")).toBe(bBefore);
    expect(container.querySelector("#c")).toBeNull();
    expect(container.querySelectorAll("#list > li")).toHaveLength(2);
    document.body.removeChild(container);
  });

  it("reconcile() is a safe no-op when a fresh node's registered reactive owner doesn't actually contain it", () => {
    // Defensive guard in notifyReplacement(): registerReactiveNode() always
    // registers a node into the exact array collectNodes() just built it
    // into, so indexOf() finding nothing shouldn't happen through normal
    // mounting — this exercises that branch directly, at the unit level, to
    // confirm the guard degrades safely (no throw, no corruption) rather
    // than silently trusting it can never occur.
    const fresh = document.createElement("span");
    const bogusOwner: Node[] = [];
    registerReactiveNode(fresh, bogusOwner);

    const container = document.createElement("div");
    const real = document.createElement("span");
    container.appendChild(real);

    expect(() => { reconcile(container, [fresh]); }).not.toThrow();
    expect(bogusOwner).toEqual([]);
    expect(container.firstChild).toBe(real);
  });

  it("plain client render (no SSG marker) is completely unaffected", () => {
    const factory = () => mountElement("p", { children: "hello" }, new Scope());
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(factory, container);

    expect(container.textContent).toBe("hello");
    document.body.removeChild(container);
  });
});

describe("Portal — server render pass", () => {
  it("renders nothing into the target during a server render pass", () => {
    setServerRenderPass(true);
    expect(isServerRenderPass()).toBe(true);

    const target = document.createElement("div");
    document.body.appendChild(target);
    const scope = new Scope();
    const nodes = mountComponent(Portal, { to: target, children: document.createTextNode("hi") }, scope);

    expect(target.textContent).toBe("");
    expect(nodes.every((n) => n.nodeType === Node.COMMENT_NODE)).toBe(true);
    scope.dispose();
    document.body.removeChild(target);
  });

  it("mounts normally on the client once the server pass is over", () => {
    setServerRenderPass(false);
    const target = document.createElement("div");
    document.body.appendChild(target);
    const scope = new Scope();

    mountComponent(Portal, { to: target, children: document.createTextNode("hi") }, scope);

    expect(target.textContent).toBe("hi");
    scope.dispose();
    document.body.removeChild(target);
  });
});
