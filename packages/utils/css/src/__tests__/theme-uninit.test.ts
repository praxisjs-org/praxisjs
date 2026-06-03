// @vitest-environment jsdom
// Isolated file — createThemeInstance() is never called here, so _instance starts null.
import { describe, it, expect } from "vitest";
import { theme } from "../tokens/theme-instance";

describe("theme() — uninitialized", () => {
  it("throws when @Themed() was never applied", () => {
    expect(() => theme()).toThrow(
      "[PraxisJS] theme() called before @Themed() was applied to the root component.",
    );
  });
});
