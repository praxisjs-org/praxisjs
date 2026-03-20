import { describe, it, expect } from "vitest";

import { formatValue } from "../utils/format-value";

describe("formatValue", () => {
  it("formats null", () => {
    expect(formatValue(null)).toBe("null");
  });

  it("formats undefined", () => {
    expect(formatValue(undefined)).toBe("undefined");
  });

  it("wraps strings in double quotes", () => {
    expect(formatValue("hello")).toBe('"hello"');
    expect(formatValue("")).toBe('""');
  });

  it("formats numbers via String()", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(3.14)).toBe("3.14");
    expect(formatValue(0)).toBe("0");
    expect(formatValue(-1)).toBe("-1");
  });

  it("formats booleans via String()", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });

  it("JSON-stringifies plain objects", () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
    expect(formatValue({})).toBe("{}");
  });

  it("JSON-stringifies arrays", () => {
    expect(formatValue([1, 2, 3])).toBe("[1,2,3]");
    expect(formatValue([])).toBe("[]");
  });

  it("returns '[object]' for circular references", () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(formatValue(obj)).toBe("[object]");
  });
});
