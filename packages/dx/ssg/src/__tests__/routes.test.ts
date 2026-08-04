import { describe, it, expect } from "vitest";

import type { RouteDefinition } from "@praxisjs/router";

import { flattenRoutes, isStaticPath, pathToOutputFile, resolvePaths } from "../routes";

const Noop = class {} as never;

describe("flattenRoutes", () => {
  it("flattens a flat route list unchanged", () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: Noop },
      { path: "/about", component: Noop },
    ];
    expect(flattenRoutes(routes).map((r) => r.fullPath)).toEqual(["/", "/about"]);
  });

  it("prefixes nested children with the parent path", () => {
    const routes: RouteDefinition[] = [
      {
        path: "/blog",
        component: Noop,
        children: [
          { path: "/", component: Noop },
          { path: "/:slug", component: Noop },
        ],
      },
    ];
    expect(flattenRoutes(routes).map((r) => r.fullPath)).toEqual(["/blog", "/blog/", "/blog/:slug"]);
  });

  it("treats a root parent's prefix as empty, matching RouterInstance.addRoute", () => {
    const routes: RouteDefinition[] = [
      {
        path: "/",
        component: Noop,
        children: [{ path: "/dashboard", component: Noop }],
      },
    ];
    expect(flattenRoutes(routes).map((r) => r.fullPath)).toEqual(["/", "/dashboard"]);
  });
});

describe("isStaticPath", () => {
  it("treats plain paths as static", () => {
    expect(isStaticPath("/about")).toBe(true);
    expect(isStaticPath("/")).toBe(true);
  });

  it("treats :param segments as dynamic", () => {
    expect(isStaticPath("/blog/:slug")).toBe(false);
  });

  it("treats optional :param? segments as dynamic", () => {
    expect(isStaticPath("/users/:id?")).toBe(false);
  });

  it("treats ** catch-alls as dynamic", () => {
    expect(isStaticPath("/docs/**")).toBe(false);
  });
});

describe("resolvePaths", () => {
  it("returns static paths as-is", async () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: Noop },
      { path: "/about", component: Noop },
    ];
    expect(await resolvePaths({ routes })).toEqual(["/", "/about"]);
  });

  it("expands a dynamic route via getStaticPaths", async () => {
    const routes: RouteDefinition[] = [{ path: "/blog/:slug", component: Noop }];
    const paths = await resolvePaths({
      routes,
      getStaticPaths: async () => ["/blog/hello", "/blog/world"],
    });
    expect(paths).toEqual(["/blog/hello", "/blog/world"]);
  });

  it("skips dynamic routes with no getStaticPaths", async () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: Noop },
      { path: "/blog/:slug", component: Noop },
    ];
    expect(await resolvePaths({ routes })).toEqual(["/"]);
  });

  it("passes the route and its full path pattern to getStaticPaths", async () => {
    const target: RouteDefinition = { path: "/blog/:slug", component: Noop };
    const routes: RouteDefinition[] = [target];
    let seen: [RouteDefinition, string] | undefined;
    await resolvePaths({
      routes,
      getStaticPaths: async (route, fullPath) => {
        seen = [route, fullPath];
        return [];
      },
    });
    expect(seen).toEqual([target, "/blog/:slug"]);
  });

  it("de-duplicates paths across routes", async () => {
    const routes: RouteDefinition[] = [
      { path: "/blog/:slug", component: Noop },
      { path: "/other/:slug", component: Noop },
    ];
    const paths = await resolvePaths({
      routes,
      getStaticPaths: async () => ["/shared"],
    });
    expect(paths).toEqual(["/shared"]);
  });

  it("expands a dynamic route via its own colocated getStaticPaths, with no global fallback needed", async () => {
    const routes: RouteDefinition[] = [
      { path: "/blog/:slug", component: Noop, getStaticPaths: async () => ["/blog/hello", "/blog/world"] } as RouteDefinition,
    ];
    expect(await resolvePaths({ routes })).toEqual(["/blog/hello", "/blog/world"]);
  });

  it("passes the route's own full path to its colocated getStaticPaths", async () => {
    let seen: string | undefined;
    const routes: RouteDefinition[] = [
      {
        path: "/blog/:slug",
        component: Noop,
        getStaticPaths: async (fullPath: string) => {
          seen = fullPath;
          return [];
        },
      } as RouteDefinition,
    ];
    await resolvePaths({ routes });
    expect(seen).toBe("/blog/:slug");
  });

  it("prefers a route's own getStaticPaths over the global fallback", async () => {
    const routes: RouteDefinition[] = [
      { path: "/blog/:slug", component: Noop, getStaticPaths: async () => ["/blog/own"] } as RouteDefinition,
    ];
    const paths = await resolvePaths({
      routes,
      getStaticPaths: async () => ["/blog/global"],
    });
    expect(paths).toEqual(["/blog/own"]);
  });

  it("falls back to the global getStaticPaths for routes with no colocated one, alongside routes that have their own", async () => {
    const routes: RouteDefinition[] = [
      { path: "/blog/:slug", component: Noop, getStaticPaths: async () => ["/blog/own"] } as RouteDefinition,
      { path: "/other/:slug", component: Noop },
    ];
    const paths = await resolvePaths({
      routes,
      getStaticPaths: async (_route, fullPath) => (fullPath === "/other/:slug" ? ["/other/global"] : []),
    });
    expect(paths).toEqual(["/blog/own", "/other/global"]);
  });
});

describe("pathToOutputFile", () => {
  it("maps the root path to index.html", () => {
    expect(pathToOutputFile("/")).toBe("index.html");
  });

  it("maps a nested path to <path>/index.html", () => {
    expect(pathToOutputFile("/about")).toBe("about/index.html");
    expect(pathToOutputFile("/blog/hello-world")).toBe("blog/hello-world/index.html");
  });

  it("normalizes surrounding slashes", () => {
    expect(pathToOutputFile("/about/")).toBe("about/index.html");
  });
});
