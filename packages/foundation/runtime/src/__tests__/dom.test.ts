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
});
