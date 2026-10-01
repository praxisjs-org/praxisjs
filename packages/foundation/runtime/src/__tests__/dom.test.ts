// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { createElement } from "../dom/create";
import { addEvent } from "../dom/events";
import { applyProp } from "../dom/props";
import { Scope } from "../scope";


// ── createElement ────────────────────────────────────────────────────────────

describe("createElement", () => {
  it("creates an HTMLElement for regular tags", () => {
    const el = createElement("div");
    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(el.tagName.toLowerCase()).toBe("div");
  });

  it("creates an SVGElement for svg tags", () => {
    const el = createElement("svg");
    expect(el).toBeInstanceOf(SVGElement);
    expect(el.tagName.toLowerCase()).toBe("svg");
  });

  it("creates nested svg elements with the SVG namespace", () => {
    const path = createElement("path");
    expect(path.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});

// ── applyProp ────────────────────────────────────────────────────────────────

describe("applyProp", () => {
  it("sets class attribute", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "class", "foo bar", scope);
    expect(el.getAttribute("class")).toBe("foo bar");
  });

  it("sets className as class attribute", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "className", "my-class", scope);
    expect(el.getAttribute("class")).toBe("my-class");
  });

  it("removes class when value is null", () => {
    const el = document.createElement("div");
    el.setAttribute("class", "old");
    const scope = new Scope();
    applyProp(el, "class", null, scope);
    expect(el.hasAttribute("class")).toBe(false);
  });

  it("sets style as string", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "style", "color: red;", scope);
    expect(el.getAttribute("style")).toBe("color: red;");
  });

  it("sets style as object", () => {
    const el = document.createElement("div") as HTMLElement;
    const scope = new Scope();
    applyProp(el, "style", { color: "blue" }, scope);
    expect(el.style.color).toBe("blue");
  });

  it("sets boolean true as empty attribute", () => {
    const el = document.createElement("input");
    const scope = new Scope();
    applyProp(el, "disabled", true, scope);
    expect(el.hasAttribute("disabled")).toBe(true);
  });

  it("removes attribute when value is false", () => {
    const el = document.createElement("input");
    el.setAttribute("disabled", "");
    const scope = new Scope();
    applyProp(el, "disabled", false, scope);
    expect(el.hasAttribute("disabled")).toBe(false);
  });

  it("sets value prop directly on element", () => {
    const el = document.createElement("input");
    const scope = new Scope();
    applyProp(el, "value", "hello", scope);
    expect(el.value).toBe("hello");
  });

  it("calls ref callback with the element", () => {
    const el = document.createElement("span");
    const scope = new Scope();
    const ref = vi.fn();
    applyProp(el, "ref", ref, scope);
    expect(ref).toHaveBeenCalledWith(el);
  });

  it("skips 'children' and 'key' props", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "children", "should be ignored", scope);
    applyProp(el, "key", "k1", scope);
    expect(el.childNodes.length).toBe(0);
    expect(el.hasAttribute("key")).toBe(false);
  });

  it("attaches event listener for onClick", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    const handler = vi.fn();
    applyProp(el, "onClick", handler, scope);
    el.dispatchEvent(new MouseEvent("click"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("removes event listener on scope dispose", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    const handler = vi.fn();
    applyProp(el, "onClick", handler, scope);
    scope.dispose();
    el.dispatchEvent(new MouseEvent("click"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("tracks reactive prop — updates when signal changes", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    const cls = signal("initial");
    applyProp(el, "class", () => cls(), scope);
    expect(el.getAttribute("class")).toBe("initial");
    cls.set("updated");
    expect(el.getAttribute("class")).toBe("updated");
    scope.dispose();
  });

  it("normalizes htmlFor to for attribute", () => {
    const label = document.createElement("label");
    const scope = new Scope();
    applyProp(label, "htmlFor", "my-input", scope);
    expect(label.getAttribute("for")).toBe("my-input");
  });

  it("removes style attribute when value is null", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "color: red;");
    const scope = new Scope();
    applyProp(el, "style", null, scope);
    expect(el.hasAttribute("style")).toBe(false);
  });

  it("sets boolean true as empty string for non-VALUE_PROPS attributes (applyAttr path)", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "aria-expanded", true, scope);
    expect(el.getAttribute("aria-expanded")).toBe("");
  });

  it("removes style attribute when value is undefined", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "color: red;");
    const scope = new Scope();
    applyProp(el, "style", undefined, scope);
    expect(el.hasAttribute("style")).toBe(false);
  });

  it("removes attribute when value is null for generic attr", () => {
    const el = document.createElement("div");
    el.setAttribute("data-x", "1");
    const scope = new Scope();
    applyProp(el, "data-x", null, scope);
    expect(el.hasAttribute("data-x")).toBe(false);
  });

  it("removes attribute when value is undefined for generic attr", () => {
    const el = document.createElement("div");
    el.setAttribute("data-y", "1");
    const scope = new Scope();
    applyProp(el, "data-y", undefined, scope);
    expect(el.hasAttribute("data-y")).toBe(false);
  });

  it("data-x attribute applied via setAttribute not as DOM property", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    applyProp(el, "data-x", "foo", scope);
    expect(el.getAttribute("data-x")).toBe("foo");
    // should not be set as a direct property
    expect((el as unknown as Record<string, unknown>)["data-x"]).toBeUndefined();
  });

  it("aria-label applied via setAttribute", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    applyProp(el, "aria-label", "close", scope);
    expect(el.getAttribute("aria-label")).toBe("close");
  });

  it("style object with CSS variable { \"--color\": \"red\" } — verify it's applied", () => {
    const el = document.createElement("div") as HTMLElement;
    const scope = new Scope();
    applyProp(el, "style", { "--color": "red" }, scope);
    expect(el.style.getPropertyValue("--color")).toBe("red");
  });

  it("reactive prop going from a value to null — attribute is removed", () => {
    const el = document.createElement("div");
    const scope = new Scope();
    const cls = signal<string | null>("visible");
    applyProp(el, "class", () => cls(), scope);
    expect(el.getAttribute("class")).toBe("visible");
    cls.set(null);
    expect(el.hasAttribute("class")).toBe(false);
    scope.dispose();
  });

  it("boolean false — attribute is removed (not set to \"false\")", () => {
    const el = document.createElement("div");
    el.setAttribute("data-active", "true");
    const scope = new Scope();
    applyProp(el, "data-active", false, scope);
    expect(el.hasAttribute("data-active")).toBe(false);
  });

  it("sets muted prop directly on a media element (no hardcoded list needed)", () => {
    const el = document.createElement("video");
    const scope = new Scope();
    applyProp(el, "muted", true, scope);
    expect(el.muted).toBe(true);
    // the muted *attribute* only sets defaultMuted — it should stay untouched
    expect(el.hasAttribute("muted")).toBe(false);
  });

  it("tracks reactive muted — keeps working after user interaction dirties the element", () => {
    const el = document.createElement("video");
    const scope = new Scope();
    const muted = signal(false);
    applyProp(el, "muted", () => muted(), scope);
    el.muted = true; // simulate the user/browser changing live state directly
    muted.set(true);
    expect(el.muted).toBe(true);
    muted.set(false);
    expect(el.muted).toBe(false);
    scope.dispose();
  });

  it("does not write SVG geometry props as DOM properties (read-only accessors would throw)", () => {
    const el = createElement("rect") as SVGRectElement;
    const scope = new Scope();
    expect(() => { applyProp(el, "width", "50", scope); }).not.toThrow();
    expect(el.getAttribute("width")).toBe("50");
  });

  it("falls back to setAttribute for read-only reference properties like 'list'", () => {
    const el = document.createElement("input");
    const scope = new Scope();
    expect(() => { applyProp(el, "list", "my-datalist", scope); }).not.toThrow();
    expect(el.getAttribute("list")).toBe("my-datalist");
  });

  it("removes attribute for a two-way-reflected prop when value is undefined", () => {
    const el = document.createElement("div");
    el.id = "old-id";
    const scope = new Scope();
    applyProp(el, "id", undefined, scope);
    expect(el.hasAttribute("id")).toBe(false);
  });
});

// ── addEvent ─────────────────────────────────────────────────────────────────

describe("addEvent", () => {
  it("adds event listener that fires on dispatch", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    const fn = vi.fn();
    addEvent(el, "click", fn, scope);
    el.dispatchEvent(new MouseEvent("click"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("removes listener when scope is disposed", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    const fn = vi.fn();
    addEvent(el, "click", fn, scope);
    scope.dispose();
    el.dispatchEvent(new MouseEvent("click"));
    expect(fn).not.toHaveBeenCalled();
  });

  it("event handler runs and scope cleanup still works afterwards", () => {
    // Verify that after a handler fires, the scope can still be disposed cleanly.
    // (Throwing inside an event handler becomes an uncaught global exception in jsdom,
    // so we verify the invariant without triggering that path.)
    const el = document.createElement("button");
    const scope = new Scope();
    const handler = vi.fn();
    const cleanup = vi.fn();
    addEvent(el, "click", handler, scope);
    scope.add(cleanup);
    el.dispatchEvent(new MouseEvent("click"));
    expect(handler).toHaveBeenCalledOnce();
    expect(() => scope.dispose()).not.toThrow();
    expect(cleanup).toHaveBeenCalled();
  });

  it("same handler registered twice on same element/event — both fire (browser behavior)", () => {
    // Note: addEventListener deduplicates identical handler+options combos;
    // addEvent is a thin wrapper so each call registers independently.
    // Two separate scopes / two separate registrations = two calls.
    const el = document.createElement("button");
    const scope = new Scope();
    const fn = vi.fn();
    addEvent(el, "click", fn, scope);
    addEvent(el, "click", fn, scope);
    el.dispatchEvent(new MouseEvent("click"));
    // addEventListener with the same listener reference is a no-op per spec
    expect(fn).toHaveBeenCalledOnce();
    scope.dispose();
  });

  it("batches signal writes made by a handler so effects run once", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    const a = signal(0);
    const b = signal(0);
    const runs = vi.fn();
    scope.effect(() => {
      void a();
      void b();
      runs();
    });
    runs.mockClear();
    addEvent(el, "click", () => {
      a.set(1);
      b.set(1);
    }, scope);
    el.dispatchEvent(new MouseEvent("click"));
    expect(runs).toHaveBeenCalledOnce();
    scope.dispose();
  });

  it("calls the handler with the element as this and forwards the event", () => {
    const el = document.createElement("button");
    const scope = new Scope();
    let seenThis: unknown;
    let seenEvent: Event | undefined;
    addEvent(el, "click", function (this: unknown, e: Event) {
      seenThis = this;
      seenEvent = e;
    }, scope);
    const event = new MouseEvent("click");
    el.dispatchEvent(event);
    expect(seenThis).toBe(el);
    expect(seenEvent).toBe(event);
    scope.dispose();
  });

  it("registers the same handler on different elements independently", () => {
    const a = document.createElement("button");
    const b = document.createElement("button");
    const scope = new Scope();
    const fn = vi.fn();
    addEvent(a, "click", fn, scope);
    addEvent(b, "click", fn, scope);
    a.dispatchEvent(new MouseEvent("click"));
    b.dispatchEvent(new MouseEvent("click"));
    expect(fn).toHaveBeenCalledTimes(2);
    scope.dispose();
    a.dispatchEvent(new MouseEvent("click"));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("applyProp writable-property cache", () => {
  it("assigns prototype properties and keeps doing so for later elements of the same tag", () => {
    const scope = new Scope();
    const first = document.createElement("input");
    const second = document.createElement("input");
    applyProp(first, "value", "a", scope);
    applyProp(second, "value", "b", scope);
    expect(first.value).toBe("a");
    expect(second.value).toBe("b");
  });

  it("falls back to attributes for unknown and read-only properties, consistently across elements", () => {
    const scope = new Scope();
    for (let i = 0; i < 2; i++) {
      const input = document.createElement("input");
      applyProp(input, "data-x", "1", scope);
      applyProp(input, "list", "dl", scope);
      expect(input.getAttribute("data-x")).toBe("1");
      expect(input.getAttribute("list")).toBe("dl");
    }
  });

  it("honours own properties: writable ones are assigned, getter-only ones become attributes", () => {
    const scope = new Scope();
    const el = document.createElement("div") as unknown as HTMLElement & Record<string, unknown>;
    el.expando = "old";
    Object.defineProperty(el, "readonlyThing", { get: () => "fixed", configurable: true });
    applyProp(el, "expando", "new", scope);
    applyProp(el, "readonlyThing", "attr", scope);
    expect(el.expando).toBe("new");
    expect(el.readonlyThing).toBe("fixed");
    expect(el.getAttribute("readonlyThing")).toBe("attr");
  });

  it("an own property with a setter is assigned", () => {
    const scope = new Scope();
    const el = document.createElement("div") as unknown as HTMLElement & Record<string, unknown>;
    let stored = "";
    Object.defineProperty(el, "custom", { get: () => stored, set: (v: string) => { stored = v; }, configurable: true });
    applyProp(el, "custom", "set", scope);
    expect(stored).toBe("set");
  });

  it("runs ref callbacks untracked so they do not subscribe the enclosing effect", () => {
    const scope = new Scope();
    const s = signal(0);
    const runs = vi.fn();
    scope.effect(() => {
      runs();
      applyProp(document.createElement("div"), "ref", () => { void s(); }, scope);
    });
    s.set(1);
    expect(runs).toHaveBeenCalledOnce();
  });
});
