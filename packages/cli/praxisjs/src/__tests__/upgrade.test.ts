import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIntro = vi.fn();
const mockOutro = vi.fn();
const mockNote = vi.fn();
const mockExit = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExecFileSync = vi.fn();
const mockFetch = vi.fn();
const mockSpinnerStop = vi.fn();
const mockRmSync = vi.fn();
const runtime = vi.hoisted(() => ({ platform: "darwin" }));

vi.mock("@clack/prompts", () => ({
  intro: mockIntro,
  outro: mockOutro,
  note: mockNote,
  spinner: vi.fn(() => ({ start: vi.fn(), stop: mockSpinnerStop })),
}));
vi.mock("picocolors", () => ({
  default: new Proxy({}, { get: () => (s: string) => s }),
}));
vi.mock("node:process", () => ({
  cwd: () => "/project",
  execPath: "/usr/bin/node",
  exit: mockExit,
  get platform() {
    return runtime.platform;
  },
}));
vi.mock("node:fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync,
  },
}));
vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));
const mockOfferAiSync = vi.hoisted(() => vi.fn());
vi.mock("../commands/ai/sync", () => ({ offerAiSync: mockOfferAiSync }));

vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("npm_config_registry", "https://registry.npmjs.org/");

const { upgrade } = await import("../commands/upgrade");

type Published = string | { version: string; peerDependencies?: Record<string, string> };

/** `latest` answers `<name>/latest`, `versions` answers `<name>/<version>` keyed as `name@version`. */
function mockRegistry(latest: Record<string, Published>, versions: Record<string, Published> = {}): void {
  mockFetch.mockImplementation((url: string) => {
    const rest = String(url).replace("https://registry.npmjs.org/", "");
    const slash = rest.lastIndexOf("/");
    const name = decodeURIComponent(rest.slice(0, slash));
    const tag = rest.slice(slash + 1);
    const entry = tag === "latest" ? latest[name] : versions[`${name}@${tag}`];
    const manifest = typeof entry === "string" ? { version: entry } : entry;
    return Promise.resolve({
      ok: manifest !== undefined,
      json: () => Promise.resolve(manifest ?? {}),
    });
  });
}

/** Serves exactly these files; every other path is missing. */
function mockFiles(files: Record<string, unknown>): void {
  const content = (p: unknown) => {
    const value = files[String(p)];
    return typeof value === "string" ? value : JSON.stringify(value);
  };
  mockExistsSync.mockImplementation((p: unknown) => Object.hasOwn(files, String(p)));
  mockReadFileSync.mockImplementation(content);
}

function writtenManifest(): Record<string, Record<string, string>> {
  return JSON.parse(mockWriteFileSync.mock.calls[0][1] as string) as Record<string, Record<string, string>>;
}

function noteBody(title: string): string | undefined {
  return (mockNote.mock.calls as Array<[string, string]>).find(([, t]) => t === title)?.[0];
}

beforeEach(() => {
  mockIntro.mockClear();
  mockOutro.mockClear();
  mockNote.mockClear();
  mockExit.mockClear();
  mockExistsSync.mockReset().mockReturnValue(false);
  mockReadFileSync.mockReset();
  mockWriteFileSync.mockReset();
  mockExecFileSync.mockReset();
  mockFetch.mockReset();
  mockSpinnerStop.mockClear();
  mockRmSync.mockReset();
  runtime.platform = "darwin";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("upgrade — no package.json", () => {
  it("reports the error and exits 1", async () => {
    mockExistsSync.mockReturnValue(false);

    await upgrade();

    expect(mockOutro).toHaveBeenCalledWith("No package.json found in the current directory.");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("upgrade — malformed package.json", () => {
  it("reports the error and exits 1 instead of throwing", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{ not json");

    await expect(upgrade()).resolves.toBeUndefined();

    expect(mockOutro).toHaveBeenCalledWith("package.json exists but could not be parsed as JSON.");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("upgrade — already up to date", () => {
  it("does nothing when no @praxisjs/* dependency has a newer version", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p) === "/project/package.json");
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^2.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it("skips a dependency when the registry lookup fails", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p) === "/project/package.json");
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockFetch.mockRejectedValue(new Error("network down"));

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it("ignores workspace:* dependencies", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "workspace:*" } }));
    mockRegistry({ "@praxisjs/core": "9.9.9" });

    await upgrade();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("upgrade — updates available", () => {
  it("rewrites package.json preserving the range prefix and runs install", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json") || String(p).endsWith("pnpm-lock.yaml"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string) as {
      dependencies: Record<string, string>;
    };
    expect(written.dependencies["@praxisjs/core"]).toBe("^2.0.0");

    const [noteBody] = mockNote.mock.calls[0] as [string];
    expect(noteBody).toContain("@praxisjs/core: ^1.0.0 → ^2.0.0");

    expect(mockExecFileSync).toHaveBeenCalledWith("pnpm", ["install"], expect.objectContaining({ cwd: "/project" }));
  });

  it("falls back to npm install when no lockfile is detected", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ devDependencies: { "@praxisjs/devtools": "~1.0.0" } }));
    mockRegistry({ "@praxisjs/devtools": "1.5.0" });

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({ cwd: "/project" }));
  });

  it("uses yarn when yarn.lock is detected", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json") || String(p).endsWith("yarn.lock"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith("yarn", [], expect.objectContaining({ cwd: "/project" }));
  });

  it("uses bun when the text bun.lock is detected", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json") || String(p).endsWith("bun.lock"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith("bun", ["install"], expect.objectContaining({ cwd: "/project" }));
  });

  it("uses bun when bun.lockb is detected", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json") || String(p).endsWith("bun.lockb"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith("bun", ["install"], expect.objectContaining({ cwd: "/project" }));
  });

  it("upgrades an exact (unprefixed) version without adding a range prefix", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string) as {
      dependencies: Record<string, string>;
    };
    expect(written.dependencies["@praxisjs/core"]).toBe("2.0.0");
  });

  it("skips a dependency whose range does not match semver (e.g. 'latest')", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "latest" } }));

    await upgrade();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("skips a dependency when the registry responds with a non-ok status", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("uses the plural form when more than one dependency is updated", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0", "@praxisjs/runtime": "^1.0.0" } }),
    );
    mockRegistry({ "@praxisjs/core": "2.0.0", "@praxisjs/runtime": "2.0.0" });

    await upgrade();

    expect(mockSpinnerStop).toHaveBeenCalledWith("Updated 2 packages.");
  });

  it("looks each package up once, in parallel, and updates it in every field", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { "@praxisjs/core": "^2.2.0", "@praxisjs/runtime": "^0.7.1" },
        peerDependencies: { "@praxisjs/core": ">=2.0.0" },
        devDependencies: { "@praxisjs/vite-plugin": "^4.0.6", vite: "^8.1.4" },
      }),
    );
    const pending: Array<() => void> = [];
    const versions: Record<string, string> = {
      "@praxisjs/core": "2.3.0",
      "@praxisjs/runtime": "0.8.0",
      "@praxisjs/vite-plugin": "4.1.0",
    };
    mockFetch.mockImplementation((url: string) => {
      const name = decodeURIComponent(url.replace("https://registry.npmjs.org/", "").replace("/latest", ""));
      return new Promise((resolve) => {
        pending.push(() => { resolve({ ok: true, json: () => Promise.resolve({ version: versions[name] }) }); });
      });
    });

    const done = upgrade();
    await vi.waitFor(() => { expect(pending).toHaveLength(3); });
    for (const release of pending) release();
    await done;

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string) as Record<string, Record<string, string>>;
    expect(written.dependencies).toEqual({ "@praxisjs/core": "^2.3.0", "@praxisjs/runtime": "^0.8.0" });
    expect(written.devDependencies).toEqual({ "@praxisjs/vite-plugin": "^4.1.0", vite: "^8.1.4" });
    expect(written.peerDependencies).toEqual({ "@praxisjs/core": ">=2.0.0" });
  });

  it("never moves a dependency below its current version", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { "@praxisjs/core": "^3.0.0-beta.1", "@praxisjs/runtime": "^0.9.0" } }),
    );
    mockRegistry({ "@praxisjs/core": "2.3.0", "@praxisjs/runtime": "0.8.0" });

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it("moves a prerelease to the matching release", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^2.3.0-beta.0" } }));
    mockRegistry({ "@praxisjs/core": "2.3.0" });

    await upgrade();

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string) as Record<string, Record<string, string>>;
    expect(written.dependencies["@praxisjs/core"]).toBe("^2.3.0");
  });

  it("reports install failure without crashing", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });
    mockExecFileSync.mockImplementation(() => {
      throw new Error("install failed");
    });

    await expect(upgrade()).resolves.toBeUndefined();
    expect(mockSpinnerStop).toHaveBeenCalledWith("Install failed — run `npm install` manually.");
  });
});

describe("upgrade — ecosystem packages", () => {
  it("upgrades @morphos/* and kosmesis next to @praxisjs/* and groups the output by ecosystem", async () => {
    mockFiles({
      "/project/package.json": {
        dependencies: { "@praxisjs/core": "^2.2.0", "@morphos/inputs": "^1.0.3", "@morphos/core": "^0.1.3", lucide: "^1.0.0" },
        devDependencies: { kosmesis: "^0.4.0" },
      },
    });
    mockRegistry({
      "@praxisjs/core": "2.3.0",
      "@morphos/core": "0.1.4",
      "@morphos/inputs": {
        version: "1.0.4",
        peerDependencies: { "@morphos/core": "0.1.4", "@praxisjs/core": ">=1.0.0", vite: ">=8.0.0", other: "workspace:*" },
      },
      kosmesis: "0.5.0",
      lucide: "9.0.0",
    });

    await upgrade();

    expect(writtenManifest()).toEqual({
      dependencies: { "@praxisjs/core": "^2.3.0", "@morphos/inputs": "^1.0.4", "@morphos/core": "^0.1.4", lucide: "^1.0.0" },
      devDependencies: { kosmesis: "^0.5.0" },
    });
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("lucide"));
    expect(mockNote.mock.calls.map(([, title]) => title as string)).toEqual([
      "PraxisJS",
      "Morphos",
      "Kosmesis",
      "Kosmesis components",
    ]);
    expect(noteBody("PraxisJS")).toBe("@praxisjs/core: ^2.2.0 → ^2.3.0");
    expect(noteBody("Morphos")).toBe("@morphos/inputs: ^1.0.3 → ^1.0.4\n@morphos/core: ^0.1.3 → ^0.1.4");
    expect(noteBody("Kosmesis")).toBe("kosmesis: ^0.4.0 → ^0.5.0");
    expect(mockSpinnerStop).toHaveBeenCalledWith("Updated 4 packages.");
    expect(mockOutro).toHaveBeenCalledWith("Upgrade complete!");
  });

  it("holds back a package whose latest release needs a newer peer than the project gets", async () => {
    mockFiles({
      "/project/package.json": { dependencies: { "@praxisjs/core": "^2.2.0", "@morphos/inputs": "^1.0.3" } },
    });
    mockRegistry(
      {
        "@praxisjs/core": "2.3.0",
        "@morphos/inputs": { version: "1.1.0", peerDependencies: { "@praxisjs/core": ">=3.0.0" } },
      },
      { "@morphos/inputs@1.0.3": { version: "1.0.3", peerDependencies: { "@praxisjs/core": ">=1.0.0" } } },
    );

    await upgrade();

    expect(writtenManifest().dependencies).toEqual({ "@praxisjs/core": "^2.3.0", "@morphos/inputs": "^1.0.3" });
    expect(noteBody("Morphos")).toBe(
      "@morphos/inputs: held back at ^1.0.3 (@morphos/inputs@1.1.0 needs @praxisjs/core >=3.0.0, the project would have 2.3.0)",
    );
    expect(mockSpinnerStop).toHaveBeenCalledWith("Updated 1 package.");
  });

  it("holds every @praxisjs/* package back when an installed package does not accept the new release", async () => {
    mockFiles({
      "/project/package.json": {
        dependencies: { "@praxisjs/core": "^2.3.0", "@praxisjs/runtime": "^0.8.0", "@praxisjs/jsx": "^0.8.0", "@morphos/inputs": "^1.0.3" },
      },
    });
    mockRegistry(
      {
        "@praxisjs/core": "3.0.0",
        "@praxisjs/runtime": "1.0.0",
        "@praxisjs/jsx": "0.8.0",
        "@morphos/inputs": { version: "1.1.0", peerDependencies: { "@praxisjs/core": ">=2.0.0 <3.0.0" } },
      },
      { "@morphos/inputs@1.0.3": { version: "1.0.3", peerDependencies: { "@praxisjs/core": ">=2.0.0 <3.0.0" } } },
    );

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(7);
    expect(noteBody("PraxisJS")).toBe(
      "@praxisjs/core: held back at ^2.3.0 (@morphos/inputs@1.0.3 needs @praxisjs/core >=2.0.0 <3.0.0)\n" +
        "@praxisjs/runtime: held back at ^0.8.0 (moves together with @praxisjs/core)",
    );
    expect(noteBody("Morphos")).toContain("@morphos/inputs: held back at ^1.0.3");
    expect(mockSpinnerStop).toHaveBeenCalledWith("No upgrade is compatible with the rest of the project.");
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it("reports a conflict the project already has instead of holding anything back", async () => {
    mockFiles({
      "/project/package.json": {
        dependencies: { "@morphos/core": "^0.1.0", "@morphos/inputs": "^1.0.3", "@morphos/layout": "^1.1.3" },
      },
    });
    mockRegistry({
      "@morphos/core": "0.1.2",
      "@morphos/inputs": { version: "1.0.3", peerDependencies: { "@morphos/core": "0.1.3" } },
      "@morphos/layout": { version: "1.1.3", peerDependencies: { "@morphos/inputs": "^2.0.0" } },
    });

    await upgrade();

    expect(writtenManifest().dependencies["@morphos/core"]).toBe("^0.1.2");
    expect(noteBody("Already incompatible")).toBe(
      "@morphos/inputs@1.0.3 needs @morphos/core 0.1.3, found 0.1.2\n" +
        "@morphos/layout@1.1.3 needs @morphos/inputs ^2.0.0, found 1.0.3",
    );
  });

  it("checks peers against the installed version and skips packages whose manifest is unavailable", async () => {
    mockFiles({
      "/project/package.json": { dependencies: { "@morphos/core": "^0.1.0", "@morphos/inputs": "^1.0.3", "@morphos/icons": "^1.0.0" } },
      "/project/node_modules/@morphos/core/package.json": { version: "0.1.3" },
      "/project/node_modules/@morphos/inputs/package.json": "{ broken",
      "/project/node_modules/@morphos/icons/package.json": { version: "next" },
    });
    mockRegistry({ "@morphos/inputs": { version: "1.0.3", peerDependencies: { "@morphos/core": "0.1.3" } } });

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(noteBody("Already incompatible")).toBeUndefined();
    expect(mockSpinnerStop).toHaveBeenCalledWith("Already up to date.");
  });
  it("ignores an installed copy outside its declared range, left over from an install that failed", async () => {
    mockFiles({
      "/project/package.json": {
        dependencies: { "@morphos/core": "^0.1.6", "@morphos/inputs": "^1.1.1", "@morphos/layout": "^1.2.1" },
      },
      "/project/node_modules/@morphos/core/package.json": { version: "0.1.3" },
      "/project/node_modules/@morphos/inputs/package.json": { version: "1.0.3" },
    });
    mockRegistry(
      {
        "@morphos/core": "0.1.6",
        "@morphos/inputs": { version: "1.1.2", peerDependencies: { "@morphos/core": "^0.1.6" } },
        "@morphos/layout": { version: "1.2.2", peerDependencies: { "@morphos/core": "^0.1.6" } },
      },
      { "@morphos/layout@1.2.1": { version: "1.2.1", peerDependencies: { "@morphos/core": "0.1.6" } } },
    );

    await upgrade();

    expect(writtenManifest().dependencies).toEqual({
      "@morphos/core": "^0.1.6",
      "@morphos/inputs": "^1.1.2",
      "@morphos/layout": "^1.2.2",
    });
    expect(noteBody("Morphos")).toBe("@morphos/inputs: ^1.1.1 → ^1.1.2\n@morphos/layout: ^1.2.1 → ^1.2.2");
    expect(noteBody("Already incompatible")).toBeUndefined();
  });

  it("checks peers against the highest version a package is declared at", async () => {
    mockFiles({
      "/project/package.json": {
        dependencies: { "@morphos/core": "^0.1.0", "@morphos/inputs": "^1.0.3" },
        peerDependencies: { "@morphos/core": "^0.1.3" },
      },
    });
    mockRegistry({ "@morphos/inputs": { version: "1.0.3", peerDependencies: { "@morphos/core": "0.1.3" } } });

    await upgrade();

    expect(noteBody("Already incompatible")).toBeUndefined();
  });
});

describe("upgrade — Kosmesis components", () => {
  const kosmesisProject = (extra: Record<string, unknown> = {}) => {
    mockFiles({
      "/project/package.json": { dependencies: { "@praxisjs/core": "^2.3.0" }, devDependencies: { kosmesis: "^0.5.0" } },
      ...extra,
    });
    mockRegistry({ "@praxisjs/core": "2.3.0", kosmesis: "0.5.0" });
  };

  it("prints a hint with the package manager's runner when components.json is a Kosmesis config", async () => {
    mockFiles({
      "/project/package.json": { dependencies: { "@praxisjs/core": "^2.3.0" } },
      "/project/components.json": { styleSystem: "tailwind" },
      "/project/pnpm-lock.yaml": "",
    });
    mockRegistry({ "@praxisjs/core": "2.3.0" });

    await upgrade();

    expect(noteBody("Kosmesis components")).toContain("Run `pnpm dlx kosmesis outdated`");
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it.each([
    ["a shadcn/ui components.json", { style: "new-york" }],
    ["a malformed components.json", "{ nope"],
  ])("ignores %s", async (_label, config) => {
    mockFiles({
      "/project/package.json": { dependencies: { "@praxisjs/core": "^2.3.0" } },
      "/project/components.json": config,
    });
    mockRegistry({ "@praxisjs/core": "2.3.0" });

    await upgrade();

    expect(noteBody("Kosmesis components")).toBeUndefined();
  });

  it("runs the installed kosmesis outdated and shows its report", async () => {
    kosmesisProject({
      "/project/node_modules/kosmesis/package.json": { version: "0.5.0", bin: { kosmesis: "./dist/index.mjs" } },
    });
    mockExecFileSync.mockReturnValue("button  1.0.0 → 1.1.0\n");

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "/usr/bin/node",
      ["/project/node_modules/kosmesis/dist/index.mjs", "outdated"],
      expect.objectContaining({ cwd: "/project", stdio: ["ignore", "pipe", "pipe"] }),
    );
    expect(noteBody("Kosmesis components")).toBe("button  1.0.0 → 1.1.0");
  });

  it("says so when the report is empty", async () => {
    kosmesisProject({ "/project/node_modules/kosmesis/package.json": { version: "0.6.0", bin: "dist/index.mjs" } });
    mockExecFileSync.mockReturnValue("  ");

    await upgrade();

    expect(noteBody("Kosmesis components")).toBe("Every Kosmesis component is up to date.");
  });

  it("shows the report of a non-zero exit", async () => {
    kosmesisProject({ "/project/node_modules/kosmesis/package.json": { version: "0.5.0", bin: "dist/index.mjs" } });
    mockExecFileSync.mockImplementation(() => {
      throw Object.assign(new Error("exit 1"), { stdout: "card  1.0.0 → 2.0.0" });
    });

    await upgrade();

    expect(noteBody("Kosmesis components")).toBe("card  1.0.0 → 2.0.0");
  });

  it.each([
    ["the command fails without a report", { version: "0.5.0", bin: "dist/index.mjs" }, true],
    ["kosmesis predates outdated", { version: "0.4.0", bin: "dist/index.mjs" }, false],
    ["kosmesis declares no bin", { version: "0.5.0", bin: 1 }, false],
    ["kosmesis has no bin entry for itself", { version: "0.5.0", bin: { other: "x.mjs" } }, false],
  ])("falls back to the hint when %s", async (_label, installed, runs) => {
    kosmesisProject({ "/project/node_modules/kosmesis/package.json": installed });
    mockExecFileSync.mockImplementation(() => {
      throw new Error("boom");
    });

    await upgrade();

    expect(noteBody("Kosmesis components")).toContain("Run `npx kosmesis outdated`");
    expect(mockExecFileSync).toHaveBeenCalledTimes(runs ? 1 : 0);
  });
});

describe("upgrade — AI setup", () => {
  it("offers to sync an outdated AI setup after upgrading", async () => {
    mockExistsSync.mockReturnValue(false);

    await upgrade();

    expect(mockOfferAiSync).toHaveBeenCalledWith("/project");
  });
});

describe("upgrade — installing over an existing lockfile", () => {
  const manifest = { dependencies: { "@praxisjs/core": "^1.0.0", "left-pad": "^1.3.0" } };

  function npmProject(lock: unknown): void {
    mockFiles({ "/project/package.json": manifest, "/project/package-lock.json": lock });
    mockRegistry({ "@praxisjs/core": "2.0.0" });
  }

  it("drops the ecosystem's package-lock entries and folders before npm install, keeping the rest", async () => {
    npmProject({
      lockfileVersion: 3,
      packages: {
        "": { name: "app" },
        "node_modules/@praxisjs/core": { version: "1.0.0" },
        "node_modules/@morphos/inputs": { version: "1.0.3" },
        "node_modules/@morphos/inputs/node_modules/@praxisjs/jsx": { version: "0.7.7" },
        "node_modules/kosmesis": { version: "0.4.0" },
        "node_modules/left-pad": { version: "1.3.0" },
        "node_modules/@praxisjs-like/other": { version: "1.0.0" },
      },
    });

    await upgrade();

    const lockWrite = mockWriteFileSync.mock.calls.find(([file]) => file === "/project/package-lock.json");
    const lock = JSON.parse(lockWrite?.[1] as string) as { packages: Record<string, unknown> };
    expect(Object.keys(lock.packages)).toEqual(["", "node_modules/left-pad", "node_modules/@praxisjs-like/other"]);
    expect(mockRmSync.mock.calls.map(([dir]) => String(dir))).toEqual([
      "/project/node_modules/@praxisjs/core",
      "/project/node_modules/@morphos/inputs",
      "/project/node_modules/@morphos/inputs/node_modules/@praxisjs/jsx",
      "/project/node_modules/kosmesis",
      "/project/node_modules/.package-lock.json",
    ]);
    expect(mockWriteFileSync.mock.calls[0][0]).toBe("/project/package.json");
    expect(mockExecFileSync).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({ cwd: "/project" }));
  });

  it.each([
    ["has no ecosystem entries", { lockfileVersion: 3, packages: { "": {}, "node_modules/left-pad": {} } }],
    ["is a v1 lockfile without packages", { lockfileVersion: 1, dependencies: {} }],
    ["is not valid JSON", "{ not json"],
  ])("leaves package-lock.json alone when it %s", async (_label, lock) => {
    npmProject(lock);

    await upgrade();

    expect(mockWriteFileSync.mock.calls.map(([file]) => file)).toEqual(["/project/package.json"]);
    expect(mockRmSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).toHaveBeenCalled();
  });

  it("does not touch package-lock.json for other package managers", async () => {
    mockFiles({
      "/project/package.json": manifest,
      "/project/pnpm-lock.yaml": "",
      "/project/package-lock.json": { packages: { "node_modules/@praxisjs/core": {} } },
    });
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockRmSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).toHaveBeenCalledWith("pnpm", ["install"], expect.anything());
  });

  it("runs the package manager through a shell on Windows, where it is a .cmd script", async () => {
    runtime.platform = "win32";
    mockFiles({ "/project/package.json": manifest });
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockExecFileSync).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({ shell: true }));
  });

  it("shows the end of the package manager's output when the install fails", async () => {
    mockFiles({ "/project/package.json": manifest });
    mockRegistry({ "@praxisjs/core": "2.0.0" });
    const lines = Array.from({ length: 15 }, (_, i) => `line ${String(i + 1)}`);
    mockExecFileSync.mockImplementation(() => {
      throw Object.assign(new Error("failed"), { stdout: Buffer.from("added 0\n"), stderr: lines.join("\n") });
    });

    await upgrade();

    expect(mockNote).toHaveBeenCalledWith(lines.slice(-12).join("\n"), "npm output");
  });

  it("shows no output note when the failed install printed nothing", async () => {
    mockFiles({ "/project/package.json": manifest });
    mockRegistry({ "@praxisjs/core": "2.0.0" });
    mockExecFileSync.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw undefined;
    });

    await upgrade();

    expect(mockSpinnerStop).toHaveBeenCalledWith("Install failed — run `npm install` manually.");
    expect(mockNote.mock.calls.some(([, title]) => title === "npm output")).toBe(false);
  });
});

describe("upgrade — repairing an upgrade whose install did not finish", () => {
  const manifest = { dependencies: { "@praxisjs/core": "^2.3.0", "@morphos/inputs": "^1.1.1" } };

  it("reinstalls when installed versions are outside the ranges package.json declares", async () => {
    mockFiles({
      "/project/package.json": manifest,
      "/project/node_modules": "",
      "/project/node_modules/@praxisjs/core/package.json": { version: "2.2.0" },
      "/project/package-lock.json": { packages: { "node_modules/@praxisjs/core": { version: "2.2.0" } } },
    });
    mockRegistry({ "@praxisjs/core": "2.3.0", "@morphos/inputs": "1.1.1" });

    await upgrade();

    expect(mockWriteFileSync.mock.calls.map(([file]) => file)).toEqual(["/project/package-lock.json"]);
    expect(noteBody("Installed versions out of date")).toContain("@praxisjs/core\n@morphos/inputs");
    expect(mockExecFileSync).toHaveBeenCalledWith("npm", ["install"], expect.anything());
    expect(mockOutro).toHaveBeenCalledWith("Dependencies repaired.");
  });

  it("says the install is still needed when the repair install fails", async () => {
    mockFiles({ "/project/package.json": manifest, "/project/node_modules": "" });
    mockRegistry({ "@praxisjs/core": "2.3.0", "@morphos/inputs": "1.1.1" });
    mockExecFileSync.mockImplementation(() => {
      throw new Error("failed");
    });

    await upgrade();

    expect(mockOutro).toHaveBeenCalledWith("Dependencies still need an install.");
  });

  it("leaves a project alone when what is installed matches, or when it was never installed", async () => {
    mockFiles({
      "/project/package.json": manifest,
      "/project/node_modules": "",
      "/project/node_modules/@praxisjs/core/package.json": { version: "2.3.0" },
      "/project/node_modules/@morphos/inputs/package.json": { version: "1.1.1" },
    });
    mockRegistry({ "@praxisjs/core": "2.3.0", "@morphos/inputs": "1.1.1" });
    await upgrade();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");

    mockFiles({ "/project/package.json": manifest });
    await upgrade();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
