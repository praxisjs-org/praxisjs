// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { mountElement } from "../element";
import { render } from "../index";
import { mountReactive } from "../reactive";
import { Scope } from "../scope";

afterEach(() => { vi.restoreAllMocks(); });

function mount(fn: () => unknown) {
  const parent = document.createElement("p");
  const scope = new Scope();
  mountReactive(parent, fn, scope);
  return { parent, scope };
}

describe("mountReactive — text node reuse", () => {
  it("updates the existing text node instead of replacing it", () => {
    const value = signal("a");
    const { parent } = mount(() => value());
    const text = parent.firstChild;
    const remove = vi.spyOn(parent, "removeChild");
    const insert = vi.spyOn(parent, "insertBefore");
    value.set("b");
    expect(parent.firstChild).toBe(text);
    expect(parent.textContent).toBe("b");
    expect(remove).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("skips the DOM write when the rendered string is unchanged", () => {
    const value = signal<string | number>(1);
    const { parent } = mount(() => value());
    const setData = vi.spyOn(CharacterData.prototype, "data", "set");
    value.set("1");
    expect(setData).not.toHaveBeenCalled();
    value.set(2);
    expect(setData).toHaveBeenCalledTimes(1);
    expect(parent.textContent).toBe("2");
  });

  it("switches between text, nodes and nothing, then reuses the new text node", () => {
    const value = signal<unknown>("a");
    const { parent } = mount(() => value());
    const span = document.createElement("span");
    value.set(span);
    expect(parent.firstChild).toBe(span);
    value.set(3);
    const text = parent.firstChild;
    expect(text?.nodeType).toBe(Node.TEXT_NODE);
    value.set(4);
    expect(parent.firstChild).toBe(text);
    expect(parent.textContent).toBe("4");
    value.set(null);
    expect(parent.textContent).toBe("");
    value.set("x");
    expect(parent.textContent).toBe("x");
    value.set(["y", "z"]);
    expect(parent.textContent).toBe("yz");
    value.set("w");
    expect(parent.textContent).toBe("w");
  });

  it("still disposes what the previous run created", () => {
    const value = signal(0);
    const cleanup = vi.fn();
    const { parent } = mount(() => {
      new Scope().add(cleanup);
      return String(value());
    });
    value.set(1);
    expect(parent.textContent).toBe("1");
  });

  it("keeps updating text in place after hydration", () => {
    const label = signal("hello");
    const factory = () => mountElement("p", { id: "t", children: () => label() }, new Scope());
    const server = document.createElement("div");
    const unmount = render(factory, server);
    const html = server.innerHTML;
    unmount();
    const container = document.createElement("div");
    container.innerHTML = html;
    container.setAttribute("data-praxis-ssg", "1");
    document.body.appendChild(container);

    render(factory, container);
    const p = container.querySelector("#t");
    const text = p?.firstChild;
    label.set("world");
    expect(p?.firstChild).toBe(text);
    expect(p?.textContent).toBe("world");
  });
});

describe("mountReactive regions without an anchor", () => {
  it("takes over a placeholder text node and appends to the parent", () => {
    const parent = document.createElement("a");
    const placeholder = parent.appendChild(document.createTextNode(""));
    const value = signal<unknown>("x");
    mountReactive(parent, () => value(), new Scope(), null, placeholder);
    expect(parent.firstChild).toBe(placeholder);
    expect(parent.textContent).toBe("x");
    value.set([document.createElement("b"), document.createElement("i")]);
    expect(parent.innerHTML).toBe("<b></b><i></i>");
    value.set(null);
    expect(parent.innerHTML).toBe("");
  });
});
