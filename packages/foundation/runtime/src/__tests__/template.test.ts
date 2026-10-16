// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { getCurrentScope as runtimeScope, runInScope } from "../context";
import { getRecordedProps, isRecording, runInRecording } from "../hydration-context";
import { addEventRoot } from "../dom/events";
import { Scope } from "../scope";
import {
  className,
  element,
  event,
  html,
  insert,
  insertOnly,
  MARKER,
  on,
  onEvent,
  prop,
  reactive,
  reactiveOnly,
  syncTemplateDocument,
  template,
} from "../template";

function inScope<T>(fn: () => T): T {
  return runInScope(new Scope(), fn);
}

describe("element()", () => {
  it("builds static attributes, text, markers and nested elements", () => {
    const el = element("ul", { class: "list", id: "l", "data-x": 1, hidden: null }, [
      element("li", null, ["one"]),
      MARKER,
      ["a", element("li", null, null)],
      document.createElement("hr"),
      null,
    ]);
    expect(el.outerHTML).toBe('<ul class="list" id="l" data-x="1"><li>one</li><!---->a<li></li><hr></ul>');
  });

  it("applies htmlFor as the for attribute", () => {
    expect(element("label", { htmlFor: "name" }, null).getAttribute("for")).toBe("name");
  });
});

describe("template()", () => {
  it("builds once and returns a fresh clone on every call", () => {
    const build = vi.fn(() => element("p", { class: "x" }, ["hi"]));
    const clone = template(build);
    const a = clone();
    const b = clone();
    expect(build).toHaveBeenCalledOnce();
    expect(a).not.toBe(b);
    expect(a.outerHTML).toBe('<p class="x">hi</p>');
  });

  it("replays props that cloning would lose on every clone", () => {
    class Fancy extends HTMLElement {
      data: unknown;
    }
    customElements.define("x-fancy-template", Fancy);
    const payload = { a: 1 };
    const clone = template(() =>
      element("div", null, [element("span", null, null), element("x-fancy-template", { data: payload }, null)]),
    );
    const first = clone().lastChild as Fancy;
    const second = clone().lastChild as Fancy;
    expect(first.data).toBe(payload);
    expect(second.data).toBe(payload);
  });

  it("keeps the patches of a template built while another one builds", () => {
    const inner = template(() => element("x-fancy-template", { data: 2 }, null));
    const outer = template(() => element("div", null, [inner()]));
    expect((outer().firstChild as unknown as { data: unknown }).data).toBe(2);
  });

  it("records replayed props during a hydration build pass", () => {
    const clone = template(() => element("x-fancy-template", { data: 3 }, null));
    const el = runInRecording(() => inScope(() => clone()));
    expect(getRecordedProps(el)?.props).toEqual({ data: 3 });
  });

  it("drops the patch list when a build throws, so the next call builds again", () => {
    let fail = true;
    const clone = template(() => {
      if (fail) throw new Error("boom");
      return element("i", null, null);
    });
    expect(() => clone()).toThrow("boom");
    fail = false;
    expect(clone().tagName).toBe("I");
  });
});

describe("bindings", () => {
  it("prop() applies a dynamic prop and records it while hydrating", () => {
    const el = document.createElement("div");
    const cls = signal("a");
    const scope = new Scope();
    runInRecording(() => {
      prop(el, "class", () => cls(), scope);
      prop(el, "title", "t", scope);
    });
    expect(el.className).toBe("a");
    cls.set("b");
    expect(el.className).toBe("b");
    expect(Object.keys(getRecordedProps(el)?.props ?? {})).toEqual(["class", "title"]);
    prop(el, "id", "x", scope);
    expect(el.id).toBe("x");
  });

  it("reactive() mounts before the template's marker", () => {
    const parent = element("p", null, ["a", MARKER, "c"]);
    const value = signal("b");
    reactive(parent.childNodes[1], () => value(), new Scope());
    expect(parent.textContent).toBe("abc");
    value.set("B");
    expect(parent.textContent).toBe("aBc");
  });

  it("reactiveOnly() writes text into the placeholder and swaps to nodes when needed", () => {
    const parent = element("a", null, [""]);
    const placeholder = parent.firstChild;
    const value = signal<unknown>("x");
    const scope = new Scope();
    inScope(() => { reactiveOnly(parent, () => value(), scope); });
    expect(parent.firstChild).toBe(placeholder);
    expect(parent.textContent).toBe("x");
    value.set(document.createElement("b"));
    expect(parent.innerHTML).toBe("<b></b>");
    value.set(7);
    expect(parent.textContent).toBe("7");
  });

  it("reactiveOnly() fills an empty element with text, swaps to nodes and back, and handles empty text", () => {
    const parent = element("a", null, null);
    const value = signal<unknown>("x");
    inScope(() => { reactiveOnly(parent, () => value(), new Scope()); });
    expect(parent.innerHTML).toBe("x");
    value.set("y");
    expect(parent.innerHTML).toBe("y");
    value.set(document.createElement("b"));
    expect(parent.innerHTML).toBe("<b></b>");
    value.set("z");
    expect(parent.innerHTML).toBe("z");

    const empty = element("a", null, null);
    const text = signal("");
    reactiveOnly(empty, () => text(), new Scope());
    expect(empty.childNodes).toHaveLength(1);
    text.set("now");
    expect(empty.textContent).toBe("now");
    expect(empty.childNodes).toHaveLength(1);
  });

  it("isRecording() reports a hydration build pass", () => {
    expect(isRecording()).toBe(false);
    expect(runInRecording(() => isRecording())).toBe(true);
    expect(isRecording()).toBe(false);
  });

  it("reactiveOnly() gives a hydration build pass a text node to write into", () => {
    const parent = element("a", null, null);
    runInRecording(() => { reactiveOnly(parent, () => "x", new Scope()); });
    expect(parent.childNodes).toHaveLength(1);
    expect(parent.textContent).toBe("x");
  });

  it("reactiveOnly() forks a child scope only once a run asks for one, and reuses it", () => {
    const parent = element("a", null, null);
    const scope = new Scope();
    const fork = vi.spyOn(scope, "fork");
    const show = signal(false);
    const cleanup = vi.fn();
    reactiveOnly(parent, () => {
      if (!show()) return "text";
      runtimeScope().add(cleanup);
      return element("b", null, null);
    }, scope);
    expect(fork).not.toHaveBeenCalled();
    show.set(true);
    expect(fork).toHaveBeenCalledOnce();
    expect(parent.innerHTML).toBe("<b></b>");
    show.set(false);
    expect(cleanup).toHaveBeenCalledOnce();
    show.set(true);
    expect(fork).toHaveBeenCalledOnce();
    scope.dispose();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("reactive() text before a marker is updated and removed in place", () => {
    const parent = element("p", null, ["a", MARKER, "c"]);
    const value = signal<unknown>(1);
    reactive(parent.childNodes[1], () => value(), new Scope());
    expect(parent.textContent).toBe("a1c");
    value.set(2);
    expect(parent.textContent).toBe("a2c");
    value.set(null);
    expect(parent.textContent).toBe("ac");
  });

  it("insertOnly() fills the empty element with text, or mounts other children", () => {
    const text = element("td", null, null);
    insertOnly(text, 5, new Scope());
    expect(text.innerHTML).toBe("5");
    insertOnly(text, "x", new Scope());
    expect(text.innerHTML).toBe("x");

    const empty = element("td", null, null);
    insertOnly(empty, "", new Scope());
    expect(empty.childNodes).toHaveLength(1);
    expect(empty.firstChild?.nodeType).toBe(Node.TEXT_NODE);

    const nodes = element("td", null, null);
    insertOnly(nodes, [document.createElement("i"), "x"], new Scope());
    expect(nodes.innerHTML).toBe("<i></i>x");
  });

  it("insert() places every kind of child before the reference, or at the end", () => {
    const parent = element("div", null, [element("hr", null, null)]);
    const hr = parent.firstChild;
    const scope = new Scope();
    const live = signal("r");
    insert(parent, "s", hr, scope);
    insert(parent, 1, hr, scope);
    insert(parent, document.createElement("b"), hr, scope);
    insert(parent, () => live(), hr, scope);
    insert(parent, ["x", document.createElement("i")], hr, scope);
    insert(parent, "end", null, scope);
    expect(parent.innerHTML).toBe("s1<b></b>r<!---->x<i></i><hr>end");
    live.set("R");
    expect(parent.innerHTML).toBe("s1<b></b>R<!---->x<i></i><hr>end");
  });
});

describe("template documents", () => {
  it("builds and clones in the inert template document, which the insertion adopts", () => {
    const clone = template(() => element("ul", { class: "x" }, [element("li", null, ["a", MARKER])]));
    const node = clone();
    expect(node.ownerDocument).not.toBe(document);
    expect(node.outerHTML).toBe('<ul class="x"><li>a<!----></li></ul>');
    document.body.appendChild(node);
    expect(node.ownerDocument).toBe(document);
    node.remove();
  });

  it("keeps a template with a custom element in the live document, where it is upgraded", () => {
    class Upgraded extends HTMLElement {}
    customElements.define("x-upgraded-template", Upgraded);
    const clone = template(() => element("div", null, [element("x-upgraded-template", null, null)]));
    const node = clone();
    expect(node.ownerDocument).toBe(document);
    expect(node.firstChild).toBeInstanceOf(Upgraded);
  });

  it("moves a template to the live document when it holds a clone of a live one", () => {
    class Inner extends HTMLElement {}
    customElements.define("x-inner-template", Inner);
    const inner = template(() => element("x-inner-template", null, null));
    const outer = template(() => element("section", null, [inner(), element("p", null, null)]));
    const node = outer();
    expect(node.ownerDocument).toBe(document);
    expect(node.firstChild).toBeInstanceOf(Inner);
    const plain = template(() => element("b", null, null));
    expect(plain().ownerDocument).not.toBe(document);
  });

  it("builds every template again once render() runs with another global document", () => {
    const build = vi.fn(() => element("p", { class: "x" }, ["a"]));
    const clone = template(build);
    syncTemplateDocument();
    const first = clone().ownerDocument;
    syncTemplateDocument();
    clone();
    expect(build).toHaveBeenCalledOnce();

    const other = document.implementation.createHTMLDocument("other");
    vi.stubGlobal("document", other);
    try {
      syncTemplateDocument();
      const node = clone();
      expect(build).toHaveBeenCalledTimes(2);
      expect(node.ownerDocument).not.toBe(first);
      expect(node.outerHTML).toBe('<p class="x">a</p>');
      clone();
      expect(build).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
    syncTemplateDocument();
    clone();
    expect(build).toHaveBeenCalledTimes(3);
  });
});

describe("html()", () => {
  it("parses the markup once, in the inert template document, and clones it on every call", () => {
    html("<b>")();
    const create = vi.spyOn(Document.prototype, "createElement");
    const clone = html("<table><tbody><tr><td class=a>x<!----></td></tr></tbody></table>");
    expect(create).not.toHaveBeenCalled();
    const first = clone();
    const second = clone();
    expect(create.mock.calls).toEqual([["template"]]);
    create.mockRestore();
    expect(first).not.toBe(second);
    expect(first.ownerDocument).not.toBe(document);
    expect(first.outerHTML).toBe('<table><tbody><tr><td class="a">x<!----></td></tr></tbody></table>');
    expect(second.outerHTML).toBe(first.outerHTML);
    const row = html("<tr><td>a</td><td>b")();
    expect(row.outerHTML).toBe("<tr><td>a</td><td>b</td></tr>");
  });

  it("parses again once render() runs with another global document", () => {
    const clone = html("<p class=x>a");
    syncTemplateDocument();
    const first = clone().ownerDocument;
    const other = document.implementation.createHTMLDocument("other");
    vi.stubGlobal("document", other);
    try {
      syncTemplateDocument();
      const node = clone();
      expect(node.ownerDocument).not.toBe(first);
      expect(node.outerHTML).toBe('<p class="x">a</p>');
    } finally {
      vi.unstubAllGlobals();
    }
    syncTemplateDocument();
  });
});

describe("insert() with arrays", () => {
  it("inserts every item in order before the reference, nested arrays included", () => {
    const parent = element("div", null, [element("hr", null, null)]);
    const hr = parent.firstChild;
    const live = signal("r");
    insert(parent, ["a", [document.createElement("b"), 1], null, false, () => live()], hr, new Scope());
    expect(parent.innerHTML).toBe("a<b></b>1r<!----><hr>");
    live.set("R");
    expect(parent.innerHTML).toBe("a<b></b>1R<!----><hr>");
  });
});

describe("delegated event props", () => {
  let removeRoot: (() => void) | null = null;
  afterEach(() => {
    removeRoot?.();
    removeRoot = null;
  });

  function build(attach = true) {
    const container = document.createElement("main");
    const root = element("div", null, [element("p", null, [element("button", null, ["a"])]), element("button", null, ["b"])]) as HTMLElement;
    container.appendChild(root);
    if (attach) document.body.appendChild(container);
    removeRoot = addEventRoot(container);
    const first = root.querySelector("button") as HTMLButtonElement;
    const second = root.lastChild as HTMLButtonElement;
    return { container, root, first, second };
  }

  it("attaches an element's listener on demand, so the handler runs as if bound directly", () => {
    const { container, first, second } = build();
    const scope = new Scope();
    const add = vi.spyOn(first, "addEventListener");
    const seen: Array<[unknown, unknown, number]> = [];
    on(first, "onClick", function (this: unknown, e: Event) { seen.push([this, e.currentTarget, e.eventPhase]); }, scope);
    on(second, "onClick", () => { seen.push(["second", null, 0]); }, scope);
    expect(add).not.toHaveBeenCalled();
    first.click();
    expect(seen).toEqual([[first, first, Event.AT_TARGET]]);
    first.click();
    expect(add).toHaveBeenCalledOnce();
    expect(seen).toHaveLength(2);
    second.click();
    expect(seen[2][0]).toBe("second");
    container.remove();
  });

  it("runs on trees that are not in the document, through their render container, events that do not bubble included", () => {
    const { first } = build(false);
    const handler = vi.fn();
    on(first, "onInput", handler, new Scope());
    first.dispatchEvent(new Event("input"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("keeps stopPropagation and the order relative to listeners above the element", () => {
    const { container, root, first } = build();
    const order: string[] = [];
    const onBody = () => { order.push("body"); };
    document.body.addEventListener("click", onBody);
    root.addEventListener("click", () => { order.push("root"); });
    on(first, "onClick", (e: Event) => {
      order.push("first");
      if (order.length > 2) e.stopPropagation();
    }, new Scope());
    first.click();
    first.click();
    expect(order).toEqual(["first", "root", "body", "first"]);
    document.body.removeEventListener("click", onBody);
    container.remove();
  });

  it("stops calling a handler once its scope is disposed, and binds again from another scope", () => {
    const { container, first } = build();
    const handler = vi.fn();
    const scope = new Scope();
    on(first, "onClick", handler, scope);
    scope.dispose();
    first.click();
    expect(handler).not.toHaveBeenCalled();
    const later = vi.fn();
    on(first, "onClick", later, new Scope());
    first.click();
    expect(later).toHaveBeenCalledOnce();
    container.remove();
  });

  it("falls back to a listener of its own outside any render container, or for a non-function handler", () => {
    const el = document.createElement("button");
    const handler = vi.fn();
    on(el, "onClick", handler, new Scope());
    el.click();
    expect(handler).toHaveBeenCalledOnce();

    const { container, first } = build(false);
    const object = { handleEvent: vi.fn() };
    on(first, "onClick", object, new Scope());
    on(first, "onClick", null, new Scope());
    first.click();
    expect(object.handleEvent).toHaveBeenCalledOnce();
    container.remove();
  });

  it("falls back to a listener of its own on an element another scope bound", () => {
    const { container, first } = build();
    const click = vi.fn();
    const input = vi.fn();
    on(first, "onClick", click, new Scope());
    const add = vi.spyOn(first, "addEventListener");
    on(first, "onInput", input, new Scope());
    expect(add).toHaveBeenCalledOnce();
    first.dispatchEvent(new Event("input"));
    first.click();
    expect(input).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    container.remove();
  });

  it("treats props that are not events as props", () => {
    const { container, first } = build();
    on(first, "onWhatever", "x", new Scope());
    expect(first.getAttribute("onWhatever")).toBe("x");
    container.remove();
  });

  it("covers roots registered before and after a type is first used, and stops when a root is removed", () => {
    const early = build(false);
    const handler = vi.fn();
    on(early.first, "onKeyDown", handler, new Scope());
    const removeEarly = removeRoot as () => void;
    removeRoot = null;
    const late = build(false);
    const lateHandler = vi.fn();
    on(late.first, "onKeyDown", lateHandler, new Scope());
    late.first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    expect(lateHandler).toHaveBeenCalledOnce();
    removeEarly();
    early.first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("records the prop during a hydration build pass", () => {
    const { container, first } = build();
    const handler = vi.fn();
    runInRecording(() => { on(first, "onClick", handler, new Scope()); });
    expect(getRecordedProps(first)?.props).toEqual({ onClick: handler });
    container.remove();
  });

  it("event() resolves an event prop to its delegated entry once, and leaves other keys as they are", () => {
    const click = event("onClick");
    expect(click).toBe(event("onClick"));
    expect(click).toMatchObject({ key: "onClick", type: "click" });
    expect(event("onWhatever")).toBe("onWhatever");
  });

  it("onEvent() binds through the resolved entry, like on()", () => {
    const { container, first, second } = build();
    const scope = new Scope();
    const add = vi.spyOn(first, "addEventListener");
    const seen: unknown[] = [];
    onEvent(first, event("onClick"), function (this: unknown, e: Event) { seen.push([this, e.currentTarget]); }, scope);
    onEvent(second, event("onDblClick"), () => { seen.push("dbl"); }, scope);
    expect(add).not.toHaveBeenCalled();
    first.click();
    second.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(seen).toEqual([[first, first], "dbl"]);
    scope.dispose();
    first.click();
    expect(seen).toHaveLength(2);
    container.remove();
  });

  it("onEvent() binds a key that is not an event as a prop, and records both kinds while hydrating", () => {
    const { container, first } = build();
    const handler = vi.fn();
    runInRecording(() => {
      onEvent(first, event("onClick"), handler, new Scope());
      onEvent(first, event("onWhatever"), "x", new Scope());
    });
    expect(first.getAttribute("onWhatever")).toBe("x");
    expect(getRecordedProps(first)?.props).toEqual({ onClick: handler, onWhatever: "x" });
    first.click();
    expect(handler).toHaveBeenCalledOnce();
    container.remove();
  });
});

describe("className()", () => {
  function countWrites(el: Element): { count: number } {
    const writes = { count: 0 };
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "className") as PropertyDescriptor;
    Object.defineProperty(el, "className", {
      get(this: Element) { return descriptor.get?.call(this) as string; },
      set(this: Element, value: string) {
        writes.count++;
        descriptor.set?.call(this, value);
      },
    });
    return writes;
  }

  it("binds the class of an HTML element, removes it for null and skips writing an unchanged value", () => {
    const el = document.createElement("div");
    el.setAttribute("class", "pos");
    const writes = countWrites(el);
    const n = signal<number | null>(1);
    className(el, () => { const v = n(); return v === null ? null : v > 0 ? "pos" : "neg"; }, new Scope());
    expect(el.className).toBe("pos");
    expect(writes.count).toBe(0);
    n.set(2);
    expect(writes.count).toBe(0);
    n.set(-1);
    expect(writes.count).toBe(1);
    expect(el.className).toBe("neg");
    n.set(null);
    expect(el.hasAttribute("class")).toBe(false);
  });

  it("writes again when the value is the same object, as its string may have changed", () => {
    const el = document.createElement("div");
    let name = "a";
    const value = { toString: () => name };
    const tick = signal(0);
    className(el, () => { tick(); return value; }, new Scope());
    expect(el.className).toBe("a");
    name = "b";
    tick.set(1);
    expect(el.className).toBe("b");
  });

  it("sets the attribute on SVG elements and stops when its scope is disposed", () => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const cls = signal("a");
    const scope = new Scope();
    className(el, () => cls(), scope);
    expect(el.getAttribute("class")).toBe("a");
    scope.dispose();
    cls.set("b");
    expect(el.getAttribute("class")).toBe("a");
  });

  it("records the binding under class during a hydration build pass", () => {
    const el = document.createElement("div");
    const read = () => "x";
    runInRecording(() => { className(el, read, new Scope()); });
    expect(getRecordedProps(el)?.props).toEqual({ class: read });
    className(document.createElement("i"), read, new Scope());
  });
});
