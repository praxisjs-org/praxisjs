import { describe, it, expect } from "vitest";

import * as lib from "../lib";
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

  it("exposes the Kosmesis setup and the agent prompts to create-praxisjs", () => {
    expect(Object.keys(lib).sort()).toEqual([
      "KOSMESIS_RANGE",
      "KOSMESIS_STYLE_SYSTEMS",
      "MAP_PROMPT",
      "PLUGINS",
      "SETUP_PROMPT",
      "STARTER_COMPONENTS",
      "applyPlugin",
      "dlx",
      "formatInvocation",
      "isKosmesisStyleSystem",
      "kosmesisInvocation",
      "notePlugin",
      "printAgentPrompt",
      "setupKosmesis",
    ]);
  });
});
