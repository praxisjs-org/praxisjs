import { describe, it, expect } from "vitest";

import { runInScope, getCurrentScope } from "../context";
import { Scope } from "../scope";

describe("runInScope / getCurrentScope", () => {
  it("getCurrentScope throws when called outside of a render context", () => {
    expect(() => getCurrentScope()).toThrow("[PraxisJS]");
  });

  it("runInScope makes the scope available via getCurrentScope", () => {
    const scope = new Scope();
    let captured: Scope | null = null;
    runInScope(scope, () => {
      captured = getCurrentScope();
    });
    expect(captured).toBe(scope);
  });

  it("restores previous scope after runInScope exits", () => {
    const outer = new Scope();
    const inner = new Scope();
    let innerCaptured: Scope | null = null;
    let outerAfter: Scope | null = null;

    runInScope(outer, () => {
      runInScope(inner, () => {
        innerCaptured = getCurrentScope();
      });
      outerAfter = getCurrentScope();
    });

    expect(innerCaptured).toBe(inner);
    expect(outerAfter).toBe(outer);
  });

  it("restores null scope even when the callback throws", () => {
    const scope = new Scope();
    expect(() =>
      runInScope(scope, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(() => getCurrentScope()).toThrow("[PraxisJS]");
  });

  it("returns the callback's return value", () => {
    const scope = new Scope();
    const result = runInScope(scope, () => 42);
    expect(result).toBe(42);
  });
});
