// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { removeNodes } from "../dom/remove";

function siblings(...names: string[]): { parent: HTMLElement; nodes: HTMLElement[] } {
  const parent = document.createElement("div");
  const nodes = names.map((name) => {
    const el = document.createElement(name);
    parent.appendChild(el);
    return el;
  });
  return { parent, nodes };
}

describe("removeNodes", () => {
  it("removes the first-to-last span and leaves the surrounding siblings", () => {
    const { parent, nodes } = siblings("a", "b", "c", "d", "e");
    removeNodes(nodes.slice(1, 4));
    expect([...parent.children].map((c) => c.localName)).toEqual(["a", "e"]);
  });

  it("also removes nodes inserted between first and last after the list was captured", () => {
    const { parent, nodes } = siblings("a", "b");
    const late = document.createElement("late");
    parent.insertBefore(late, nodes[1]);
    removeNodes(nodes);
    expect(parent.childNodes).toHaveLength(0);
  });

  it("removes a single node", () => {
    const { parent, nodes } = siblings("a", "b");
    removeNodes([nodes[0]]);
    expect([...parent.children]).toEqual([nodes[1]]);
  });

  it("removes the attached nodes individually when the first one is detached", () => {
    const { parent, nodes } = siblings("a", "b", "c");
    parent.removeChild(nodes[0]);
    expect(() => { removeNodes(nodes); }).not.toThrow();
    expect(parent.childNodes).toHaveLength(0);
  });

  it("removes each node from its own parent when first and last have different parents", () => {
    const one = siblings("a", "b");
    const two = siblings("c", "d");
    removeNodes([one.nodes[0], one.nodes[1], two.nodes[0]]);
    expect(one.parent.childNodes).toHaveLength(0);
    expect([...two.parent.children]).toEqual([two.nodes[1]]);
  });
});
