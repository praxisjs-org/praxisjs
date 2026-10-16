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

// Re-exported here rather than from the main entry so importing `ssgPlugin` alone never needs
// router/core/head resolved statically: this module only loads once the loader hook in index.ts is
// registered.
export { flattenRoutes, isStaticPath, normalizeRoutes, pathToOutputFile, resolvePaths, type FlattenedRoute, type ResolvePathsConfig } from "./routes";

const SSG_MARKER = "data-praxis-ssg";
const ORIGIN = "http://localhost";

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

interface RenderOptions {
  root: ComponentConstructor;
  routes: RouteDefinition[];
  routerOptions: RouterOptions | undefined;
  containerSelector: string;
  hydrate: boolean;
}

/**
 * Renders every route into a full HTML page. One JSDOM window serves the whole run (parsing a new
 * one per route cost more than most renders) and is reset before each route: a fresh copy of the
 * template's document, the route's URL, empty storage and none of the window globals the previous
 * route added. The window is closed at the end, which also stops any timer a page left running.
 */
export async function prerender(config: PrerenderConfig): Promise<PrerenderedPage[]> {
  const routes = normalizeRoutes(config.routes);
  const paths = await resolvePaths({ routes, getStaticPaths: config.getStaticPaths });
  const options: RenderOptions = {
    root: config.root,
    routes,
    routerOptions: config.routerOptions,
    containerSelector: config.containerSelector ?? "#app",
    hydrate: config.hydrate ?? true,
  };

  const wasServerPass = isServerRenderPass();
  setServerRenderPass(true);
  try {
    return await withDomGlobals(config.template, `${ORIGIN}/`, async (dom) => {
      const { window } = dom;
      const pristine = window.document.documentElement.cloneNode(true);
      const baseline = new Set(Object.getOwnPropertyNames(window));

      const pages: PrerenderedPage[] = [];
      for (const path of paths) {
        resetWindow(dom, pristine, baseline, path);
        pages.push(await renderPage(dom, path, options));
      }
      return pages;
    });
  } finally {
    setServerRenderPass(wasServerPass);
  }
}

function resetWindow(dom: JSDOM, pristine: Node, baseline: Set<string>, path: string): void {
  const { window } = dom;
  const { document } = window;
  document.replaceChild(pristine.cloneNode(true), document.documentElement);
  window.history.replaceState(null, "", `${ORIGIN}${path}`);
  window.localStorage.clear();
  window.sessionStorage.clear();
  const globals = window as unknown as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(window)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- removing globals the previous route's code added
    if (!baseline.has(key)) delete globals[key];
  }
}

async function renderPage(dom: JSDOM, path: string, options: RenderOptions): Promise<PrerenderedPage> {
  const { root, routes, routerOptions, containerSelector, hydrate } = options;
  resetHeadState();

  const container = dom.window.document.querySelector<HTMLElement>(containerSelector);
  if (!container) {
    throw new Error(`[@praxisjs/ssg] No element matching "${containerSelector}" found in the HTML template.`);
  }

  createRouter(routes, routerOptions);

  const dispose = render(() => mountComponent(root, {}, getCurrentScope()), container);
  try {
    await flushPendingResources();
    await Promise.resolve();

    // The server always mounts fresh; the marker only tells the client to hydrate instead of remounting.
    if (hydrate) container.setAttribute(SSG_MARKER, "1");

    return { path, file: pathToOutputFile(path), html: dom.serialize() };
  } finally {
    dispose();
  }
}

const PATCHED_GLOBALS = [
  "window", "document", "navigator", "history", "location", "localStorage", "sessionStorage",
  "Node", "Comment", "Text", "Element", "HTMLElement",
] as const;

type PatchedGlobal = (typeof PATCHED_GLOBALS)[number];
type GlobalSnapshot = Partial<Record<PatchedGlobal, PropertyDescriptor>>;

// Modern Node defines some of these itself (globalThis.navigator is a getter-only built-in since
// Node 21), where plain assignment throws. Every property is installed and restored through
// defineProperty, keeping the original descriptor so a getter comes back as a getter.
function installDomGlobals(dom: JSDOM): GlobalSnapshot {
  const snapshot: GlobalSnapshot = {};
  const { window } = dom;
  const source = window as unknown as Record<PatchedGlobal, unknown>;
  for (const key of PATCHED_GLOBALS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    if (descriptor) snapshot[key] = descriptor;
    const value = key === "window" ? window : source[key];
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true, enumerable: true });
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
 * Runs `fn` with a fresh JSDOM's `window`/`document`/etc installed as globals, then restores what
 * was there before and closes the window. Also used by index.ts's `loadEntry()`: loading the root
 * module runs `@Router([...])`, which calls `createRouter()` at module-evaluation time and so needs
 * a `window` even though nothing is rendered yet.
 */
export async function withDomGlobals<T>(html: string, url: string, fn: (dom: JSDOM) => Promise<T>): Promise<T> {
  const dom = new JSDOM(html, { url });
  const snapshot = installDomGlobals(dom);
  try {
    return await fn(dom);
  } finally {
    restoreGlobals(snapshot);
    dom.window.close();
  }
}
