// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { resource } from "@praxisjs/core/internal";
import { Head } from "@praxisjs/head";
import type { RouteDefinition, RouteLocation } from "@praxisjs/router";
import { Location } from "@praxisjs/router";
import { getCurrentScope, mountComponent, mountElement, render } from "@praxisjs/runtime";

import { prerender, withDomGlobals } from "../prerender";

const TEMPLATE =
  '<!doctype html><html><head><title>App</title></head><body><div id="app"></div></body></html>';

@Head((self) => ({ title: `Page: ${(self as Page).location().path}` }))
class Page extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  @Location() location!: RouteLocation;

  render() {
    return mountElement("main", {
      id: "root",
      children: [
        mountElement("h1", { children: `Path: ${this.location().path}` }, getCurrentScope()),
        mountElement("button", { id: "btn", onClick: () => {}, children: "Click" }, getCurrentScope()),
      ],
    }, getCurrentScope());
  }
}

class AsyncPage extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  data = resource(() => Promise.resolve("loaded content"));

  render() {
    return mountElement("p", { id: "data", children: () => this.data.data() ?? "pending" }, getCurrentScope());
  }
}

describe("prerender()", () => {
  it("renders each static route to its own page with the hydration marker", async () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: Page as never },
      { path: "/about", component: Page as never },
    ];

    const pages = await prerender({ root: Page as never, routes, template: TEMPLATE });

    expect(pages.map((p) => p.path).sort()).toEqual(["/", "/about"]);
    const home = pages.find((p) => p.path === "/")!;
    expect(home.file).toBe("index.html");
    expect(home.html).toContain("Path: /");
    expect(home.html).toContain('data-praxis-ssg="1"');

    const about = pages.find((p) => p.path === "/about")!;
    expect(about.file).toBe("about/index.html");
    expect(about.html).toContain("Path: /about");
  });

  it("omits the hydration marker when hydrate: false", async () => {
    const routes: RouteDefinition[] = [{ path: "/", component: Page as never }];
    const pages = await prerender({ root: Page as never, routes, template: TEMPLATE, hydrate: false });
    expect(pages[0].html).not.toContain("data-praxis-ssg");
  });

  it("expands a dynamic route via getStaticPaths", async () => {
    const routes: RouteDefinition[] = [{ path: "/blog/:slug", component: Page as never }];
    const pages = await prerender({
      root: Page as never,
      routes,
      template: TEMPLATE,
      getStaticPaths: async () => ["/blog/hello", "/blog/world"],
    });
    expect(pages.map((p) => p.file).sort()).toEqual(["blog/hello/index.html", "blog/world/index.html"]);
  });

  it("waits for resource() data to settle before serializing", async () => {
    const routes: RouteDefinition[] = [{ path: "/", component: AsyncPage as never }];
    const pages = await prerender({ root: AsyncPage as never, routes, template: TEMPLATE });
    expect(pages[0].html).toContain("loaded content");
    expect(pages[0].html).not.toContain("pending");
  });

  it("sets per-route <title> via @Head and does not leak it across routes", async () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: Page as never },
      { path: "/about", component: Page as never },
    ];
    const pages = await prerender({ root: Page as never, routes, template: TEMPLATE });
    const home = pages.find((p) => p.path === "/")!;
    const about = pages.find((p) => p.path === "/about")!;
    expect(home.html).toContain("<title>Page: /</title>");
    expect(about.html).toContain("<title>Page: /about</title>");
  });

  it("does not leak globalThis.document/window back to the caller's environment", async () => {
    const outer = document;
    const routes: RouteDefinition[] = [{ path: "/", component: Page as never }];
    await prerender({ root: Page as never, routes, template: TEMPLATE });
    expect(globalThis.document).toBe(outer);
  });

  it("throws a clear error when the container selector is not found in the template", async () => {
    const routes: RouteDefinition[] = [{ path: "/", component: Page as never }];
    await expect(
      prerender({ root: Page as never, routes, template: "<html><body></body></html>" }),
    ).rejects.toThrow(/No element matching/);
  });
});

describe("withDomGlobals", () => {
  it("deletes a patched global on restore when it had no prior descriptor, and restores others that did", async () => {
    const priorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Comment");
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- simulating a Node environment where this global never existed
    delete (globalThis as Record<string, unknown>).Comment;

    try {
      let sawCommentDuring: unknown;
      await withDomGlobals("<!doctype html><html><body></body></html>", "http://localhost/", async () => {
        sawCommentDuring = globalThis.Comment;
        // document existed before this call (vitest's jsdom environment) — restoreGlobals
        // must put its original descriptor back, not delete it.
        expect(globalThis.document).toBeDefined();
      });

      expect(sawCommentDuring).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(globalThis, "Comment")).toBeUndefined();
      expect(globalThis.document).toBeDefined();
    } finally {
      if (priorDescriptor) Object.defineProperty(globalThis, "Comment", priorDescriptor);
    }
  });
});

describe("prerender() -> render() round trip", () => {
  it("produces HTML the client can hydrate without recreating the adopted nodes", async () => {
    const routes: RouteDefinition[] = [{ path: "/", component: Page as never }];
    const pages = await prerender({ root: Page as never, routes, template: TEMPLATE });
    const html = pages[0].html;

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const appHTML = parsed.querySelector("#app")?.innerHTML ?? "";

    const container = document.createElement("div");
    container.innerHTML = appHTML;
    container.setAttribute("data-praxis-ssg", "1");
    document.body.appendChild(container);

    const h1Before = container.querySelector("h1");
    const btnBefore = container.querySelector("#btn");
    expect(h1Before?.textContent).toBe("Path: /");

    let clicks = 0;
    class ClientPage extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        return mountElement("main", {
          id: "root",
          children: [
            mountElement("h1", { children: "Path: /" }, getCurrentScope()),
            mountElement("button", { id: "btn", onClick: () => { clicks++; }, children: "Click" }, getCurrentScope()),
          ],
        }, getCurrentScope());
      }
    }

    render(() => mountComponent(ClientPage as never, {}, getCurrentScope()), container);

    expect(container.querySelector("h1")).toBe(h1Before);
    expect(container.querySelector("#btn")).toBe(btnBefore);

    container.querySelector("#btn")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);

    document.body.removeChild(container);
  });
});
