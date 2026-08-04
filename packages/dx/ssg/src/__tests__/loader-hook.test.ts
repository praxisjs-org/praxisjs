import { describe, it, expect, vi } from "vitest";

import type { ResolveFnOutput, ResolveHookContext } from "node:module";

import { resolve } from "../loader-hook";

const CONTEXT = {} as ResolveHookContext;

function notFound(): never {
  const err = new Error("not found") as Error & { code?: string };
  err.code = "ERR_MODULE_NOT_FOUND";
  throw err;
}

function ok(url: string): ResolveFnOutput {
  return { url, shortCircuit: true } as ResolveFnOutput;
}

describe("loader-hook resolve()", () => {
  it("returns nextResolve's result directly when it succeeds", async () => {
    const nextResolve = vi.fn(async () => ok("file:///real.js"));
    const result = await resolve("./real", CONTEXT, nextResolve);
    expect(result).toEqual(ok("file:///real.js"));
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying for a bare (non-relative) specifier", async () => {
    const nextResolve = vi.fn(async () => notFound());
    await expect(resolve("some-package", CONTEXT, nextResolve)).rejects.toThrow("not found");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying when the error has no code", async () => {
    const nextResolve = vi.fn(async () => {
      throw new Error("weird failure");
    });
    await expect(resolve("./router", CONTEXT, nextResolve)).rejects.toThrow("weird failure");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("rethrows without retrying for a non-retryable error code", async () => {
    const nextResolve = vi.fn(async () => {
      const err = new Error("permission denied") as Error & { code?: string };
      err.code = "EACCES";
      throw err;
    });
    await expect(resolve("./router", CONTEXT, nextResolve)).rejects.toThrow("permission denied");
    expect(nextResolve).toHaveBeenCalledOnce();
  });

  it("retries with a .js suffix and returns it when that succeeds", async () => {
    const nextResolve = vi.fn(async (specifier: string) => {
      if (specifier === "./router.js") return ok("file:///router.js");
      return notFound();
    });
    const result = await resolve("./router", CONTEXT, nextResolve);
    expect(result).toEqual(ok("file:///router.js"));
    expect(nextResolve).toHaveBeenCalledTimes(2);
  });

  it("falls back to /index.js when the .js candidate also fails", async () => {
    const nextResolve = vi.fn(async (specifier: string) => {
      if (specifier === "./router/index.js") return ok("file:///router/index.js");
      return notFound();
    });
    const result = await resolve("./router", CONTEXT, nextResolve);
    expect(result).toEqual(ok("file:///router/index.js"));
    expect(nextResolve).toHaveBeenCalledTimes(3);
  });

  it("rethrows the original error when both retry candidates fail", async () => {
    const nextResolve = vi.fn(async () => notFound());
    await expect(resolve("../router", CONTEXT, nextResolve)).rejects.toThrow("not found");
    expect(nextResolve).toHaveBeenCalledTimes(3);
  });
});
