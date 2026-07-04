import { describe, it, expect } from "vitest";

import { applyPlugin, notePlugin, PLUGINS } from "../lib";

describe("lib — public API", () => {
  it("re-exports PLUGINS", () => {
    expect(PLUGINS.map((p) => p.name)).toEqual(["none", "claude-skill", "codex-skill"]);
  });

  it("re-exports applyPlugin", () => {
    expect(applyPlugin).toBeTypeOf("function");
  });

  it("re-exports notePlugin", () => {
    expect(notePlugin).toBeTypeOf("function");
  });
});
