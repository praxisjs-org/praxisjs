// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { jsx } from "@praxisjs/jsx/jsx-runtime";
import { render, Scope, mountComponent, runInScope } from "@praxisjs/runtime";

import { createRouter } from "../router";
import { RouterView } from "../components/router-view";
import { RouterOutlet } from "../components/router-outlet";
import { Link } from "../components/link";

class HomePage extends StatefulComponent {
  static __isComponent = true;
  static __isStateless = false;
  render() { return document.createTextNode("Home"); }
}

class AboutPage extends StatefulComponent {
  static __isComponent = true;
  static __isStateless = false;
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

  it("renders layout wrapping the route component when route has a layout", async () => {
    // This layout renders its children (the RouteComponent), exercising line 18's inner arrow.
    class LayoutComp extends StatelessComponent {
      static __isComponent = true;
      static __isStateless = true;
      render() {
        const ch = this.props.children;
        if (typeof ch === "function") return (ch as () => Node | null)();
        return document.createTextNode("LAYOUT");
      }
    }

    window.history.pushState(null, "", "/layout-route");
    createRouter([
      { path: "/layout-route", component: HomePage as never, layout: LayoutComp as never },
    ]);
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => {
      expect(container.textContent).toContain("Home");
    });
    document.body.removeChild(container);
  });
});

describe("RouterView layout reuse", () => {
  it("keeps the layout mounted when navigating between routes that share it", async () => {
    let layoutRenders = 0;
    class SharedLayout extends StatelessComponent {
      static __isComponent = true;
      static __isStateless = true;
      render() {
        layoutRenders++;
        return jsx("main", { children: this.props.children }) as Node;
      }
    }

    window.history.pushState(null, "", "/a");
    const router = createRouter([
      { path: "/a", component: HomePage as never, layout: SharedLayout as never },
      { path: "/b", component: AboutPage as never, layout: SharedLayout as never },
    ]);
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => {
      expect(container.textContent).toContain("Home");
    });

    await router.push("/b");
    await vi.waitFor(() => {
      expect(container.textContent).toContain("About");
    });
    expect(container.textContent).not.toContain("Home");
    expect(layoutRenders).toBe(1);
    document.body.removeChild(container);
  });

  it("swaps the layout when the next route uses another one", async () => {
    class LayoutA extends StatelessComponent {
      static __isComponent = true;
      static __isStateless = true;
      render() {
        const el = document.createElement("section");
        el.dataset.layout = "a";
        return el;
      }
    }

    window.history.pushState(null, "", "/a");
    const router = createRouter([
      { path: "/a", component: HomePage as never, layout: LayoutA as never },
      { path: "/plain", component: AboutPage as never },
    ]);
    const { container } = mountInContainer(RouterView as never);
    await vi.waitFor(() => {
      expect(container.querySelector("[data-layout=a]")).not.toBeNull();
    });

    await router.push("/plain");
    await vi.waitFor(() => {
      expect(container.textContent).toContain("About");
    });
    expect(container.querySelector("[data-layout=a]")).toBeNull();
    document.body.removeChild(container);
  });
});

// ── RouterOutlet ──────────────────────────────────────────────────────────────

describe("RouterOutlet", () => {
  it("renders the current route component", async () => {
    setup("/");
    const { container } = mountInContainer(RouterOutlet as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));
    expect(container.textContent).toContain("Home");
    document.body.removeChild(container);
  });

  it("updates when the route changes", async () => {
    const router = setup("/");
    const { container } = mountInContainer(RouterOutlet as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));

    await router.push("/about");
    await vi.waitFor(() => container.textContent?.includes("About"));
    expect(container.textContent).toContain("About");
  });

  it("renders nothing for an unmatched route", async () => {
    const router = setup("/");
    const { container } = mountInContainer(RouterOutlet as never);
    await vi.waitFor(() => container.textContent?.includes("Home"));

    await router.push("/does-not-exist");
    await vi.waitFor(() => !container.textContent?.includes("Home"));
    expect(container.querySelector("[data-router-outlet]")?.textContent?.trim()).toBe("");
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

  it("toggles activeClass as the location changes", async () => {
    const router = setup("/");
    const { container } = mountInContainer(Link as never, { to: "/about", class: "nav" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toBe("nav");
    await router.push("/about");
    expect(a?.getAttribute("class")).toBe("nav active");
    await router.push("/");
    expect(a?.getAttribute("class")).toBe("nav");
  });

  it("removes the class attribute again when a link without a class stops being active", async () => {
    const router = setup("/about");
    const { container } = mountInContainer(Link as never, { to: "/about" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toBe("active");
    await router.push("/");
    expect(a?.hasAttribute("class")).toBe(false);
    await router.push("/about");
    expect(a?.getAttribute("class")).toBe("active");

    const inactive = mountInContainer(Link as never, { to: "/other" }).container.querySelector("a");
    expect(inactive?.hasAttribute("class")).toBe(false);
    const empty = mountInContainer(Link as never, { to: "/about", activeClass: "" }).container.querySelector("a");
    expect(empty?.hasAttribute("class")).toBe(false);
  });

  it("uses only activeClass when there is no class prop", () => {
    setup("/about");
    const { container } = mountInContainer(Link as never, { to: "/about" });
    expect(container.querySelector("a")?.getAttribute("class")).toBe("active");
  });

  it("keeps the class prop alone when activeClass is empty", () => {
    setup("/about");
    const { container } = mountInContainer(Link as never, { to: "/about", class: "nav", activeClass: "" });
    expect(container.querySelector("a")?.getAttribute("class")).toBe("nav");
  });

  it("applies a custom class prop", () => {
    setup("/");
    const { container } = mountInContainer(Link as never, { to: "/about", class: "nav-link" });
    const a = container.querySelector("a");
    expect(a?.getAttribute("class")).toContain("nav-link");
  });
});
