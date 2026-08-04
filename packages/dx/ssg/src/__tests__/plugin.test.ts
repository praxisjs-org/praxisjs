import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, vi, afterEach } from "vitest";

import type { ResolvedConfig } from "vite";

import { prerender } from "../prerender";
import { ssgPlugin } from "../index";

vi.mock("../prerender", () => ({
  prerender: vi.fn(),
  // Pass-through stand-in — the real DOM-global install/restore mechanics
  // are covered in prerender.test.ts; here we only need loadEntry() to call
  // through to whatever function it wraps.
  withDomGlobals: vi.fn((_html: string, _url: string, fn: () => unknown) => fn()),
}));

const ssrLoadModule = vi.fn();
const close = vi.fn();
const createServer = vi.fn(async (_options: unknown) => ({ ssrLoadModule, close }));

vi.mock("vite", () => ({
  createServer: (options: unknown) => createServer(options),
}));

// registerLoaderHook()'s fallback path (module.register with a file URL)
// assumes a built dist/ layout — loader-hook.js physically next to index.js
// — which doesn't exist under vitest's on-the-fly source transform. The
// mechanism itself is covered separately by running the actual built dist/
// output through Node directly (see the plan's manual verification step);
// here we only need to confirm ssgPlugin() triggers registration.
const { registerHooks, register } = vi.hoisted(() => ({
  registerHooks: vi.fn(),
  register: vi.fn(),
}));
vi.mock("node:module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:module")>();
  return { ...actual, registerHooks, register };
});

const RootComponent = class {} as never;
const routes = [{ path: "/", component: RootComponent }];

function fakeResolvedConfig(root: string, outDir = "dist"): ResolvedConfig {
  return {
    root,
    build: { outDir },
    configFile: `${root}/vite.config.ts`,
  } as unknown as ResolvedConfig;
}

describe("ssgPlugin()", () => {
  let dir: string;

  afterEach(async () => {
    vi.clearAllMocks();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("loads the root component and routes from a single SSR module load, prerenders, and writes files", async () => {
    dir = await mkdtemp(join(tmpdir(), "praxisjs-ssg-"));
    await mkdir(join(dir, "dist"), { recursive: true });
    await writeFile(join(dir, "dist", "index.html"), "<html><body><div id=\"app\"></div></body></html>");

    ssrLoadModule.mockResolvedValue({ default: RootComponent, routes });
    vi.mocked(prerender).mockResolvedValue([
      { path: "/", file: "index.html", html: "<html>home</html>" },
      { path: "/about", file: "about/index.html", html: "<html>about</html>" },
    ]);

    const plugin = ssgPlugin({ root: "./src/app.tsx" });

    // ssgPlugin() must register the extensionless-import retry hook
    // synchronously, before closeBundle ever dynamically imports
    // ./prerender (which is what actually needs it) — see index.ts.
    expect(registerHooks.mock.calls.length + register.mock.calls.length).toBeGreaterThan(0);

    const configResolved = plugin.configResolved as (c: ResolvedConfig) => void | Promise<void>;
    await configResolved(fakeResolvedConfig(dir));
    const closeBundle = plugin.closeBundle as () => Promise<void>;
    await closeBundle();

    expect(createServer).toHaveBeenCalledWith(
      expect.objectContaining({
        root: dir,
        configFile: `${dir}/vite.config.ts`,
        server: { middlewareMode: true, watch: null },
        appType: "custom",
        ssr: { external: true },
        optimizeDeps: { noDiscovery: true, include: [] },
      }),
    );
    // A single ssrLoadModule call reads both the default export and the
    // named `routes` export — vite.config.ts never imports app source itself.
    expect(ssrLoadModule).toHaveBeenCalledOnce();
    expect(ssrLoadModule).toHaveBeenCalledWith("./src/app.tsx");
    expect(close).toHaveBeenCalledOnce();

    expect(prerender).toHaveBeenCalledWith(
      expect.objectContaining({
        root: RootComponent,
        routes,
        template: "<html><body><div id=\"app\"></div></body></html>",
      }),
    );

    expect(await readFile(join(dir, "dist", "index.html"), "utf-8")).toBe("<html>home</html>");
    expect(await readFile(join(dir, "dist", "about", "index.html"), "utf-8")).toBe("<html>about</html>");
  });

  it("throws a clear error when the root module has no default export", async () => {
    dir = await mkdtemp(join(tmpdir(), "praxisjs-ssg-"));
    await mkdir(join(dir, "dist"), { recursive: true });
    await writeFile(join(dir, "dist", "index.html"), "<html><body><div id=\"app\"></div></body></html>");

    ssrLoadModule.mockResolvedValue({ routes });

    const plugin = ssgPlugin({ root: "./src/app.tsx" });
    const configResolved = plugin.configResolved as (c: ResolvedConfig) => void | Promise<void>;
    await configResolved(fakeResolvedConfig(dir));
    const closeBundle = plugin.closeBundle as () => Promise<void>;

    await expect(closeBundle()).rejects.toThrow(/no default export/);
    expect(close).toHaveBeenCalledOnce(); // server is closed even on failure
  });

  it("throws a clear error when the root module has no named routes export", async () => {
    dir = await mkdtemp(join(tmpdir(), "praxisjs-ssg-"));
    await mkdir(join(dir, "dist"), { recursive: true });
    await writeFile(join(dir, "dist", "index.html"), "<html><body><div id=\"app\"></div></body></html>");

    ssrLoadModule.mockResolvedValue({ default: RootComponent });

    const plugin = ssgPlugin({ root: "./src/app.tsx" });
    const configResolved = plugin.configResolved as (c: ResolvedConfig) => void | Promise<void>;
    await configResolved(fakeResolvedConfig(dir));
    const closeBundle = plugin.closeBundle as () => Promise<void>;

    await expect(closeBundle()).rejects.toThrow(/no named "routes" export/);
    expect(close).toHaveBeenCalledOnce();
  });

  it("passes hydrate: false through to prerender()", async () => {
    dir = await mkdtemp(join(tmpdir(), "praxisjs-ssg-"));
    await mkdir(join(dir, "dist"), { recursive: true });
    await writeFile(join(dir, "dist", "index.html"), "<html><body><div id=\"app\"></div></body></html>");

    ssrLoadModule.mockResolvedValue({ default: RootComponent, routes });
    vi.mocked(prerender).mockResolvedValue([{ path: "/", file: "index.html", html: "<html></html>" }]);

    const plugin = ssgPlugin({ root: "./src/app.tsx", hydrate: false });
    const configResolved = plugin.configResolved as (c: ResolvedConfig) => void | Promise<void>;
    await configResolved(fakeResolvedConfig(dir));
    const closeBundle = plugin.closeBundle as () => Promise<void>;
    await closeBundle();

    expect(prerender).toHaveBeenCalledWith(expect.objectContaining({ hydrate: false }));
  });
});
