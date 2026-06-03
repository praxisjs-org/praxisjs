// Isolated test file: mocks esbuild to throw so we can exercise the
// esbuild-failure branch in extractStaticCSS (css.ts line 97).
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

vi.mock("esbuild", () => ({
  build: vi.fn().mockRejectedValue(new Error("esbuild crash")),
}));

type PluginHooks = {
  configResolved(c: Partial<ResolvedConfig>): void;
  load(id: string): string | undefined;
  buildStart(): Promise<void>;
};

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "praxis-css-esbuild-err-"));
  writeFileSync(
    path.join(tmpDir, "styles.ts"),
    `import { Stylesheet } from "@praxisjs/css";\nclass X extends Stylesheet {}`,
  );
});

afterAll(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("praxisjsCSS() — esbuild failure (mocked)", () => {
  it("returns empty CSS when esbuild throws during extraction", async () => {
    const { praxisjsCSS } = await import("../css");
    const p = praxisjsCSS() as unknown as Plugin & { configResolved: PluginHooks["configResolved"]; buildStart: PluginHooks["buildStart"]; load: PluginHooks["load"] };
    p.configResolved({ command: "build", root: tmpDir } as Partial<ResolvedConfig>);
    await p.buildStart.call({ info: vi.fn() });
    expect(p.load("\0virtual:praxisjs/styles.css")).toContain("no static styles found");
  });
});
