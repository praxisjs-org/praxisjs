/**
 * Tests for create-praxisjs/src/index.ts
 *
 * Strategy: index.ts auto-executes main() at module load time.
 * Each test uses vi.doMock() to configure mocks BEFORE the dynamic import
 * triggers that execution.  vi.resetModules() in beforeEach ensures a fresh
 * module registry for every scenario.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const identity = (s: string) => s;

/** Build a picocolors mock where every colour function is the identity. */
function makePc() {
  return {
    default: new Proxy(
      {},
      { get: () => identity },
    ),
  };
}

/** Build a @clack/prompts mock with sensible defaults. */
function makeClack(overrides: Record<string, unknown> = {}) {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    note: vi.fn(),
    text: vi.fn().mockResolvedValue("my-app"),
    select: vi.fn().mockResolvedValueOnce("minimal").mockResolvedValueOnce("none"),
    confirm: vi.fn().mockResolvedValue(true),
    isCancel: vi.fn().mockReturnValue(false),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    ...overrides,
  };
}

/** Build a node:fs mock.
 *  - templateFiles: what readdirSync returns for a templates/* path
 *  - rootExists: first existsSync call (target dir pre-existing)
 *  - targetEmpty: controls isEmpty() helper (readdirSync on target)
 */
function makeFs({
  rootExists = false,
  targetEmpty = true,
  templateFiles = ["_package.json"],
}: {
  rootExists?: boolean;
  targetEmpty?: boolean;
  templateFiles?: string[];
} = {}) {
  const mock = {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockImplementation((p: string) => {
      if (String(p).includes("templates")) return templateFiles;
      // isEmpty() call on the target dir
      return targetEmpty ? [] : ["existing-file.txt"];
    }),
    readFileSync: vi
      .fn()
      .mockReturnValue('{"name":"placeholder","version":"0.0.0"}'),
    writeFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
    copyFileSync: vi.fn(),
    rmSync: vi.fn(),
  };

  // existsSync call order when target dir pre-exists:
  //  1st call (index:80)   – targetDir exists check → true
  //  2nd call (emptyDir)   – existsSync inside emptyDir → true
  //  3rd call (index:114)  – root creation check → false (trigger mkdirSync)
  if (rootExists) {
    mock.existsSync = vi
      .fn()
      .mockReturnValueOnce(true)  // targetDir exists
      .mockReturnValueOnce(true)  // emptyDir internal check
      .mockReturnValue(false);    // root creation check
  }

  return { default: mock };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.npm_config_user_agent;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
// The module auto-executes main() on import.
// Mock node:process with the right argv before importing.

async function runMain() {
  return import("../index").catch(() => undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("create-praxisjs index – happy path (argv target dir)", () => {
  it("scaffolds minimal template when argv[2] is provided", async () => {
    const mockExit = vi.fn();
    const clack = makeClack();
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    // intro must always be called
    expect(clack.intro).toHaveBeenCalledOnce();
    // select called twice: template + plugin
    expect(clack.select).toHaveBeenCalledTimes(2);
    // outro at the end
    expect(clack.outro).toHaveBeenCalledOnce();
    // process.exit was NOT called (no cancel)
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("scaffolds router template", async () => {
    const clack = makeClack({ select: vi.fn().mockResolvedValueOnce("router").mockResolvedValueOnce("none") });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "router-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("scaffolds full template", async () => {
    const clack = makeClack({ select: vi.fn().mockResolvedValueOnce("full").mockResolvedValueOnce("none") });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "full-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("creates the root directory when it does not exist", async () => {
    const clack = makeClack();
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "new-dir"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(fsMock.default.mkdirSync).toHaveBeenCalled();
  });

  it("writes package.json with the project name", async () => {
    const clack = makeClack();
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-project"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const writeCalls = fsMock.default.writeFileSync.mock.calls;
    const pkgCall = writeCalls.find((c) =>
      String(c[0]).endsWith("package.json"),
    );
    expect(pkgCall).toBeDefined();
    const content = JSON.parse(pkgCall![1] as string) as { name: string };
    expect(content.name).toBe("my-project");
  });

  it("copies template files (non-package.json) to root", async () => {
    const clack = makeClack();
    const fsMock = makeFs({
      templateFiles: ["index.html", "_gitignore", "_package.json"],
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "tmpl-test"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    // statSync called for each non-package.json file (copy uses statSync)
    expect(fsMock.default.statSync).toHaveBeenCalled();
  });

  it("renames _gitignore to .gitignore", async () => {
    const clack = makeClack();
    const fsMock = makeFs({
      templateFiles: ["_gitignore", "_package.json"],
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "rename-test"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    // copyFileSync destination should use .gitignore (not _gitignore)
    const calls = fsMock.default.copyFileSync.mock.calls;
    const destPaths = calls.map((c) => String(c[1]));
    expect(destPaths.some((p) => p.endsWith(".gitignore"))).toBe(true);
    expect(destPaths.some((p) => p.endsWith("_gitignore"))).toBe(false);
  });
});

describe("create-praxisjs index – no argv target (prompts for name)", () => {
  it("prompts for project name when argv[2] is absent", async () => {
    const clack = makeClack({ text: vi.fn().mockResolvedValue("prompted-app") });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.text).toHaveBeenCalledOnce();
    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("uses 'praxisjs-app' as fallback when empty name returned", async () => {
    const clack = makeClack({ text: vi.fn().mockResolvedValue("") });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.outro).toHaveBeenCalledOnce();
  });
});

describe("create-praxisjs index – existing non-empty directory", () => {
  it("prompts for overwrite confirmation when target dir is non-empty", async () => {
    const clack = makeClack({ confirm: vi.fn().mockResolvedValue(true) });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "existing-dir"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.confirm).toHaveBeenCalledOnce();
    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("uses 'Current directory' label when targetDir is '.'", async () => {
    const clack = makeClack({ confirm: vi.fn().mockResolvedValue(true) });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "."],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const confirmArg = (
      clack.confirm.mock.calls[0]?.[0] as { message: string }
    )?.message;
    expect(confirmArg).toContain("Current directory");
  });

  it("empties the directory when overwrite is confirmed", async () => {
    const clack = makeClack({ confirm: vi.fn().mockResolvedValue(true) });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "dirty-dir"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    // emptyDir calls rmSync for each non-.git entry
    expect(fsMock.default.rmSync).toHaveBeenCalled();
  });
});

describe("create-praxisjs index – cancellations", () => {
  it("exits when project name prompt is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      text: vi.fn().mockResolvedValue(CANCEL),
      isCancel: vi.fn().mockReturnValue(true),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("exits when overwrite confirmation is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      confirm: vi.fn().mockResolvedValue(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "existing"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("exits when overwrite is denied (user answers false)", async () => {
    const mockExit = vi.fn();
    const clack = makeClack({
      confirm: vi.fn().mockResolvedValue(false),
      isCancel: vi.fn().mockReturnValue(false),
    });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "existing"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("exits when template select is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      select: vi.fn().mockResolvedValue(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});

describe("create-praxisjs index – root dir already exists", () => {
  it("skips mkdirSync when root directory already exists", async () => {
    const clack = makeClack();
    const fsMock = makeFs();
    // existsSync returns false for target (no overwrite prompt),
    // then true for root (already exists → skip mkdirSync)
    fsMock.default.existsSync = vi.fn()
      .mockReturnValueOnce(false)  // targetDir check (no overwrite)
      .mockReturnValueOnce(true);  // root creation check → already exists

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "existing-root"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(fsMock.default.mkdirSync).not.toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalledOnce();
  });
});

describe("create-praxisjs index – next steps display", () => {
  it("shows 'cd <dir>' step when target is not cwd", async () => {
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[0]).toContain("my-app");
  });

  it("omits 'cd' step when target is current directory", async () => {
    const clack = makeClack({ confirm: vi.fn().mockResolvedValue(true) });
    const fsMock = makeFs({ rootExists: true, targetEmpty: false });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    // cwd() returns the same path as root when targetDir = "."
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "."],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[0]).not.toMatch(/^cd /m);
  });

  it("uses pnpm install command when pnpm is the agent", async () => {
    process.env.npm_config_user_agent = "pnpm/8.0.0 node/v18";
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "pnpm-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[0]).toContain("pnpm install");
    expect(noteArgs[0]).toContain("pnpm run dev");
  });

  it("uses yarn command when yarn is the agent", async () => {
    process.env.npm_config_user_agent = "yarn/3.0.0 node/v18";
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "yarn-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[0]).toContain("yarn");
    expect(noteArgs[0]).not.toContain("yarn install");
  });

  it("uses npm install command when npm is the agent", async () => {
    process.env.npm_config_user_agent = "npm/9.0.0 node/v18";
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "npm-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[0]).toContain("npm install");
    expect(noteArgs[0]).toContain("npm run dev");
  });
});

describe("create-praxisjs index – template directory missing", () => {
  it("fails with a clear error message when the template directory does not exist", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const clack = makeClack();
    const fsMock = makeFs();

    // Make readdirSync throw for any templates path, simulating a missing template dir
    fsMock.default.readdirSync = vi.fn().mockImplementation((p: string) => {
      if (String(p).includes("templates")) {
        throw Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" });
      }
      return [];
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(consoleSpy).toHaveBeenCalled();
    const errorArg = consoleSpy.mock.calls[0]?.[0];
    expect(String(errorArg)).toContain("Template directory not found");
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});

describe("create-praxisjs index – malformed _package.json", () => {
  it("fails with a clear error message when _package.json contains invalid JSON", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const clack = makeClack();
    // templateFiles includes _package.json so the readdirSync succeeds,
    // but readFileSync returns invalid JSON for it
    const fsMock = makeFs({ templateFiles: ["_package.json"] });
    fsMock.default.readFileSync = vi.fn().mockReturnValue("{ not valid json !!!");

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(consoleSpy).toHaveBeenCalled();
    const errorArg = consoleSpy.mock.calls[0]?.[0];
    expect(String(errorArg)).toContain("_package.json");
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});

describe("create-praxisjs index – plugin select", () => {
  it("shows the plugin select after template select", async () => {
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    expect(clack.select).toHaveBeenCalledTimes(2);
    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("copies skill files when claude-skill is selected", async () => {
    const clack = makeClack({
      select: vi.fn().mockResolvedValueOnce("minimal").mockResolvedValueOnce("claude-skill"),
    });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    // copyFileSync is called for template files and for the claude skill files
    expect(fsMock.default.copyFileSync).toHaveBeenCalled();
    expect(clack.note).toHaveBeenCalledTimes(2);
    // Second note call is the Claude Code integration note
    const secondNote = clack.note.mock.calls[1] as [string, string];
    expect(secondNote[1]).toBe("Claude Code");
  });

  it("does not copy skill files when none is selected", async () => {
    const clack = makeClack();
    const fsMock = makeFs({ templateFiles: ["index.html"] });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runMain();

    // Only one note call (next steps), no Claude Code note
    expect(clack.note).toHaveBeenCalledTimes(1);
  });

  it("exits when plugin select is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      select: vi.fn()
        .mockResolvedValueOnce("minimal")
        .mockResolvedValueOnce(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "my-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});

describe("create-praxisjs index – error handling", () => {
  it("logs and exits with code 1 on unexpected error", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Force an error by making select throw
    const clack = makeClack({
      select: vi.fn().mockRejectedValue(new Error("unexpected")),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "create-praxisjs", "err-app"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runMain();

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});
