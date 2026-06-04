// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

import { render, Scope, mountComponent, runInScope } from "@praxisjs/runtime";

import { RouterInstance, createRouter, useMeta } from "../router";
import { Route, Router, Meta } from "../decorators";
import { Link } from "../components/link";

class HomePage { render() { return null; } }
class AboutPage { render() { return null; } }
class UserPage { render() { return null; } }
class AdminPage { render() { return null; } }

beforeEach(() => {
  window.history.pushState(null, "", "/");
});

// ── Named routes ──────────────────────────────────────────────────────────────

describe("Named routes — push({ name })", () => {
  it("navigates by name without params", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", name: "about", component: AboutPage },
    ]);
    await r.push({ name: "about" });
    expect(r.location().path).toBe("/about");
    expect(r.currentComponent()).toBe(AboutPage);
  });

  it("navigates by name and resolves params into the path", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/users/:id", name: "user", component: UserPage },
    ]);
    await r.push({ name: "user", params: { id: "42" } });
    expect(r.location().path).toBe("/users/42");
    expect(r.params()).toEqual({ id: "42" });
  });

  it("navigates by name with query and hash", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", name: "about", component: AboutPage },
    ]);
    await r.push({ name: "about", query: { tab: "info" }, hash: "top" });
    expect(r.query()).toEqual({ tab: "info" });
    expect(r.location().hash).toBe("top");
  });

  it("throws when navigating to an unknown name", async () => {
    const r = new RouterInstance([{ path: "/", component: HomePage }]);
    await expect(r.push({ name: "nonexistent" })).rejects.toThrow(/No route with name "nonexistent"/);
  });

  it("resolvePath() returns the interpolated path string", () => {
    const r = new RouterInstance([
      { path: "/users/:id", name: "user", component: UserPage },
    ]);
    expect(r.resolvePath({ name: "user", params: { id: "99" } })).toBe("/users/99");
  });

  it("resolvePath() with no params on a static named route", () => {
    const r = new RouterInstance([
      { path: "/about", name: "about", component: AboutPage },
    ]);
    expect(r.resolvePath({ name: "about" })).toBe("/about");
  });

  it("resolvePath() throws for unknown name", () => {
    const r = new RouterInstance([{ path: "/", component: HomePage }]);
    expect(() => r.resolvePath({ name: "missing" })).toThrow(/No route with name "missing"/);
  });

  it("resolvePath() falls back to empty string for params not provided (params[n] ?? '')", () => {
    const r = new RouterInstance([
      { path: "/users/:id", name: "user", component: UserPage },
    ]);
    // id is not in params → replaced with ""
    expect(r.resolvePath({ name: "user", params: {} })).toBe("/users/");
  });
});

describe("Named routes — replace({ name })", () => {
  it("replaces history entry navigating by name", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", name: "about", component: AboutPage },
    ]);
    const before = window.history.length;
    await r.replace({ name: "about" });
    expect(r.location().path).toBe("/about");
    expect(window.history.length).toBe(before);
  });

  it("replace by name with params", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/users/:id", name: "user", component: UserPage },
    ]);
    await r.replace({ name: "user", params: { id: "7" } });
    expect(r.location().path).toBe("/users/7");
  });
});

// ── Meta field ────────────────────────────────────────────────────────────────

describe("Route meta field", () => {
  it("exposes meta on the location after navigation", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/admin", name: "admin", meta: { requiresAuth: true, roles: ["admin"] }, component: AdminPage },
    ]);
    await r.push("/admin");
    expect(r.location().meta).toEqual({ requiresAuth: true, roles: ["admin"] });
  });

  it("meta defaults to {} for routes without meta", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage },
    ]);
    await r.push("/about");
    expect(r.location().meta).toEqual({});
  });

  it("meta is available via the meta computed signal", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage, meta: { title: "Home" } },
      { path: "/about", component: AboutPage, meta: { title: "About" } },
    ]);
    await r.push("/about");
    expect(r.meta()).toEqual({ title: "About" });
  });

  it("meta updates reactively when navigating", async () => {
    const r = new RouterInstance([
      { path: "/", component: HomePage, meta: { title: "Home" } },
      { path: "/about", component: AboutPage, meta: { title: "About" } },
    ]);
    await r.push("/");
    expect(r.meta()).toEqual({ title: "Home" });
    await r.push("/about");
    expect(r.meta()).toEqual({ title: "About" });
  });

  it("location carries name and meta together from a named route", async () => {
    const r = new RouterInstance([
      { path: "/dashboard", name: "dashboard", meta: { breadcrumb: "Dashboard" }, component: AdminPage },
    ]);
    await r.push("/dashboard");
    const loc = r.location();
    expect(loc.name).toBe("dashboard");
    expect(loc.meta).toEqual({ breadcrumb: "Dashboard" });
  });

  it("location.name is undefined for unnamed routes", async () => {
    const r = new RouterInstance([
      { path: "/about", component: AboutPage },
    ]);
    await r.push("/about");
    expect(r.location().name).toBeUndefined();
  });
});

describe("useMeta()", () => {
  it("returns the meta computed from the global router singleton", async () => {
    createRouter([
      { path: "/", component: HomePage, meta: { title: "Home" } },
    ]);
    const meta = useMeta();
    expect(typeof meta).toBe("function");
    expect(meta()).toEqual({ title: "Home" });
  });
});

// ── @Route with options object ────────────────────────────────────────────────

describe("@Route({ path, name, meta })", () => {
  it("sets __routePath, __routeName, and __routeMeta on the enhanced class", () => {
    class Dashboard { render() { return null; } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Route({ path: "/dashboard", name: "dashboard", meta: { requiresAuth: true } })(
      Dashboard as never,
      {} as ClassDecoratorContext,
    );
    const e = Enhanced as unknown as Record<string, unknown>;
    expect(e.__routePath).toBe("/dashboard");
    expect(e.__routeName).toBe("dashboard");
    expect(e.__routeMeta).toEqual({ requiresAuth: true });
  });

  it("@Route(string) still works — only sets __routePath", () => {
    class Page { render() { return null; } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Route("/page")(Page as never, {} as ClassDecoratorContext);
    const e = Enhanced as unknown as Record<string, unknown>;
    expect(e.__routePath).toBe("/page");
    expect(e.__routeName).toBeUndefined();
    expect(e.__routeMeta).toBeUndefined();
  });

  it("@Router normalizes @Route-decorated class with name and meta", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DashComp = Route({ path: "/dash", name: "dash", meta: { title: "Dash" } })(
      class Dash { render() { return null; } } as never,
      {} as ClassDecoratorContext,
    );

    @Router([DashComp as never])
    class App {}
    void App;

    const r = (await import("../router")).useRouter();
    await r.push("/dash");
    expect(r.location().name).toBe("dash");
    expect(r.location().meta).toEqual({ title: "Dash" });
  });
});

// ── @Meta field decorator ─────────────────────────────────────────────────────

function makeFieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
  };
}

describe("@Meta", () => {
  it("injects the meta computed from the router", async () => {
    createRouter([
      { path: "/", component: HomePage, meta: { title: "Home" } },
    ]);
    const { ctx, run } = makeFieldCtx("meta");
    Meta()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(typeof instance.meta).toBe("function");
    instance.meta = null; // no-op setter coverage
  });

  it("injected meta reflects the current route meta", async () => {
    const r = createRouter([
      { path: "/", component: HomePage },
      { path: "/about", component: AboutPage, meta: { title: "About" } },
    ]);
    const { ctx, run } = makeFieldCtx("meta");
    Meta()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    await r.push("/about");
    const meta = (instance.meta as () => Record<string, unknown>)();
    expect(meta).toEqual({ title: "About" });
  });
});

// ── Link with NamedNavigationTarget ───────────────────────────────────────────

describe("Link with named target", () => {
  function setupRouter(path = "/") {
    window.history.pushState(null, "", path);
    return createRouter([
      { path: "/", component: HomePage },
      { path: "/users/:id", name: "user", component: UserPage },
      { path: "/about", name: "about", component: AboutPage },
    ]);
  }

  function mountInContainer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Comp: new (...args: any[]) => any,
    props: Record<string, unknown> = {},
  ) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const scope = new Scope();
    render(() => runInScope(scope, () => mountComponent(Comp as never, props, scope)), container);
    return { container, scope };
  }

  it("resolves named target to href", () => {
    setupRouter();
    const { container } = mountInContainer(Link as never, {
      to: { name: "user", params: { id: "5" } },
    });
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("/users/5");
  });

  it("calls router.push with the named target object on click", () => {
    const r = setupRouter("/");
    const pushSpy = vi.spyOn(r, "push").mockResolvedValue();
    const target = { name: "about" };
    const { container } = mountInContainer(Link as never, { to: target });
    const a = container.querySelector("a")!;
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(pushSpy).toHaveBeenCalledWith(target);
    pushSpy.mockRestore();
  });

  it("applies activeClass when named target resolves to current path", () => {
    setupRouter("/about");
    const { container } = mountInContainer(Link as never, {
      to: { name: "about" },
      activeClass: "is-active",
    });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toContain("is-active");
  });
});
