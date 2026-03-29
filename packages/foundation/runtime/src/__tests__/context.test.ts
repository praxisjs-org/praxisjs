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

  it("multiple sequential runInScope() calls at same nesting level do not leak state", () => {
    const a = new Scope();
    const b = new Scope();
    let capturedA: Scope | null = null;
    let capturedB: Scope | null = null;
    runInScope(a, () => { capturedA = getCurrentScope(); });
    runInScope(b, () => { capturedB = getCurrentScope(); });
    expect(capturedA).toBe(a);
    expect(capturedB).toBe(b);
    // After both calls, we should be back outside any scope
    expect(() => getCurrentScope()).toThrow("[PraxisJS]");
  });

  it("very deeply nested runInScope() (5+ levels) restores all scopes correctly", () => {
    const scopes = Array.from({ length: 6 }, () => new Scope());
    const captured: (Scope | null)[] = [];

    runInScope(scopes[0], () => {
      captured.push(getCurrentScope());
      runInScope(scopes[1], () => {
        captured.push(getCurrentScope());
        runInScope(scopes[2], () => {
          captured.push(getCurrentScope());
          runInScope(scopes[3], () => {
            captured.push(getCurrentScope());
            runInScope(scopes[4], () => {
              captured.push(getCurrentScope());
              runInScope(scopes[5], () => {
                captured.push(getCurrentScope());
              });
              captured.push(getCurrentScope()); // back to 4
            });
            captured.push(getCurrentScope()); // back to 3
          });
          captured.push(getCurrentScope()); // back to 2
        });
        captured.push(getCurrentScope()); // back to 1
      });
      captured.push(getCurrentScope()); // back to 0
    });

    expect(captured).toEqual([
      scopes[0],
      scopes[1],
      scopes[2],
      scopes[3],
      scopes[4],
      scopes[5],
      scopes[4],
      scopes[3],
      scopes[2],
      scopes[1],
      scopes[0],
    ]);
    expect(() => getCurrentScope()).toThrow("[PraxisJS]");
  });

  it("exception at different nesting depths always restores outer scope", () => {
    const outer = new Scope();
    const middle = new Scope();

    // Exception in middle scope restores outer
    expect(() => {
      runInScope(outer, () => {
        runInScope(middle, () => {
          throw new Error("middle throws");
        });
      });
    }).toThrow("middle throws");

    // outer is still active since the outer runInScope completed normally
    // (exception propagated through it too), so after all we should be back to null
    expect(() => getCurrentScope()).toThrow("[PraxisJS]");
  });
});
