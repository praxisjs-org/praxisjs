import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, it, expect } from "vitest";

import { copy } from "../utils";

// ── copy ──────────────────────────────────────────────────────────────────────

describe("copy", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxis-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("copies a single file", () => {
    const src = path.join(tmpDir, "src.txt");
    const dest = path.join(tmpDir, "dest.txt");
    fs.writeFileSync(src, "hello");
    copy(src, dest);
    expect(fs.readFileSync(dest, "utf-8")).toBe("hello");
  });

  it("copies a directory recursively", () => {
    const srcDir = path.join(tmpDir, "src");
    const destDir = path.join(tmpDir, "dest");
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, "file.ts"), "code");
    const nested = path.join(srcDir, "sub");
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(nested, "nested.ts"), "nested");

    copy(srcDir, destDir);

    expect(fs.existsSync(path.join(destDir, "file.ts"))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, "file.ts"), "utf-8")).toBe("code");
    expect(fs.existsSync(path.join(destDir, "sub", "nested.ts"))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, "sub", "nested.ts"), "utf-8")).toBe("nested");
  });
});
