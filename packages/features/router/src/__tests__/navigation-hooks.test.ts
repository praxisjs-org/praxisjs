// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { RouterInstance, createRouter } from "../router";

class HomePage { render() { return null; } }
class AboutPage { render() { return null; } }

beforeEach(() => {
  window.history.pushState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── afterEach ─────────────────────────────────────────────────────────────────

describe("router.afterEach()", () => {
  it("calls the handler after push() with (to, from)", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    const calls: Array<{ to: string; from: string | null }> = [];
    r.afterEach((to, from) => {
      calls.push({ to: to.path, from: from?.path ?? null });
    });

    await r.push("/about");
    expect(calls).toEqual([{ to: "/about", from: "/" }]);
  });

  it("calls the handler after replace() with (to, from)", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    const calls: Array<{ to: string; from: string | null }> = [];
    r.afterEach((to, from) => { calls.push({ to: to.path, from: from?.path ?? null }); });

    await r.replace("/about");
    expect(calls).toHaveLength(1);
    expect(calls[0].to).toBe("/about");
  });

  it("calls all registered handlers in registration order", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    const order: number[] = [];
    r.afterEach(() => { order.push(1); });
    r.afterEach(() => { order.push(2); });
    r.afterEach(() => { order.push(3); });

    await r.push("/about");
    expect(order).toEqual([1, 2, 3]);
  });

  it("does NOT call afterEach when beforeEnter blocks navigation", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/protected", component: AboutPage, beforeEnter: async () => false },
    ]);
    const handler = vi.fn();
    r.afterEach(handler);

    await r.push("/protected");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns an unregister function that stops future calls", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    const handler = vi.fn();
    const unregister = r.afterEach(handler);

    await r.push("/about");
    expect(handler).toHaveBeenCalledOnce();

    unregister();
    await r.push("/");
    expect(handler).toHaveBeenCalledOnce(); // still only once after unregister
  });

  it("calling unregister twice is a no-op (idx === -1 branch)", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    const handler = vi.fn();
    const unregister = r.afterEach(handler);

    unregister();
    // Second call: handler already removed, idx = -1 → splice not called
    expect(() => unregister()).not.toThrow();

    await r.push("/about");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes the correct to/from to afterEach on popstate", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    await r.push("/about");

    // Use a Promise to avoid polling (syncFromBrowser is async — location is set
    // before resolveAndSetComponent, so waitFor on location resolves too early).
    const handlerDone = new Promise<{ to: string; from: string }>((resolve) => {
      r.afterEach((to, from) => resolve({ to: to.path, from: from?.path ?? "" }));
    });

    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    const result = await handlerDone;

    expect(result).toEqual({ to: "/", from: "/about" });
  });

  it("afterEach receives the route name on named routes", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", name: "about", component: AboutPage },
    ]);
    let capturedName: string | undefined;
    r.afterEach((to) => { capturedName = to.name; });

    await r.push("/about");
    expect(capturedName).toBe("about");
  });
});

// ── afterEnter (per-route) ────────────────────────────────────────────────────

describe("route.afterEnter", () => {
  it("calls afterEnter when the route is matched", async () => {
    const afterEnter = vi.fn();
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage, afterEnter },
    ]);

    await r.push("/about");
    expect(afterEnter).toHaveBeenCalledOnce();
  });

  it("does NOT call afterEnter of a non-matching route", async () => {
    const afterEnterAbout = vi.fn();
    const afterEnterHome = vi.fn();
    const r = new RouterInstance([
      { path: "/", component: HomePage, afterEnter: afterEnterHome },
      { path: "/about", component: AboutPage, afterEnter: afterEnterAbout },
    ]);

    await r.push("/about");
    expect(afterEnterAbout).toHaveBeenCalledOnce();
    expect(afterEnterHome).not.toHaveBeenCalled();
  });

  it("passes (to, from) to afterEnter", async () => {
    const calls: Array<{ to: string; from: string | null }> = [];
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      {
        path: "/about",
        component: AboutPage,
        afterEnter: (to, from) => { calls.push({ to: to.path, from: from?.path ?? null }); },
      },
    ]);

    await r.push("/about");
    expect(calls).toEqual([{ to: "/about", from: "/" }]);
  });

  it("afterEnter runs before global afterEach handlers", async () => {
    const order: string[] = [];
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      {
        path: "/about",
        component: AboutPage,
        afterEnter: () => { order.push("afterEnter"); },
      },
    ]);
    r.afterEach(() => { order.push("afterEach"); });

    await r.push("/about");
    expect(order).toEqual(["afterEnter", "afterEach"]);
  });
});

// ── scrollBehavior ────────────────────────────────────────────────────────────

describe("scrollBehavior", () => {
  function stubScrollTo() {
    const spy = vi.fn();
    vi.stubGlobal("scrollTo", spy);
    return spy;
  }

  it("calls scrollBehavior with (to, from, null) after push()", async () => {
    const scrollBehavior = vi.fn((): import("../types/route").ScrollPosition => false);
    const r = new RouterInstance(
      [
        { path: "/", component: HomePage },
        { path: "/about", component: AboutPage },
      ],
      { scrollBehavior },
    );

    await r.push("/about");
    expect(scrollBehavior).toHaveBeenCalledOnce();
    const call = scrollBehavior.mock.calls[0] as unknown as Parameters<import("../types/route").ScrollBehavior>;
    const [to, from, saved] = call;
    expect(to.path).toBe("/about");
    expect(from?.path).toBe("/");
    expect(saved).toBeNull();
  });

  it("calls window.scrollTo with coordinates returned by scrollBehavior", async () => {
    const scrollTo = stubScrollTo();
    const r = new RouterInstance(
      [
        { path: "/", component: HomePage },
        { path: "/about", component: AboutPage },
      ],
      { scrollBehavior: () => ({ top: 0, left: 0 }) },
    );

    await r.push("/about");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("skips scrollTo when scrollBehavior returns false", async () => {
    const scrollTo = stubScrollTo();
    const r = new RouterInstance(
      [
        { path: "/", component: HomePage },
        { path: "/about", component: AboutPage },
      ],
      { scrollBehavior: () => false },
    );

    await r.push("/about");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("calls scrollBehavior after replace() with null savedPosition", async () => {
    const scrollBehavior = vi.fn((): import("../types/route").ScrollPosition => false);
    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      { scrollBehavior },
    );

    await r.replace("/about");
    expect(scrollBehavior).toHaveBeenCalledOnce();
    const replaceCall = scrollBehavior.mock.calls[0] as unknown as Parameters<import("../types/route").ScrollBehavior>;
    expect(replaceCall[2]).toBeNull();
  });

  it("passes savedPosition from history.state on popstate", async () => {
    // scrollBehavior is called once for push("/about") (saved=null)
    // and once for the popstate (saved={left,top}). We want the popstate call (2nd).
    let callCount = 0;
    let capturedArgs: unknown[] = [];
    const popstateBehaviorCalled = new Promise<void>((resolve) => {
      const scrollBehavior = vi.fn((...args: unknown[]) => {
        callCount++;
        capturedArgs = args;
        if (callCount === 2) resolve(); // resolve only on the popstate call
        return false;
      }) as unknown as import("../types/route").ScrollBehavior;
      const r = new RouterInstance(
        [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
        { scrollBehavior },
      );
      void r.push("/about").then(() => {
        window.history.pushState({ __praxis_sx: 100, __praxis_sy: 200 }, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });

    await popstateBehaviorCalled;
    expect(capturedArgs[2]).toEqual({ left: 100, top: 200 });
  });

  it("passes null savedPosition when state has no scroll keys", async () => {
    let capturedSaved: unknown = "not-called";
    const behaviorCalled = new Promise<void>((resolve) => {
      let callCount = 0;
      const scrollBehavior = vi.fn((...args: unknown[]) => {
        callCount++;
        if (callCount === 2) { // second call = popstate
          capturedSaved = args[2];
          resolve();
        }
        return false;
      }) as unknown as import("../types/route").ScrollBehavior;
      const r = new RouterInstance(
        [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
        { scrollBehavior },
      );
      void r.push("/about").then(() => {
        window.history.pushState(null, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });

    await behaviorCalled;
    expect(capturedSaved).toBeNull();
  });

  it("awaits an async scrollBehavior", async () => {
    let resolved = false;
    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      {
        scrollBehavior: async (): Promise<import("../types/route").ScrollPosition> => {
          await Promise.resolve();
          resolved = true;
          return false;
        },
      },
    );

    await r.push("/about");
    expect(resolved).toBe(true);
  });

  it("does not call window.scrollTo when no scrollBehavior is configured", async () => {
    const scrollTo = stubScrollTo();
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);

    await r.push("/about");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("uses 0 as default for omitted top and left in { top?, left? } result", async () => {
    const scrollTo = stubScrollTo();
    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      { scrollBehavior: (): import("../types/route").ScrollPosition => ({}) },
    );

    await r.push("/about");
    // target.left ?? 0 and target.top ?? 0 both fall back to 0
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

// ── scrollBehavior el target ──────────────────────────────────────────────────

describe("scrollBehavior el target", () => {
  it("calls scrollIntoView on a matched selector", async () => {
    const el = document.createElement("div");
    el.id = "section";
    document.body.appendChild(el);
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;

    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      { scrollBehavior: () => ({ el: "#section" }) },
    );

    await r.push("/about");
    expect(scrollIntoView).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("accepts an Element directly", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;

    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      { scrollBehavior: () => ({ el }) },
    );

    await r.push("/about");
    expect(scrollIntoView).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("does not throw when { el } selector matches nothing in the DOM", async () => {
    const r = new RouterInstance(
      [{ path: "/", component: HomePage }, { path: "/about", component: AboutPage }],
      { scrollBehavior: () => ({ el: "#does-not-exist" }) },
    );

    // querySelector returns null → el instanceof Element is false → no-op
    await expect(r.push("/about")).resolves.toBeUndefined();
  });
});

// ── scroll position saving ────────────────────────────────────────────────────

describe("scroll position saving", () => {
  it("saves current scroll position to history.state before pushing", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    Object.defineProperty(window, "scrollX", { value: 42, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 99, writable: true, configurable: true });

    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);

    await r.push("/about");

    const scrollSaveCall = replaceStateSpy.mock.calls.find(
      ([state]) => state !== null && typeof state === "object" && "__praxis_sx" in (state as Record<string, unknown>),
    );
    expect(scrollSaveCall).toBeDefined();
    const savedState = scrollSaveCall?.[0] as Record<string, unknown>;
    expect(savedState.__praxis_sx).toBe(42);
    expect(savedState.__praxis_sy).toBe(99);
  });

  it("saves scroll only once even when a redirect happens", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      // beforeEnter redirects to /about; scroll save must occur at depth=0 (before the guard)
      { path: "/old", component: AboutPage, beforeEnter: async () => "/about" },
      { path: "/about", component: AboutPage },
    ]);

    await r.push("/old");

    const scrollSaveCalls = replaceStateSpy.mock.calls.filter(
      ([state]) =>
        state !== null &&
        typeof state === "object" &&
        "__praxis_sx" in (state as Record<string, unknown>),
    );
    // saveCurrentScrollPosition runs once at _redirectDepth === 0 (before beforeEnter)
    expect(scrollSaveCalls).toHaveLength(1);
  });
});

// ── createRouter with options ─────────────────────────────────────────────────

describe("createRouter(routes, options)", () => {
  it("accepts RouterOptions as a second argument", () => {
    const scrollBehavior = vi.fn((): import("../types/route").ScrollPosition => false);
    expect(() => {
      createRouter([{ path: "/", component: HomePage }], { scrollBehavior });
    }).not.toThrow();
  });
});
