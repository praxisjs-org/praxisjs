// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { getCurrentScope } from "../context";
import { mountElement } from "../element";
import { enableHydration, render } from "../index";
import { For } from "../list";

const SSG_MARKER = "data-praxis-ssg";

enableHydration();

interface Item { id: number; label: string }

function hydratable(factory: () => Node | Node[] | null): HTMLElement {
  const server = document.createElement("div");
  const unmount = render(factory, server);
  const html = server.innerHTML;
  unmount();
  const container = document.createElement("div");
  container.innerHTML = html;
  container.setAttribute(SSG_MARKER, "1");
  document.body.appendChild(container);
  return container;
}

const initial = (): Item[] => [
  { id: 1, label: "a" },
  { id: 2, label: "b" },
  { id: 3, label: "c" },
];

describe("For — hydration", () => {
  it("adopts the server-rendered rows and keeps moving the real nodes afterwards", () => {
    const clicks = vi.fn();
    const make = (list: () => Item[]) => () => mountElement("ul", {
      children: mountComponent(For as never, {
        each: list,
        by: "id",
        children: (item: () => Item) => mountElement("li", {
          onClick: () => { clicks(item().id); },
          children: () => item().label,
        }, getCurrentScope()),
      }, getCurrentScope()),
    }, getCurrentScope());

    const container = hydratable(make(() => initial()));
    const serverRows = Array.from(container.querySelectorAll("li"));
    expect(serverRows).toHaveLength(3);

    const list = signal(initial());
    render(make(list), container);
    const rows = Array.from(container.querySelectorAll("li"));
    expect(rows).toEqual(serverRows);

    const [a, b, c] = list();
    list.set([c, b, { ...a, label: "A" }]);
    const moved = Array.from(container.querySelectorAll("li"));
    expect(moved).toEqual([serverRows[2], serverRows[1], serverRows[0]]);
    expect(container.querySelector("ul")?.textContent).toBe("cbA");

    serverRows[0].click();
    expect(clicks).toHaveBeenCalledWith(1);

    list.set([b]);
    expect(Array.from(container.querySelectorAll("li"))).toEqual([serverRows[1]]);
  });

  it("hydrates rows that are a single text node", () => {
    const make = (list: () => Item[]) => () => mountElement("p", {
      children: mountComponent(For as never, {
        each: list,
        by: "id",
        children: (item: () => Item) => (item().id === 1
          ? [mountElement("b", { children: item().label }, getCurrentScope())]
          : document.createTextNode(item().label)),
      }, getCurrentScope()),
    }, getCurrentScope());
    const container = hydratable(make(() => initial()));
    const list = signal(initial());
    render(make(list), container);
    const [a, b, c] = list();
    list.set([c, a, b]);
    expect(container.querySelector("p")?.textContent).toBe("cab");
  });

  it("rows that start with text keep their element boundary repointed", () => {
    const make = (list: () => Item[]) => () => mountElement("p", {
      children: mountComponent(For as never, {
        each: list,
        by: "id",
        children: (item: () => Item) => ["#", mountElement("b", { children: item().label }, getCurrentScope())],
      }, getCurrentScope()),
    }, getCurrentScope());
    const container = hydratable(make(() => initial()));
    const serverBs = Array.from(container.querySelectorAll("b"));
    const list = signal(initial());
    render(make(list), container);
    const [a, b, c] = list();
    list.set([b, c, a]);
    expect(container.querySelector("p")?.textContent).toBe("#b#c#a");
    expect(Array.from(container.querySelectorAll("b"))).toEqual([serverBs[1], serverBs[2], serverBs[0]]);
  });

  it("repoints both boundaries of multi-element rows, also inside a reactive child", () => {
    const show = signal(true);
    const make = (list: () => Item[]) => () => mountElement("dl", {
      children: () => (show()
        ? mountComponent(For as never, {
          each: list,
          by: "id",
          children: (item: () => Item) => [
            mountElement("dt", { children: String(item().id) }, getCurrentScope()),
            mountElement("dd", { children: item().label }, getCurrentScope()),
          ],
        }, getCurrentScope())
        : null),
    }, getCurrentScope());

    const container = hydratable(make(() => initial()));
    const serverDts = Array.from(container.querySelectorAll("dt"));
    const serverDds = Array.from(container.querySelectorAll("dd"));

    const list = signal(initial());
    render(make(list), container);
    expect(Array.from(container.querySelectorAll("dt"))).toEqual(serverDts);

    const [a, b, c] = list();
    list.set([c, a, b]);
    expect(container.querySelector("dl")?.textContent).toBe("3c1a2b");
    expect(Array.from(container.querySelectorAll("dd"))).toEqual([serverDds[2], serverDds[0], serverDds[1]]);

    show.set(false);
    expect(container.querySelectorAll("dt")).toHaveLength(0);
  });
});
