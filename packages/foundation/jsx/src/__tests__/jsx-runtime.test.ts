// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { Scope, runInScope  } from "@praxisjs/runtime";

import { jsx, jsxs, jsxDEV, Fragment } from "../jsx-runtime";

function withScope<T>(fn: () => T): T {
  const scope = new Scope();
  return runInScope(scope, fn);
}

describe("Fragment", () => {
  it("is a unique Symbol", () => {
    expect(typeof Fragment).toBe("symbol");
  });

  it("returns [] when no children are provided", () => {
    const result = withScope(() => jsx(Fragment, {}));
    expect(result).toEqual([]);
  });

  it("returns [] when children is empty array", () => {
    const result = withScope(() => jsx(Fragment, { children: [] }));
    expect(Array.isArray(result)).toBe(true);
  });

  it("wraps a single Node in an array", () => {
    const node = document.createElement("span");
    const result = withScope(() => jsx(Fragment, { children: node })) as Node[];
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(node);
  });

  it("flattens an array of Nodes", () => {
    const a = document.createElement("div");
    const b = document.createElement("span");
    const result = withScope(() =>
      jsx(Fragment, { children: [a, b] }),
    ) as Node[];
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
  });
});

describe("jsx — string tag", () => {
  it("creates a DOM element for a string tag", () => {
    const el = withScope(() => jsx("div", {})) as HTMLElement;
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it("applies class prop", () => {
    const el = withScope(() =>
      jsx("p", { class: "text-lg" }),
    ) as HTMLElement;
    expect(el.getAttribute("class")).toBe("text-lg");
  });

  it("renders string children", () => {
    const el = withScope(() =>
      jsx("span", { children: "hello" }),
    ) as HTMLElement;
    expect(el.textContent).toBe("hello");
  });

  it("creates an SVG element for svg tags", () => {
    const el = withScope(() => jsx("svg", {})) as SVGElement;
    expect(el).toBeInstanceOf(SVGElement);
  });
});

describe("jsx — unknown type", () => {
  it("returns a comment node for an unknown symbol type", () => {
    const unknownType = Symbol("unknown");
    const result = withScope(() =>
      jsx(unknownType as unknown as string, {}),
    ) as Comment;
    expect(result.nodeType).toBe(Node.COMMENT_NODE);
  });
});

describe("jsxs and jsxDEV", () => {
  it("jsxs is the same function as jsx", () => {
    expect(jsxs).toBe(jsx);
  });

  it("jsxDEV is the same function as jsx", () => {
    expect(jsxDEV).toBe(jsx);
  });
});
