// Isolated test file: mocks typescript to throw so we can exercise the
// readPathAliasPrefixes() catch branch in css.ts.
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
      readConfigFile: () => {
        throw new Error("tsconfig read crash");
      },
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
  tmpDir = mkdtempSync(path.join(tmpdir(), "praxis-css-tsconfig-err-"));
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

describe("praxisjsCSS() — tsconfig path-alias lookup failure (mocked)", () => {
  it("still extracts CSS when reading tsconfig paths throws", async () => {
    const { praxisjsCSS } = await import("../css");
    const p = praxisjsCSS() as unknown as Plugin & { configResolved: PluginHooks["configResolved"]; buildStart: PluginHooks["buildStart"]; load: PluginHooks["load"] };
    p.configResolved({ command: "build", root: tmpDir } as Partial<ResolvedConfig>);
    await p.buildStart.call({ info: vi.fn() });
    const css = p.load("\0virtual:praxisjs/styles.css") as string;
    expect(css).toContain(".prx-root-");
  });
});
