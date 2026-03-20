import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import {
  copy,
  emptyDir,
  formatTargetDir,
  isEmpty,
  pkgManagerFromAgent,
  toValidPackageName,
} from "../utils";

// ── formatTargetDir ────────────────────────────────────────────────────────────

describe("formatTargetDir", () => {
  it("trims leading and trailing whitespace", () => {
    expect(formatTargetDir("  my-app  ")).toBe("my-app");
  });

  it("removes trailing slashes", () => {
    expect(formatTargetDir("my-app/")).toBe("my-app");
    expect(formatTargetDir("my-app///")).toBe("my-app");
  });

  it("preserves paths without trailing slashes", () => {
    expect(formatTargetDir("my-app")).toBe("my-app");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(formatTargetDir("   ")).toBe("");
  });

  it("handles '.' (current directory)", () => {
    expect(formatTargetDir(".")).toBe(".");
  });
});

// ── toValidPackageName ────────────────────────────────────────────────────────

describe("toValidPackageName", () => {
  it("lowercases the name", () => {
    expect(toValidPackageName("MyApp")).toBe("myapp");
  });

  it("replaces spaces with hyphens", () => {
    expect(toValidPackageName("my app")).toBe("my-app");
    expect(toValidPackageName("my  app")).toBe("my-app");
  });

  it("removes leading dots", () => {
    expect(toValidPackageName(".hidden")).toBe("hidden");
  });

  it("removes leading underscores", () => {
    expect(toValidPackageName("_private")).toBe("private");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(toValidPackageName("my@app!")).toBe("my-app-");
  });

  it("trims whitespace before processing", () => {
    expect(toValidPackageName("  my-app  ")).toBe("my-app");
  });

  it("preserves hyphens and tildes", () => {
    expect(toValidPackageName("my-app~v2")).toBe("my-app~v2");
  });

  it("handles already-valid package names unchanged", () => {
    expect(toValidPackageName("my-awesome-lib")).toBe("my-awesome-lib");
  });
});

// ── isEmpty ───────────────────────────────────────────────────────────────────

describe("isEmpty", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxis-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns true for an empty directory", () => {
    expect(isEmpty(tmpDir)).toBe(true);
  });

  it("returns true when the only entry is .git", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    expect(isEmpty(tmpDir)).toBe(true);
  });

  it("returns false when directory has files", () => {
    fs.writeFileSync(path.join(tmpDir, "file.txt"), "");
    expect(isEmpty(tmpDir)).toBe(false);
  });

  it("returns false when directory has files alongside .git", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, "README.md"), "");
    expect(isEmpty(tmpDir)).toBe(false);
  });
});

// ── emptyDir ──────────────────────────────────────────────────────────────────

describe("emptyDir", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "praxis-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes all files from the directory", () => {
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "");
    fs.writeFileSync(path.join(tmpDir, "b.txt"), "");
    emptyDir(tmpDir);
    expect(fs.readdirSync(tmpDir)).toHaveLength(0);
  });

  it("preserves the .git directory", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, "file.txt"), "");
    emptyDir(tmpDir);
    const remaining = fs.readdirSync(tmpDir);
    expect(remaining).toEqual([".git"]);
  });

  it("removes nested directories recursively", () => {
    const nested = path.join(tmpDir, "nested");
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(nested, "deep.ts"), "");
    emptyDir(tmpDir);
    expect(fs.readdirSync(tmpDir)).toHaveLength(0);
  });

  it("does nothing if the directory does not exist", () => {
    expect(() => emptyDir(path.join(tmpDir, "nonexistent"))).not.toThrow();
  });
});

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

// ── pkgManagerFromAgent ───────────────────────────────────────────────────────

describe("pkgManagerFromAgent", () => {
  const originalEnv = process.env.npm_config_user_agent;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.npm_config_user_agent;
    } else {
      process.env.npm_config_user_agent = originalEnv;
    }
  });

  it("detects yarn", () => {
    process.env.npm_config_user_agent = "yarn/3.0.0 npm/? node/v18.0.0";
    expect(pkgManagerFromAgent()).toBe("yarn");
  });

  it("detects pnpm", () => {
    process.env.npm_config_user_agent = "pnpm/8.0.0 npm/? node/v18.0.0";
    expect(pkgManagerFromAgent()).toBe("pnpm");
  });

  it("detects bun", () => {
    process.env.npm_config_user_agent = "bun/1.0.0 node/v18.0.0";
    expect(pkgManagerFromAgent()).toBe("bun");
  });

  it("defaults to npm when agent is empty", () => {
    process.env.npm_config_user_agent = "";
    expect(pkgManagerFromAgent()).toBe("npm");
  });

  it("defaults to npm when env var is unset", () => {
    delete process.env.npm_config_user_agent;
    expect(pkgManagerFromAgent()).toBe("npm");
  });

  it("defaults to npm for unknown agents", () => {
    process.env.npm_config_user_agent = "npm/9.0.0 node/v18.0.0";
    expect(pkgManagerFromAgent()).toBe("npm");
  });
});
