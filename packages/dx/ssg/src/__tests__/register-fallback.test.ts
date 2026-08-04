import { describe, it, expect, vi } from "vitest";

// Simulates Node < 22.15, which has no module.registerHooks — registerLoaderHook()
// must fall back to the older, off-thread module.register() API instead.
const { register } = vi.hoisted(() => ({
  register: vi.fn(),
}));

vi.mock("node:module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:module")>();
  return { ...actual, registerHooks: undefined, register };
});

describe("registerLoaderHook() fallback (no module.registerHooks)", () => {
  it("registers the standalone loader-hook module via module.register()", async () => {
    const { registerLoaderHook } = await import("../index");
    registerLoaderHook();

    expect(register).toHaveBeenCalledOnce();
    const [specifier] = register.mock.calls[0] as [URL];
    expect(specifier.href).toContain("loader-hook.js");
  });
});
