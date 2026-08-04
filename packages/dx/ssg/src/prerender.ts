import { JSDOM } from "jsdom";

import {
  flushPendingResources,
  isServerRenderPass,
  setServerRenderPass,
} from "@praxisjs/core/internal";
import { resetHeadState } from "@praxisjs/head/internal";
import type { RouteDefinition, RouterOptions } from "@praxisjs/router";
import { createRouter } from "@praxisjs/router/internal";
import { getCurrentScope, mountComponent, render } from "@praxisjs/runtime";
import type { ComponentConstructor } from "@praxisjs/shared/internal";

import { normalizeRoutes, pathToOutputFile, resolvePaths, type GetStaticPaths, type RouteEntry } from "./routes";

// Re-exported here (this whole file, plus these, only resolves once the
// loader hook is registered — see register.ts) rather than from the main
// package entry, so importing `ssgPlugin` alone never needs router/core/head
// resolved statically. See index.ts.
export { flattenRoutes, isStaticPath, normalizeRoutes, pathToOutputFile, resolvePaths, type FlattenedRoute, type ResolvePathsConfig } from "./routes";

const SSG_MARKER = "data-praxis-ssg";

export interface PrerenderConfig {
  /** Root component class — same one passed to `@Router([...])`/mounted by `main.tsx`. */
  root: ComponentConstructor;
  /** Same route table passed to `@Router([...])` — a mix of RouteDefinitions and bare @Route-decorated classes is fine, same as the decorator itself accepts. */
  routes: RouteEntry[];
  routerOptions?: RouterOptions;
  /** Global fallback for expanding a dynamic route (`:slug`, `**`) into concrete paths — a route with its own `getStaticPaths` uses that instead. Dynamic routes with neither are skipped. */
  getStaticPaths?: GetStaticPaths;
  /** The built `index.html` content — reused as the template for every page. */
  template: string;
  /** CSS selector for the mount container inside `template`. Default: `#app`. */
  containerSelector?: string;
  /** Whether to mark output HTML for client-side hydration. Default: `true`. When `false`, the client falls back to a full remount instead of reconciling. */
  hydrate?: boolean;
}

export interface PrerenderedPage {
  path: string;
  /** Output file path relative to the SSG out dir, e.g. `about/index.html`. */
  file: string;
  html: string;
}

export async function prerender(config: PrerenderConfig): Promise<PrerenderedPage[]> {
  const { getStaticPaths } = config;
  const routes = normalizeRoutes(config.routes);
  const paths = await resolvePaths({ routes, getStaticPaths });

  const wasServerPass = isServerRenderPass();
  setServerRenderPass(true);
  try {
    const pages: PrerenderedPage[] = [];
    for (const path of paths) {
      pages.push(await renderPage(path, { ...config, routes }));
    }
    return pages;
  } finally {
    setServerRenderPass(wasServerPass);
  }
}

const PATCHED_GLOBALS = ["window", "document", "navigator", "history", "location", "Node", "Comment", "Text", "Element", "HTMLElement"] as const;

type GlobalSnapshot = Partial<Record<(typeof PATCHED_GLOBALS)[number], PropertyDescriptor>>;

// Modern Node already defines some of these itself (globalThis.navigator is a
// getter-only built-in since Node 21) — plain assignment throws on those, so
// every property is installed *and* restored via defineProperty, capturing
// the original descriptor (not just its value) to put back exactly what was
// there, getter and all, rather than flattening it into a plain value.
function installDomGlobals(dom: JSDOM): GlobalSnapshot {
  const g = globalThis as unknown as Record<string, unknown>;
  const snapshot: GlobalSnapshot = {};
  for (const key of PATCHED_GLOBALS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    if (descriptor) snapshot[key] = descriptor;
  }

  const { window } = dom;
  const values: Record<(typeof PATCHED_GLOBALS)[number], unknown> = {
    window,
    document: window.document,
    navigator: window.navigator,
    history: window.history,
    location: window.location,
    Node: window.Node,
    Comment: window.Comment,
    Text: window.Text,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
  };
  for (const key of PATCHED_GLOBALS) {
    Object.defineProperty(g, key, { value: values[key], writable: true, configurable: true, enumerable: true });
  }

  return snapshot;
}

function restoreGlobals(snapshot: GlobalSnapshot): void {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of PATCHED_GLOBALS) {
    const descriptor = snapshot[key];
    if (descriptor) {
      Object.defineProperty(g, key, descriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- removing a global that genuinely didn't exist before installDomGlobals() added it
      delete g[key];
    }
  }
}

/**
 * Runs `fn` with a fresh JSDOM's `window`/`document`/etc installed as globals
 * for its duration, then restores whatever was there before. Exported so
 * `index.ts`'s `loadEntry()` can use it too: `ssrLoadModule()`-ing the app's
 * root module runs `@Router([...])`'s class decorator, which calls
 * `createRouter()` immediately (at module-evaluation time) — that needs a
 * `window` in place just as much as the real per-route render below does,
 * even though it's not rendering anything itself yet.
 */
export async function withDomGlobals<T>(html: string, url: string, fn: (dom: JSDOM) => Promise<T>): Promise<T> {
  const dom = new JSDOM(html, { url });
  const snapshot = installDomGlobals(dom);
  try {
    return await fn(dom);
  } finally {
    restoreGlobals(snapshot);
  }
}

async function renderPage(
  path: string,
  config: Omit<PrerenderConfig, "routes"> & { routes: RouteDefinition[] },
): Promise<PrerenderedPage> {
  const { root, routes, routerOptions, template, hydrate = true } = config;
  const containerSelector = config.containerSelector ?? "#app";

  return withDomGlobals(template, `http://localhost${path}`, async (dom) => {
    resetHeadState();

    const container = dom.window.document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`[@praxisjs/ssg] No element matching "${containerSelector}" found in the HTML template.`);
    }

    createRouter(routes, routerOptions);

    const dispose = render(
      () => mountComponent(root, {}, getCurrentScope()),
      container as HTMLElement,
    );

    await flushPendingResources();
    await Promise.resolve();

    // Marked *after* rendering — the server always mounts fresh (create-mode);
    // the marker only tells the client to hydrate instead of remounting.
    if (hydrate) container.setAttribute(SSG_MARKER, "1");

    const html = dom.serialize();
    dispose();

    return { path, file: pathToOutputFile(path), html };
  });
}
