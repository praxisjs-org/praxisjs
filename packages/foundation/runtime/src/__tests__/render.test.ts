// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { render, mountElement } from "../index";
import { Scope } from "../scope";

// ── mountElement ─────────────────────────────────────────────────────────────

describe("mountElement", () => {
  it("creates an element with the given tag", () => {
    const scope = new Scope();
    const el = mountElement("section", {}, scope);
    expect(el.tagName.toLowerCase()).toBe("section");
  });

  it("applies static props", () => {
    const scope = new Scope();
    const el = mountElement("p", { id: "para", class: "text" }, scope) as HTMLElement;
    expect(el.id).toBe("para");
    expect(el.getAttribute("class")).toBe("text");
  });

  it("mounts string children", () => {
    const scope = new Scope();
    const el = mountElement("p", { children: "hello" }, scope);
    expect(el.textContent).toBe("hello");
  });

  it("mounts reactive prop — updates when signal changes", () => {
    const scope = new Scope();
    const cls = signal("a");
    const el = mountElement("div", { class: () => cls() }, scope);
    expect(el.getAttribute("class")).toBe("a");
    cls.set("b");
    expect(el.getAttribute("class")).toBe("b");
    scope.dispose();
  });
});

// ── render ───────────────────────────────────────────────────────────────────

describe("render", () => {
  it("mounts content into container", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const scope = new Scope();
    render(() => {
      const el = mountElement("h1", { children: "Hello" }, scope);
      return el;
    }, container);

    expect(container.textContent).toBe("Hello");
    document.body.removeChild(container);
  });

  it("clears container on unmount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const unmount = render(() => {
      const scope = new Scope();
      return mountElement("p", { children: "bye" }, scope);
    }, container);

    expect(container.textContent).toBe("bye");
    unmount();
    expect(container.innerHTML).toBe("");
    document.body.removeChild(container);
  });

  it("reactive content re-renders on signal change", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const text = signal("initial");

    render(() => {
      const scope = new Scope();
      return mountElement("span", { children: () => text() }, scope);
    }, container);

    expect(container.textContent).toBe("initial");
    text.set("updated");
    expect(container.textContent).toBe("updated");
    document.body.removeChild(container);
  });
});
