// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { resource } from "@praxisjs/core/internal";
import { Head } from "@praxisjs/head";
import type { RouteDefinition, RouteLocation } from "@praxisjs/router";
import { Location } from "@praxisjs/router";
import { _$element, _$reactiveOnly, _$scope, _$template, enableHydration, getCurrentScope, mountComponent, mountElement, render } from "@praxisjs/runtime";

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

describe("prerender() route isolation", () => {
  it("renders every route in one window, reset to the template before each route", async () => {
    const seen: Array<{ document: Document; strayBefore: boolean; title: string }> = [];

    class Leaky extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        seen.push({
          document,
          strayBefore: document.getElementById("stray") !== null,
          title: document.title,
        });
        const stray = document.createElement("div");
        stray.id = "stray";
        document.body.appendChild(stray);
        document.title = `changed on ${location.pathname}`;
        return mountElement("p", { children: location.pathname }, getCurrentScope());
      }
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: Leaky as never },
      { path: "/about", component: Leaky as never },
    ];
    const pages = await prerender({ root: Leaky as never, routes, template: TEMPLATE });

    expect(seen).toHaveLength(2);
    expect(seen[1].document).toBe(seen[0].document);
    expect(seen.map((s) => s.strayBefore)).toEqual([false, false]);
    expect(seen.map((s) => s.title)).toEqual(["App", "App"]);
    expect(pages[1].html).toContain("<p>/about</p>");
    expect(pages[1].html.match(/id="stray"/g)).toHaveLength(1);
  });

  it("does not carry window globals or storage from one route into the next", async () => {
    const reads: Array<{ global: unknown; local: string | null; session: string | null }> = [];

    class Writer extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        const w = window as unknown as Record<string, unknown>;
        reads.push({
          global: w.__routeGlobal,
          local: localStorage.getItem("route"),
          session: sessionStorage.getItem("route"),
        });
        w.__routeGlobal = location.pathname;
        localStorage.setItem("route", location.pathname);
        sessionStorage.setItem("route", location.pathname);
        return mountElement("p", { children: "x" }, getCurrentScope());
      }
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: Writer as never },
      { path: "/about", component: Writer as never },
    ];
    await prerender({ root: Writer as never, routes, template: TEMPLATE });

    expect(reads).toEqual([
      { global: undefined, local: null, session: null },
      { global: undefined, local: null, session: null },
    ]);
  });

  it("unmounts each page after serializing it", async () => {
    const events: string[] = [];

    class Tracked extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onUnmount() {
        events.push(`unmount ${location.pathname}`);
      }
      render() {
        events.push(`render ${location.pathname}`);
        return mountElement("p", { children: "x" }, getCurrentScope());
      }
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: Tracked as never },
      { path: "/about", component: Tracked as never },
    ];
    await prerender({ root: Tracked as never, routes, template: TEMPLATE });

    expect(events).toEqual(["render /", "unmount /", "render /about", "unmount /about"]);
  });

  it("closes the window afterwards, so timers a page left running never fire", async () => {
    const fired = vi.fn();

    class Timer extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        window.setTimeout(fired, 0);
        return mountElement("p", { children: "x" }, getCurrentScope());
      }
    }

    await prerender({ root: Timer as never, routes: [{ path: "/", component: Timer as never }], template: TEMPLATE });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fired).not.toHaveBeenCalled();
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

    enableHydration();
    render(() => mountComponent(ClientPage as never, {}, getCurrentScope()), container);

    expect(container.querySelector("h1")).toBe(h1Before);
    expect(container.querySelector("#btn")).toBe(btnBefore);

    container.querySelector("#btn")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);

    document.body.removeChild(container);
  });

  it("renders compiled templates in every run, each with its own window", async () => {
    const section = _$template(() => _$element("section", { class: "tpl" }, [_$element("b", null, null)]));
    class TemplatePage extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        const root = section();
        _$reactiveOnly(root.firstChild as Node, () => "compiled", _$scope());
        return root;
      }
    }
    const routes: RouteDefinition[] = [{ path: "/", component: TemplatePage as never }];
    for (let run = 0; run < 2; run++) {
      const [page] = await prerender({ root: TemplatePage as never, routes, template: TEMPLATE });
      expect(page.html).toContain('<div id="app" data-praxis-ssg="1"><section class="tpl"><b>compiled</b></section></div>');
    }
  });
});
