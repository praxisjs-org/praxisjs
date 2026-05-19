import { describe, it, expect } from "vitest";
import { contentPlugin } from "../vite";
import type { Plugin } from "vite";

function transform(code: string, id = "collections.ts"): string | undefined {
  const plugin = contentPlugin() as Plugin & {
    transform: (code: string, id: string) => { code: string } | undefined;
  };
  const result = plugin.transform(code, id);
  return result?.code;
}

describe("contentPlugin transform", () => {
  it("replaces @Collection with single-quoted string", () => {
    const out = transform("@Collection('./blog/*.md')");
    expect(out).toContain("import.meta.glob");
    expect(out).toContain("./blog/*.md");
    expect(out).toContain("query: '?raw'");
    expect(out).toContain("import: 'default'");
    expect(out).not.toContain("eager");
    expect(out).not.toContain("@Collection('./blog/*.md')");
  });

  it("replaces @Collection with double-quoted string", () => {
    const out = transform('@Collection("./blog/*.md")');
    expect(out).toContain("import.meta.glob");
    expect(out).toContain("./blog/*.md");
  });

  it("replaces @Collection with backtick string", () => {
    const out = transform("@Collection(`./blog/*.md`)");
    expect(out).toContain("import.meta.glob");
    expect(out).toContain("./blog/*.md");
  });

  it("does not transform @Collection(Blog) — non-string argument", () => {
    const out = transform("@Collection(Blog)");
    expect(out).toBeUndefined(); // no transformation
  });

  it("does not transform .tsx files without the decorator", () => {
    const out = transform("const x = 1;", "file.ts");
    expect(out).toBeUndefined();
  });

  it("skips non-ts files", () => {
    const out = transform("@Collection('./blog/*.md')", "file.js");
    expect(out).toBeUndefined();
  });

  it("uses query: '?raw', import: 'default', and no eager", () => {
    const out = transform("@Collection('./docs/*.mdx')");
    expect(out).toContain("query: '?raw'");
    expect(out).toContain("import: 'default'");
    expect(out).not.toContain("eager");
  });

  it("handles path with nested glob", () => {
    const out = transform("@Collection('./**/*.md')");
    expect(out).toContain("import.meta.glob");
    expect(out).toContain("./**/*.md");
  });
});
