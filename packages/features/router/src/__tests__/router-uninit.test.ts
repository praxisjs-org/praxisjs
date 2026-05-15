// @vitest-environment jsdom
// Isolated test file — createRouter() is never called here, so _router starts as null.
import { describe, it, expect } from "vitest";

import { useRouter } from "../router";

describe("useRouter — uninitialized", () => {
  it("throws when createRouter() was never called", () => {
    expect(() => useRouter()).toThrow("[Router] createRouter() was not called.");
  });
});
