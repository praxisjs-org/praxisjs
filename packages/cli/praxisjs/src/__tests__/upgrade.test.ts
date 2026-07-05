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
  exit: mockExit,
}));
vi.mock("node:fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
}));
vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

vi.stubGlobal("fetch", mockFetch);

const { upgrade } = await import("../commands/upgrade");

function mockRegistry(versions: Record<string, string>): void {
  mockFetch.mockImplementation((url: string) => {
    const name = decodeURIComponent(String(url).replace("https://registry.npmjs.org/", "").replace("/latest", ""));
    const version = versions[name];
    return Promise.resolve({
      ok: version !== undefined,
      json: () => Promise.resolve({ version }),
    });
  });
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

describe("upgrade — already up to date", () => {
  it("does nothing when no @praxisjs/* dependency has a newer version", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^2.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });

    await upgrade();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Nothing to upgrade.");
  });

  it("skips a dependency when the registry lookup fails", async () => {
    mockExistsSync.mockReturnValue(true);
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

  it("reports install failure without crashing", async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "@praxisjs/core": "^1.0.0" } }));
    mockRegistry({ "@praxisjs/core": "2.0.0" });
    mockExecFileSync.mockImplementation(() => {
      throw new Error("install failed");
    });

    await expect(upgrade()).resolves.toBeUndefined();
  });
});
