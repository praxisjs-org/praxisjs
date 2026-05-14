// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { mountChildren } from "../children";
import { Scope } from "../scope";

function container() {
  return document.createElement("div");
}

describe("mountChildren", () => {
  it("does nothing for null, undefined, or false", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, null, scope);
    mountChildren(el, undefined, scope);
    mountChildren(el, false, scope);
    expect(el.childNodes.length).toBe(0);
  });

  it("appends a text node for a string", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, "hello", scope);
    expect(el.textContent).toBe("hello");
  });

  it("appends a text node for a number", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, 42, scope);
    expect(el.textContent).toBe("42");
  });

  it("appends a DOM node directly", () => {
    const el = container();
    const scope = new Scope();
    const span = document.createElement("span");
    mountChildren(el, span, scope);
    expect(el.firstChild).toBe(span);
  });

  it("recursively mounts arrays", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, ["a", "b", "c"], scope);
    expect(el.textContent).toBe("abc");
  });

  it("mounts a reactive function — updates when signal changes", () => {
    const el = container();
    const scope = new Scope();
    const s = signal("first");
    mountChildren(el, () => s(), scope);
    expect(el.textContent).toBe("first");
    s.set("second");
    expect(el.textContent).toBe("second");
    scope.dispose();
  });

  it("reactive children clean up old nodes on update", () => {
    const el = container();
    const scope = new Scope();
    const s = signal<string | null>("visible");
    mountChildren(el, () => s(), scope);
    expect(el.textContent).toBe("visible");
    s.set(null);
    expect(el.textContent).toBe("");
    scope.dispose();
  });

  it("reactive function returning an array of nodes renders all of them", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, () => ["x", "y", "z"], scope);
    expect(el.textContent).toBe("xyz");
    scope.dispose();
  });

  it("reactive function returning a Node renders it", () => {
    const el = container();
    const scope = new Scope();
    const node = document.createElement("em");
    node.textContent = "em";
    mountChildren(el, () => node, scope);
    expect(el.textContent).toBe("em");
    scope.dispose();
  });

  it("reactive function returning a number renders it", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, () => 42, scope);
    expect(el.textContent).toBe("42");
    scope.dispose();
  });

  it("reactive function returning an unrecognized type renders nothing", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, () => ({ unknown: "object" }) as unknown, scope);
    expect(el.textContent).toBe(""); // normalizeToNodes returns [] for unknown types
    scope.dispose();
  });

  it("deeply nested arrays [[[[\"text\"]]]] — all values flattened", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, [[[["deep"]]]] as unknown, scope);
    expect(el.textContent).toBe("deep");
    scope.dispose();
  });

  it("mixed content [\"text\", 42, null, false, domNode, () => \"reactive\"] — each handled correctly", () => {
    const el = container();
    const scope = new Scope();
    const span = document.createElement("span");
    span.textContent = "node";
    mountChildren(el, ["text", 42, null, false, span, () => "reactive"], scope);
    // "text", "42", span ("node"), "reactive" — null and false are skipped
    expect(el.textContent).toBe("text42nodereactive");
    scope.dispose();
  });

  it("reactive function that changes return type (string → array → null) — old nodes cleaned up", () => {
    const el = container();
    const scope = new Scope();
    const s = signal<unknown>("hello");
    mountChildren(el, () => s(), scope);
    expect(el.textContent).toBe("hello");
    s.set(["a", "b"]);
    expect(el.textContent).toBe("ab");
    s.set(null);
    expect(el.textContent).toBe("");
    scope.dispose();
  });

  it("non-array object passed directly — falls through and mounts nothing", () => {
    const el = container();
    const scope = new Scope();
    mountChildren(el, { some: "object" } as unknown, scope);
    expect(el.childNodes.length).toBe(0);
  });

  it("same Node instance passed twice — second append moves the node (not duplicated)", () => {
    const el = container();
    const scope = new Scope();
    const node = document.createElement("span");
    node.textContent = "x";
    mountChildren(el, [node, node], scope);
    // DOM spec: inserting an already-inserted node moves it, so there's only one instance
    expect(el.querySelectorAll("span").length).toBe(1);
    scope.dispose();
  });

  it("reactive function returning null after returning content — content is removed", () => {
    const el = container();
    const scope = new Scope();
    const s = signal<string | null>("visible");
    mountChildren(el, () => s(), scope);
    expect(el.textContent).toBe("visible");
    s.set(null);
    expect(el.textContent).toBe("");
    scope.dispose();
  });
});
