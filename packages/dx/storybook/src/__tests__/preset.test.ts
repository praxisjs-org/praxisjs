import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPraxisPlugin = vi.hoisted(() => vi.fn(() => ({ name: "praxisjs" })));
vi.mock("@praxisjs/vite-plugin", () => ({ default: mockPraxisPlugin }));

const mockReadFile = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", () => ({ readFile: mockReadFile }));

const mockLoadCsf = vi.hoisted(() => vi.fn());
vi.mock("storybook/internal/csf-tools", () => ({ loadCsf: mockLoadCsf }));

import { existsSync } from "node:fs";

import { viteFinal, core, managerEntries, experimental_indexers, previewAnnotations } from "../preset";

beforeEach(() => {
  vi.clearAllMocks();
  mockPraxisPlugin.mockReturnValue({ name: "praxisjs" });
});

// ── viteFinal ─────────────────────────────────────────────────────────────────

describe("viteFinal()", () => {
  it("returns the config object", () => {
    const config = {};
    expect(viteFinal(config)).toBe(config);
  });

  it("adds the praxisjs vite plugin", () => {
    const config: Record<string, unknown> = {};
    viteFinal(config);
    expect(mockPraxisPlugin).toHaveBeenCalledWith({ hmr: true });
    const plugins = config.plugins as unknown[];
    expect(plugins.some((p) => (p as { name: string }).name === "praxisjs")).toBe(true);
  });

  it("adds the story-source plugin", () => {
    const config: Record<string, unknown> = {};
    viteFinal(config);
    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.some((p) => p.name === "praxisjs-story-source")).toBe(true);
  });

  it("preserves existing plugins", () => {
    const existing = { name: "existing" };
    const config: Record<string, unknown> = { plugins: [existing] };
    viteFinal(config);
    const plugins = config.plugins as unknown[];
    expect(plugins[0]).toBe(existing);
  });

  it("handles missing plugins array gracefully", () => {
    expect(() => viteFinal({})).not.toThrow();
    expect(() => viteFinal({ plugins: null })).not.toThrow();
  });
});

// ── core ──────────────────────────────────────────────────────────────────────

describe("core", () => {
  it("specifies @storybook/builder-vite as the builder", () => {
    expect(core.builder).toBe("@storybook/builder-vite");
  });
});

// ── managerEntries ────────────────────────────────────────────────────────────

describe("managerEntries()", () => {
  it("appends the manager entry to the default empty array", () => {
    const result = managerEntries();
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("manager.jsx");
  });

  it("prepends existing entries before the manager entry", () => {
    const result = managerEntries(["/some/entry.js"]);
    expect(result[0]).toBe("/some/entry.js");
    expect(result[1]).toContain("manager.jsx");
  });

  it("points at the manager.jsx shipped with the package", () => {
    expect(existsSync(managerEntries()[0])).toBe(true);
  });
});

// ── previewAnnotations ────────────────────────────────────────────────────────

describe("previewAnnotations()", () => {
  it("appends the preview entry next to the preset", () => {
    expect(previewAnnotations()).toEqual([expect.stringMatching(/[/\\]preview\.js$/)]);
  });

  it("keeps the entries registered before it", () => {
    const result = previewAnnotations(["/a.js", { bare: "b", absolute: "/b.js" }]);
    expect(result.slice(0, 2)).toEqual(["/a.js", { bare: "b", absolute: "/b.js" }]);
    expect(result).toHaveLength(3);
  });
});

// ── storySourcePlugin transform ───────────────────────────────────────────────

describe("storySourcePlugin — transform()", () => {
  function getTransform() {
    const config: Record<string, unknown> = {};
    viteFinal(config);
    const plugins = config.plugins as Array<{ name: string; transform?: (code: string, id: string) => Promise<unknown> }>;
    return plugins.find((p) => p.name === "praxisjs-story-source")!.transform!;
  }

  it("returns null for non-story files", async () => {
    const transform = getTransform();
    expect(await transform("const x = 1;", "/src/app.ts")).toBeNull();
    expect(await transform("const x = 1;", "/src/component.tsx")).toBeNull();
    expect(await transform("export default h;", "/src/history.ts")).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null when reading the file fails", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    const transform = getTransform();
    expect(await transform("export default S;", "/src/foo.stories.tsx")).toBeNull();
  });

  it("returns null without reading the file when there is no `export default` statement", async () => {
    const transform = getTransform();
    expect(await transform("const x = 1;", "/src/foo.stories.tsx")).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("injects storySource metadata for a valid story file", async () => {
    const source = "const MyStories = {};\nexport default MyStories;";
    mockReadFile.mockResolvedValue(source);
    const transform = getTransform();
    const result = (await transform(source, "/src/foo.stories.tsx")) as { code: string; map: null };
    expect(mockReadFile).toHaveBeenCalledWith("/src/foo.stories.tsx", "utf-8");
    expect(result.map).toBeNull();
    expect(result.code).toContain(`storySource: { source: ${JSON.stringify(source)} }`);
    expect(result.code).toContain("export default MyStories;");
  });

  it("matches story files with query strings (e.g. Vite HMR) and .story files", async () => {
    const source = "const S = {};\nexport default S;";
    mockReadFile.mockResolvedValue(source);
    const transform = getTransform();
    expect(await transform(source, "/src/foo.stories.ts?t=123")).not.toBeNull();
    expect(await transform(source, "/src/foo.story.jsx")).not.toBeNull();
    expect(mockReadFile).toHaveBeenCalledWith("/src/foo.stories.ts", "utf-8");
  });
});

// ── experimental_indexers ─────────────────────────────────────────────────────

describe("experimental_indexers()", () => {
  function getIndexer() {
    const [indexer] = experimental_indexers([]);
    return indexer;
  }

  it("returns the praxis indexer first, followed by existing indexers", () => {
    const existing = { test: /\.mdx$/, createIndex: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = experimental_indexers([existing as any]);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(existing);
  });

  it("defaults to no existing indexers", () => {
    const result = experimental_indexers();
    expect(result).toHaveLength(1);
  });

  it("matches .stories.tsx and .stories.ts files", () => {
    const indexer = getIndexer();
    expect(indexer.test.test("Foo.stories.tsx")).toBe(true);
    expect(indexer.test.test("Foo.stories.ts")).toBe(true);
    expect(indexer.test.test("Foo.story.tsx")).toBe(true);
    expect(indexer.test.test("Foo.ts")).toBe(false);
    expect(indexer.test.test("src/history.ts")).toBe(false);
  });

  it("returns empty array for empty files", async () => {
    mockReadFile.mockResolvedValue("   ");
    const indexer = getIndexer();
    const result = await indexer.createIndex("/src/Foo.stories.tsx", { makeTitle: vi.fn() });
    expect(result).toEqual([]);
    expect(mockLoadCsf).not.toHaveBeenCalled();
  });

  it("strips `accessor` keyword before passing code to loadCsf", async () => {
    const withAccessor = `
      class Foo {
        @tracked accessor fahrenheit = 0;
      }
      export default meta;
    `;
    mockReadFile.mockResolvedValue(withAccessor);
    const fakeInputs = [{ exportName: "MyStory" }];
    mockLoadCsf.mockReturnValue({ parse: () => ({ indexInputs: fakeInputs }) });

    const indexer = getIndexer();
    const result = await indexer.createIndex("/src/Foo.stories.tsx", { makeTitle: vi.fn() });

    expect(result).toBe(fakeInputs);
    const passedCode: string = mockLoadCsf.mock.calls[0][0];
    expect(passedCode).not.toContain("accessor ");
    expect(passedCode).toContain("fahrenheit");
  });

  it("passes files without `accessor` to loadCsf unchanged", async () => {
    const code = `export const Story = {};\nexport default meta;`;
    mockReadFile.mockResolvedValue(code);
    mockLoadCsf.mockReturnValue({ parse: () => ({ indexInputs: [] }) });

    const indexer = getIndexer();
    await indexer.createIndex("/src/Foo.stories.tsx", { makeTitle: vi.fn() });

    expect(mockLoadCsf.mock.calls[0][0]).toBe(code);
  });
});

// ── loadability ───────────────────────────────────────────────────────────────

describe("preset module", () => {
  it("imports its relative modules with an extension, since Node loads it without a bundler", async () => {
    const { readFileSync } = await vi.importActual<typeof import("node:fs")>("node:fs");
    const source = readFileSync(new URL("../preset.ts", import.meta.url), "utf-8");
    const relative = [...source.matchAll(/from "(\.{1,2}\/[^"]+)"/g)].map((m) => m[1]);
    expect(relative.length).toBeGreaterThan(0);
    expect(relative.filter((spec) => !spec.endsWith(".js"))).toEqual([]);
  });
});
