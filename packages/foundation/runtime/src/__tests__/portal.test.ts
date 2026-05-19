// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { signal } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { Portal, resolvePortalTarget } from "../portal";
import { Scope } from "../scope";

function mount(props: Record<string, unknown> = {}): { nodes: Node[]; scope: Scope } {
  const scope = new Scope();
  const nodes = mountComponent(Portal, props, scope);
  return { nodes, scope };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("Portal", () => {
  it("renders children into document.body by default", () => {
    const child = document.createTextNode("portal-content");
    const { scope } = mount({ children: child });
    expect(document.body.textContent).toContain("portal-content");
    scope.dispose();
  });

  it("renders children into a provided target element", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const child = document.createTextNode("into-target");
    const { scope } = mount({ to: target, children: child });
    expect(target.textContent).toContain("into-target");
    scope.dispose();
  });

  it("renders children into an element found by CSS selector", () => {
    const target = document.createElement("div");
    target.id = "portal-root";
    document.body.appendChild(target);
    const child = document.createTextNode("selector-content");
    const { scope } = mount({ to: "#portal-root", children: child });
    expect(target.textContent).toContain("selector-content");
    scope.dispose();
  });

  it("returns a comment placeholder at the natural DOM position", () => {
    const { nodes, scope } = mount({ children: document.createTextNode("x") });
    const placeholder = nodes.find((n) => n.nodeType === Node.COMMENT_NODE && (n as Comment).data === "portal");
    expect(placeholder).toBeDefined();
    scope.dispose();
  });

  it("does not append children into the natural parent", () => {
    const container = document.createElement("div");
    const child = document.createTextNode("no-leak");
    const { nodes, scope } = mount({ children: child });
    nodes.forEach((n) => container.appendChild(n));
    expect(container.textContent).toBe(""); // no visible content in natural parent
    scope.dispose();
  });

  it("removes portal nodes from target when scope disposes", () => {
    const child = document.createTextNode("to-remove");
    const { scope } = mount({ children: child });
    expect(document.body.textContent).toContain("to-remove");
    scope.dispose();
    expect(document.body.textContent).toBe("");
  });

  it("removes nodes cleanly when target has pre-existing content", () => {
    const pre = document.createTextNode("pre-existing");
    document.body.appendChild(pre);
    const child = document.createTextNode("portal-node");
    const { scope } = mount({ children: child });
    scope.dispose();
    expect(document.body.textContent).toBe("pre-existing");
  });

  it("multiple portals into the same target clean up independently", () => {
    const child1 = document.createTextNode("first");
    const child2 = document.createTextNode("second");
    const { scope: s1 } = mount({ children: child1 });
    const { scope: s2 } = mount({ children: child2 });
    expect(document.body.textContent).toContain("first");
    expect(document.body.textContent).toContain("second");
    s1.dispose();
    expect(document.body.textContent).not.toContain("first");
    expect(document.body.textContent).toContain("second");
    s2.dispose();
    expect(document.body.textContent).toBe("");
  });

  it("renders reactive children into target and updates them", async () => {
    const count = signal(0);
    const { scope } = mount({
      children: () => document.createTextNode(String(count())),
    });
    expect(document.body.textContent).toBe("0");
    count.set(1);
    await Promise.resolve();
    expect(document.body.textContent).toBe("1");
    scope.dispose();
  });

  it("returns null and mounts nothing when target is not found", () => {
    const bodyBefore = document.body.innerHTML;
    const { scope } = mount({ to: "#nonexistent", children: document.createTextNode("x") });
    expect(document.body.innerHTML).toBe(bodyBefore);
    scope.dispose();
  });
});

// ── resolvePortalTarget (unit) ────────────────────────────────────────────────

describe("resolvePortalTarget", () => {
  it("returns document.body when to is null (browser environment)", () => {
    expect(resolvePortalTarget(null)).toBe(document.body);
  });

  it("returns document.body when to is undefined (browser environment)", () => {
    expect(resolvePortalTarget(undefined)).toBe(document.body);
  });

  it("returns null when to is null and document is not defined (SSR)", () => {
    vi.stubGlobal("document", undefined);
    try {
      const result = resolvePortalTarget(null);
      expect(result).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("resolves an Element directly", () => {
    const el = document.createElement("div");
    expect(resolvePortalTarget(el)).toBe(el);
  });

  it("resolves a CSS selector", () => {
    const el = document.createElement("div");
    el.id = "resolve-test";
    document.body.appendChild(el);
    expect(resolvePortalTarget("#resolve-test")).toBe(el);
    document.body.removeChild(el);
  });
});
