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
  resolveLatestVersion,
  resolveWorkspaceVersions,
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

  it("preserves a valid scoped package name as-is", () => {
    expect(toValidPackageName("@org/pkg")).toBe("@org/pkg");
  });

  it("sanitizes parts of a scoped package name but keeps @ and /", () => {
    expect(toValidPackageName("@My Org/My Pkg")).toBe("@my-org/my-pkg");
  });

  it("sanitizes an invalid scope but keeps the structure", () => {
    expect(toValidPackageName("@My.Org/My_Pkg")).toBe("@my-org/my-pkg");
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

  it("returns true for a path that does not exist (does not throw)", () => {
    const nonExistent = path.join(tmpDir, "does-not-exist");
    expect(() => isEmpty(nonExistent)).not.toThrow();
    expect(isEmpty(nonExistent)).toBe(true);
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

  it("emptyDir on a directory containing a read-only file — documents behavior (rmSync with force:true succeeds)", () => {
    // emptyDir uses { force: true } so it succeeds even for read-only files on most systems.
    // On systems where force still fails (e.g. root-owned files), the error surfaces from rmSync.
    const readonlyFile = path.join(tmpDir, "readonly.txt");
    fs.writeFileSync(readonlyFile, "content");
    fs.chmodSync(readonlyFile, 0o444); // read-only

    // With { force: true, recursive: true }, rmSync removes read-only files on macOS/Linux
    expect(() => emptyDir(tmpDir)).not.toThrow();
    expect(fs.readdirSync(tmpDir)).toHaveLength(0);
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

// ── resolveLatestVersion ──────────────────────────────────────────────────────

describe("resolveLatestVersion", () => {
  const originalRegistry = process.env.npm_config_registry;

  afterEach(() => {
    if (originalRegistry === undefined) {
      delete process.env.npm_config_registry;
    } else {
      process.env.npm_config_registry = originalRegistry;
    }
    vi.unstubAllGlobals();
  });

  it("fetches the latest version from the default registry", async () => {
    delete process.env.npm_config_registry;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "2.3.4" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const version = await resolveLatestVersion("@praxisjs/core");

    expect(version).toBe("2.3.4");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.npmjs.org/%40praxisjs%2Fcore/latest",
    );
  });

  it("URL-encodes scoped package names", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.0.0" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await resolveLatestVersion("@praxisjs/vite-plugin");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.npmjs.org/%40praxisjs%2Fvite-plugin/latest",
    );
  });

  it("respects npm_config_registry when set", async () => {
    process.env.npm_config_registry = "https://registry.example.com/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.2.3" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await resolveLatestVersion("eslint");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.example.com/eslint/latest",
    );
  });

  it("throws a clear error when the registry responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(resolveLatestVersion("@praxisjs/does-not-exist")).rejects.toThrow(
      /Failed to resolve latest version.*HTTP 404/,
    );
  });

  it("throws a clear error when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));

    await expect(resolveLatestVersion("@praxisjs/core")).rejects.toThrow(
      /Failed to reach registry/,
    );
  });

  it("throws a clear error when the response has no version field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );

    await expect(resolveLatestVersion("@praxisjs/core")).rejects.toThrow(
      /did not include a version/,
    );
  });
});

// ── resolveWorkspaceVersions ──────────────────────────────────────────────────

describe("resolveWorkspaceVersions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves every workspace:* dependency across all dependency fields", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const version = url.includes("core") ? "2.0.1" : "3.0.5";
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ version }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pkg: Record<string, unknown> = {
      name: "my-app",
      dependencies: { "@praxisjs/core": "workspace:*" },
      devDependencies: { "@praxisjs/vite-plugin": "workspace:*", typescript: "^5.9.3" },
    };

    await resolveWorkspaceVersions(pkg);

    expect(pkg.dependencies).toEqual({ "@praxisjs/core": "^2.0.1" });
    expect(pkg.devDependencies).toEqual({
      "@praxisjs/vite-plugin": "^3.0.5",
      typescript: "^5.9.3",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves already-pinned dependencies untouched", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const pkg: Record<string, unknown> = {
      dependencies: { eslint: "^10.1.0" },
    };

    await resolveWorkspaceVersions(pkg);

    expect(pkg.dependencies).toEqual({ eslint: "^10.1.0" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the package has no dependency fields", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveWorkspaceVersions({ name: "my-app" })).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates the resolution error for an unresolvable dependency", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const pkg: Record<string, unknown> = {
      dependencies: { "@praxisjs/core": "workspace:*" },
    };

    await expect(resolveWorkspaceVersions(pkg)).rejects.toThrow(/HTTP 500/);
  });
});
