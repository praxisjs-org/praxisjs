import { describe, it, expect } from "vitest";

describe("shape keepers without a DOM", () => {
  it("are built when the runtime modules load before a document exists", async () => {
    expect(typeof document).toBe("undefined");
    const { Scope } = await import("../scope");
    await import("../reactive");
    await import("../list");
    expect(Object.getOwnPropertyDescriptor(Scope, "shapeKeeper")?.value).toBeInstanceOf(Scope);
  });
});
