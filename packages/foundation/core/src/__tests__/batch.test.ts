import { describe, it, expect } from "vitest";

import { batch } from "../signal/batch";
import { signal } from "../signal/signal";

describe("batch", () => {
  it("executes the wrapped function", () => {
    const s = signal(0);
    batch(() => {
      s.set(5);
      s.set(10);
    });
    expect(s()).toBe(10);
  });

  it("does not throw when no effects are tracking", () => {
    const s = signal(0);
    expect(() => { batch(() => { s.set(1); }); }).not.toThrow();
    expect(s()).toBe(1);
  });

  it("propagates errors thrown inside the batch", () => {
    expect(() =>
      { batch(() => {
        throw new Error("inside batch");
      }); },
    ).toThrow("inside batch");
  });
});
