import { describe, it, expect, vi } from "vitest";

import type { ResolveFnOutput, ResolveHookContext } from "node:module";

import { registerLoaderHook } from "../index";

const { registerHooks } = vi.hoisted(() => ({
  registerHooks: vi.fn(),
}));

vi.mock("node:module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:module")>();
  return { ...actual, registerHooks, register: vi.fn() };
});

const CONTEXT = {} as ResolveHookContext;

function notFound(): never {
  const err = new Error("not found") as Error & { code?: string };
  err.code = "ERR_MODULE_NOT_FOUND";
  throw err;
}

function ok(url: string): ResolveFnOutput {
  return { url, shortCircuit: true } as ResolveFnOutput;
}

describe("resolveSync (registered via module.registerHooks())", () => {
  registerLoaderHook();
  const resolveSync = registerHooks.mock.calls[0][0].resolve as (
    specifier: string,
    context: ResolveHookContext,
    nextResolve: (specifier: string, context?: Partial<ResolveHookContext>) => ResolveFnOutput,
  ) => ResolveFnOutput;

  it("registers exactly once via module.registerHooks()", () => {
    expect(registerHooks).toHaveBeenCalledOnce();
  });

  it("returns nextResolve's result directly when it succeeds", () => {
    const nextResolve = vi.fn(() => ok("file:///real.js"));
    expect(resolveSync("./real", CONTEXT, nextResolve)).toEqual(ok("file:///real.js"));
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying for a bare (non-relative) specifier", () => {
    const nextResolve = vi.fn(() => notFound());
    expect(() => resolveSync("some-package", CONTEXT, nextResolve)).toThrow("not found");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying when the error has no code", () => {
    const nextResolve = vi.fn(() => {
      throw new Error("weird failure");
    });
    expect(() => resolveSync("./router", CONTEXT, nextResolve)).toThrow("weird failure");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying for a non-retryable error code", () => {
    const nextResolve = vi.fn(() => {
      const err = new Error("permission denied") as Error & { code?: string };
      err.code = "EACCES";
      throw err;
    });
    expect(() => resolveSync("./router", CONTEXT, nextResolve)).toThrow("permission denied");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("retries with a .js suffix and returns it when that succeeds", () => {
    const nextResolve = vi.fn((specifier: string) =>
      specifier === "./router.js" ? ok("file:///router.js") : notFound(),
    );
    expect(resolveSync("./router", CONTEXT, nextResolve)).toEqual(ok("file:///router.js"));
    expect(nextResolve).toHaveBeenCalledTimes(2);
  });

  it("falls back to /index.js when the .js candidate also fails", () => {
    const nextResolve = vi.fn((specifier: string) =>
      specifier === "./router/index.js" ? ok("file:///router/index.js") : notFound(),
    );
    expect(resolveSync("./router", CONTEXT, nextResolve)).toEqual(ok("file:///router/index.js"));
    expect(nextResolve).toHaveBeenCalledTimes(3);
  });

  it("rethrows the original error when both retry candidates fail", () => {
    const nextResolve = vi.fn(() => notFound());
    expect(() => resolveSync("../router", CONTEXT, nextResolve)).toThrow("not found");
    expect(nextResolve).toHaveBeenCalledTimes(3);
  });
});
