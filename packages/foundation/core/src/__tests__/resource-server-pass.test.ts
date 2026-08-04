import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { flushPendingResources, resource } from "../async/resource";
import { _clearCache, getPendingResources } from "../async/resource-cache";
import { setServerRenderPass, isServerRenderPass } from "../async/server-mode";

describe("server render pass — flushPendingResources", () => {
  beforeEach(() => { _clearCache(); });
  afterEach(() => { setServerRenderPass(false); });

  it("is a no-op when no server pass is active", async () => {
    setServerRenderPass(false);
    const r = resource(() => new Promise<string>(() => {}));
    expect(getPendingResources().size).toBe(0);
    await flushPendingResources();
    // Untouched — resource() never settled and flush didn't wait for it.
    expect(r.status()).toBe("pending");
  });

  it("resolves immediately when nothing is pending", async () => {
    setServerRenderPass(true);
    await expect(flushPendingResources()).resolves.toBeUndefined();
  });

  it("tracks isServerRenderPass() state via the setter", () => {
    expect(isServerRenderPass()).toBe(false);
    setServerRenderPass(true);
    expect(isServerRenderPass()).toBe(true);
  });

  it("awaits an unkeyed resource() (e.g. @Collection) before returning", async () => {
    setServerRenderPass(true);
    const r = resource(() => new Promise<string>((res) => { setTimeout(() => { res("content"); }, 5); }));
    await flushPendingResources();
    expect(r.status()).toBe("success");
    expect(r.data()).toBe("content");
  });

  it("awaits a keyed resource() too", async () => {
    setServerRenderPass(true);
    const r = resource(() => Promise.resolve("keyed-value"), { key: "ssg-key" });
    await flushPendingResources();
    expect(r.status()).toBe("success");
    expect(r.data()).toBe("keyed-value");
  });

  it("awaits multiple concurrently pending resources", async () => {
    setServerRenderPass(true);
    const r1 = resource(() => new Promise<number>((res) => { setTimeout(() => { res(1); }, 5); }));
    const r2 = resource(() => new Promise<number>((res) => { setTimeout(() => { res(2); }, 10); }));
    await flushPendingResources();
    expect(r1.data()).toBe(1);
    expect(r2.data()).toBe(2);
  });

  it("fixed-point loop: awaits a resource created while an earlier one settles", async () => {
    setServerRenderPass(true);
    let second: ReturnType<typeof resource> | undefined;

    // Simulates a component that, upon its first resource resolving, creates a
    // second resource (e.g. a detail page fetching related content) — the new
    // promise must still be picked up even though it didn't exist yet when
    // flushPendingResources() started its first pass.
    const first = resource(() => new Promise<string>((res) => {
      setTimeout(() => {
        res("first");
        second = resource(() => new Promise<string>((res2) => { setTimeout(() => { res2("second"); }, 5); }));
      }, 5);
    }));

    await flushPendingResources();
    expect(first.status()).toBe("success");
    expect(second?.status()).toBe("success");
    expect(second?.data()).toBe("second");
  });

  it("does not leave stale entries after resources settle", async () => {
    setServerRenderPass(true);
    resource(() => Promise.resolve("done"));
    await flushPendingResources();
    expect(getPendingResources().size).toBe(0);
  });

  it("a rejected resource does not hang the flush", async () => {
    setServerRenderPass(true);
    const r = resource(() => Promise.reject(new Error("boom")));
    await expect(flushPendingResources()).resolves.toBeUndefined();
    expect(r.status()).toBe("error");
  });
});
