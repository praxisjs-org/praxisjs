// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

import { render, Scope, mountComponent, runInScope } from "@praxisjs/runtime";

import { createRouter } from "../router";
import { RouterView } from "../components/router-view";
import { Link } from "../components/link";

class HomePage {
  __isComponent = true;
  static __isComponent = true;
  static __isStateless = false;
  _mounted = false;
  _anchor?: Comment;
  _rawProps = {};
  _setProps() {}
  render() { return document.createTextNode("Home"); }
}

class AboutPage {
  __isComponent = true;
  static __isComponent = true;
  static __isStateless = false;
  _mounted = false;
  _anchor?: Comment;
  _rawProps = {};
  _setProps() {}
  render() { return document.createTextNode("About"); }
}

function setup(path = "/") {
  window.history.pushState(null, "", path);
  return createRouter([
    { path: "/", component: HomePage as never },
    { path: "/about", component: AboutPage as never },
  ]);
}

function mountInContainer(ctor: new (...args: never[]) => unknown, props: Record<string, unknown> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const scope = new Scope();
  render(() => {
    return runInScope(scope, () => mountComponent(ctor as never, props, scope));
  }, container);
  return { container, scope };
}

beforeEach(() => {
  window.history.pushState(null, "", "/");
});

// ── RouterView ────────────────────────────────────────────────────────────────

describe("RouterView", () => {
  it("renders the current route component", async () => {
    setup("/");
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));
    expect(container.textContent).toContain("Home");
    document.body.removeChild(container);
  });

  it("updates when the route changes", async () => {
    const router = setup("/");
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));

    await router.push("/about");
    await vi.waitFor(() => container.textContent?.includes("About"));
    expect(container.textContent).toContain("About");
  });

  it("renders nothing for an unmatched route", async () => {
    const router = setup("/");
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));

    await router.push("/does-not-exist");
    await vi.waitFor(() => !container.textContent?.includes("Home"));
    expect(container.querySelector("[data-router-view]")?.textContent?.trim()).toBe("");
  });
});

// ── Link ──────────────────────────────────────────────────────────────────────

describe("Link", () => {
  it("renders an anchor with the correct href", () => {
    setup();
    const { container } = mountInContainer(Link as never, { to: "/about" });
    const a = container.querySelector("a");
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("/about");
  });

  it("renders children inside the anchor", () => {
    setup();
    const { container } = mountInContainer(Link as never, {
      to: "/about",
      children: document.createTextNode("Go to About"),
    });
    expect(container.textContent).toContain("Go to About");
  });

  it("applies activeClass when the route is active", () => {
    setup("/about");
    const { container } = mountInContainer(Link as never, { to: "/about", activeClass: "is-active" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toContain("is-active");
  });

  it("does not apply activeClass when the route is not active", () => {
    setup("/");
    const { container } = mountInContainer(Link as never, { to: "/about", activeClass: "is-active" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class") ?? "").not.toContain("is-active");
  });

  it("calls router.push on click by default", async () => {
    const router = setup("/");
    const pushSpy = vi.spyOn(router, "push").mockResolvedValue();
    const { container } = mountInContainer(Link as never, { to: "/about" });
    const a = container.querySelector("a")!;
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(pushSpy).toHaveBeenCalledWith("/about");
    pushSpy.mockRestore();
  });

  it("calls router.replace when replace prop is true", async () => {
    const router = setup("/");
    const replaceSpy = vi.spyOn(router, "replace").mockResolvedValue();
    const { container } = mountInContainer(Link as never, { to: "/about", replace: true });
    const a = container.querySelector("a")!;
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(replaceSpy).toHaveBeenCalledWith("/about");
    replaceSpy.mockRestore();
  });

  it("prevents default on click", () => {
    setup("/");
    const { container } = mountInContainer(Link as never, { to: "/about" });
    const a = container.querySelector("a")!;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, "preventDefault");
    a.dispatchEvent(event);
    expect(preventSpy).toHaveBeenCalled();
  });

  it("applies a custom class prop", () => {
    setup("/");
    const { container } = mountInContainer(Link as never, { to: "/about", class: "nav-link" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toContain("nav-link");
  });
});
