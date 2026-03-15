import { describe, it, expect } from "vitest";

import { flattenChildren } from "../children";
import { isComponent } from "../component";

describe("flattenChildren", () => {
  it("wraps a single value in an array", () => {
    expect(flattenChildren("hello")).toEqual(["hello"]);
  });

  it("flattens a flat array", () => {
    expect(flattenChildren(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("flattens nested arrays recursively", () => {
    expect(flattenChildren(["a", ["b", ["c"]]])).toEqual(["a", "b", "c"]);
  });

  it("handles empty array", () => {
    expect(flattenChildren([])).toEqual([]);
  });

  it("appends to an existing out array", () => {
    const out = ["x"];
    flattenChildren(["y", "z"], out);
    expect(out).toEqual(["x", "y", "z"]);
  });

  it("handles null and undefined values as-is", () => {
    expect(flattenChildren([null, undefined, 0])).toEqual([null, undefined, 0]);
  });
});

describe("isComponent", () => {
  it("returns true when __isComponent is present on a function", () => {
    const ctor = Object.assign(function C() {}, { __isComponent: true });
    expect(isComponent(ctor)).toBe(true);
  });

  it("returns false for a plain function", () => {
    expect(isComponent(() => {})).toBe(false);
  });

  it("returns false for non-functions", () => {
    expect(isComponent(null)).toBe(false);
    expect(isComponent({})).toBe(false);
    expect(isComponent("string")).toBe(false);
  });
});
