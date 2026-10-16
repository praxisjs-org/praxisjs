import { describe, it, expect } from "vitest";

import { packagePath } from "../paths";

describe("packagePath()", () => {
  it("decodes percent-encoded characters instead of keeping them", () => {
    expect(packagePath("../manager.jsx", "file:///home/me/my%20app/dist/preset.js")).toBe(
      "/home/me/my app/manager.jsx",
    );
  });

  it("resolves a sibling file", () => {
    expect(packagePath("./preview.js", "file:///pkg/dist/preset.js")).toBe("/pkg/dist/preview.js");
  });
});
