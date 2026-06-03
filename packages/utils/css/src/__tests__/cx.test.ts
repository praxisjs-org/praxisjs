import { describe, expect, it } from "vitest";
import { cx } from "../cx";

describe("cx()", () => {
  it("returns empty string with no args", () => {
    expect(cx()).toBe("");
  });

  it("handles plain strings", () => {
    expect(cx("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cx(null, undefined, false, "valid")).toBe("valid");
  });

  it("includes 0 as a string", () => {
    expect(cx(0)).toBe("0");
  });

  it("includes numeric class names", () => {
    expect(cx(1, 2)).toBe("1 2");
  });

  it("handles objects — includes truthy keys", () => {
    expect(cx({ active: true, disabled: false, loading: true })).toBe(
      "active loading",
    );
  });

  it("handles objects with zero values as falsy", () => {
    expect(cx({ a: 1, b: 0, c: "", d: null, e: "yes" })).toBe("a e");
  });

  it("handles arrays recursively", () => {
    expect(cx("a", ["b", false, "c"])).toBe("a b c");
  });

  it("handles deeply nested arrays", () => {
    expect(cx(["a", ["b", ["c"]]])).toBe("a b c");
  });

  it("combines strings, objects, and arrays", () => {
    expect(cx("base", { active: true, disabled: false }, ["extra"])).toBe(
      "base active extra",
    );
  });

  it("returns empty string for all-falsy input", () => {
    expect(cx(false, null, undefined, "")).toBe("");
  });

  it("skips empty result from all-falsy nested array", () => {
    // inner = cx(false, null) = "" → falsy → not pushed
    expect(cx("a", [false, null, undefined])).toBe("a");
    expect(cx([false, null])).toBe("");
  });

  it("ignores boolean true — not a string, number, array, or object", () => {
    // boolean true passes the !arg guard but hits the else-if(object) false branch
    expect(cx(true as unknown as string, "valid")).toBe("valid");
  });
});
