import { describe, expect, it } from "vitest";
import { declarations, toKebab } from "../internal/kebab";

describe("toKebab()", () => {
  it("converts camelCase and vendor-prefixed names", () => {
    expect(toKebab("backgroundColor")).toBe("background-color");
    expect(toKebab("WebkitTransition")).toBe("-webkit-transition");
    expect(toKebab("color")).toBe("color");
  });

  it("returns the same result from the cache on repeated calls", () => {
    expect(toKebab("borderTopLeftRadius")).toBe("border-top-left-radius");
    expect(toKebab("borderTopLeftRadius")).toBe("border-top-left-radius");
  });
});

describe("declarations()", () => {
  it("prefixes each defined entry and skips null/undefined", () => {
    expect(declarations({ fontSize: "1rem", color: undefined, margin: null, zIndex: 2 }, "  "))
      .toBe("  font-size: 1rem;\n  z-index: 2;");
  });

  it("returns an empty string when nothing is defined", () => {
    expect(declarations({ color: undefined }, "")).toBe("");
  });
});
