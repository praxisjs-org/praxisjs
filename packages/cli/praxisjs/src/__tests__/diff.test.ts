import { describe, expect, it } from "vitest";

import { lineDiff } from "../diff";

describe("lineDiff", () => {
  it("is empty for equal texts", () => {
    expect(lineDiff("a\nb", "a\r\nb")).toBe("");
  });

  it("shows changed lines with context and elides distant unchanged ones", () => {
    const before = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].join("\n");
    const after = ["1", "two", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"].join("\n");
    expect(lineDiff(before, after, 1)).toBe(["  1", "- 2", "+ two", "  3", "…", "  12", "+ 13"].join("\n"));
  });

  it("handles removals at the end and additions at the start", () => {
    expect(lineDiff("a\nb", "a")).toBe("  a\n- b");
    expect(lineDiff("b", "a\nb")).toBe("+ a\n  b");
  });
});
