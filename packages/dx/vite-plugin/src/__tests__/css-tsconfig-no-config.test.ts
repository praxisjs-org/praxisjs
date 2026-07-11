// Isolated test file: mocks typescript's readConfigFile to return a result
// with no `config` (the shape its own types allow but the real implementation
// never produces) to exercise the `configFile.config ?? {}` fallback in css.ts.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

vi.mock("typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typescript")>();
  return {
    default: {
      ...actual,
      readConfigFile: () => ({ config: undefined }),
    },
  };
});

type PluginHooks = {
  configResolved(c: Partial<ResolvedConfig>): void;
  load(id: string): string | undefined;
  buildStart(): Promise<void>;
};

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "praxis-css-tsconfig-noconfig-"));
  writeFileSync(path.join(tmpDir, "tsconfig.json"), "{}");
  writeFileSync(
    path.join(tmpDir, "styles.ts"),
    `
import { Stylesheet, Styled } from "@praxisjs/css";
class X extends Stylesheet { $root = this.css({ display: "flex" }); }
Styled(X);
`,
  );
});

afterAll(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("praxisjsCSS() — tsconfig with no config object (mocked)", () => {
  it("still extracts CSS when readConfigFile returns no config", async () => {
    const { praxisjsCSS } = await import("../css");
    const p = praxisjsCSS() as unknown as Plugin & { configResolved: PluginHooks["configResolved"]; buildStart: PluginHooks["buildStart"]; load: PluginHooks["load"] };
    p.configResolved({ command: "build", root: tmpDir } as Partial<ResolvedConfig>);
    await p.buildStart.call({ info: vi.fn() });
    const css = p.load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain(".prx-root-");
  });
});
