import { describe, it, expect } from "vitest";

import { acceptsSignal } from "../utils";

describe("acceptsSignal", () => {
  it("returns true for a function with 'signal' as first param", () => {
    expect(acceptsSignal((signal: AbortSignal) => signal)).toBe(true);
  });

  it("returns true for an async function with 'signal' as first param", () => {
    expect(acceptsSignal(async (signal: AbortSignal, id: number) => ({ signal, id }))).toBe(true);
  });

  it("returns true for a named function with 'signal' as first param", () => {
    function loadUser(signal: AbortSignal) { return signal; }
    expect(acceptsSignal(loadUser)).toBe(true);
  });

  it("returns false for a function with no params", () => {
    expect(acceptsSignal(() => "ok")).toBe(false);
  });

  it("returns false for a function whose first param is not 'signal'", () => {
    expect(acceptsSignal((id: number) => id)).toBe(false);
  });

  it("returns false for _signal (underscore-prefixed)", () => {
    expect(acceptsSignal((_signal: AbortSignal) => _signal)).toBe(false);
  });

  it("returns false when fn.toString() contains no parentheses (regex yields no match)", () => {
    const noParenFn = Object.assign(
      () => undefined,
      { toString() { return "no parens here"; } },
    ) as unknown as () => unknown;

    expect(acceptsSignal(noParenFn)).toBe(false);
  });

  it("returns false when fn.toString() throws", () => {
    const badFn = Object.assign(
      () => undefined,
      { toString() { throw new Error("no source"); } },
    ) as unknown as () => unknown;

    expect(acceptsSignal(badFn)).toBe(false);
  });
});
