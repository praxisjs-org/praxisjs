/**
 * Tests for praxisjs/src/index.ts
 *
 * Strategy: index.ts auto-executes the command handler at module load time.
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
    select: vi.fn().mockResolvedValueOnce("claude-skill"),
    confirm: vi.fn().mockResolvedValue(true),
    isCancel: vi.fn().mockReturnValue(false),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    ...overrides,
  };
}

/** Build a node:fs mock for the plugin-copy machinery. */
function makeFs() {
  return {
    default: {
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn().mockReturnValue([]),
      statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
      copyFileSync: vi.fn(),
      rmSync: vi.fn(),
    },
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function runCli() {
  return import("../index").catch(() => undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("praxisjs index — ai add command", () => {
  it("runs the add flow when argv is 'ai add'", async () => {
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "add"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(clack.intro).toHaveBeenCalledOnce();
    expect(clack.select).toHaveBeenCalledOnce();
    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("copies skill files when claude-skill is selected via ai add", async () => {
    const clack = makeClack();
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "add"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(fsMock.default.copyFileSync).toHaveBeenCalled();
    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[1]).toBe("Claude Code");
  });

  it("exits when ai add plugin select is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      select: vi.fn().mockResolvedValueOnce(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "add"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runCli();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});

describe("praxisjs index — ai remove command", () => {
  it("runs the remove flow when argv is 'ai remove'", async () => {
    const clack = makeClack();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "remove"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(clack.intro).toHaveBeenCalledOnce();
    expect(clack.select).toHaveBeenCalledOnce();
    expect(clack.confirm).toHaveBeenCalledOnce();
    expect(clack.outro).toHaveBeenCalledOnce();
  });

  it("removes the skill directory when claude-skill is selected via ai remove", async () => {
    const clack = makeClack();
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "remove"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(fsMock.default.rmSync).toHaveBeenCalled();
    const noteArgs = clack.note.mock.calls[0] as [string, string];
    expect(noteArgs[1]).toBe("Claude Code");
  });

  it("exits when ai remove plugin select is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      select: vi.fn().mockResolvedValueOnce(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "remove"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runCli();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("exits without removing anything when the confirmation is declined", async () => {
    const mockExit = vi.fn();
    const clack = makeClack({ confirm: vi.fn().mockResolvedValue(false) });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "remove"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runCli();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(fsMock.default.rmSync).not.toHaveBeenCalled();
  });

  it("exits when the removal confirmation prompt itself is cancelled", async () => {
    const mockExit = vi.fn();
    const CANCEL = Symbol("cancel");
    const clack = makeClack({
      confirm: vi.fn().mockResolvedValue(CANCEL),
      isCancel: vi.fn().mockImplementation((v) => v === CANCEL),
    });
    const fsMock = makeFs();

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => fsMock);
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "remove"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runCli();

    expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(fsMock.default.rmSync).not.toHaveBeenCalled();
  });
});

describe("praxisjs index — command dispatch", () => {
  it("routes 'doctor' to the doctor command", async () => {
    const doctorFn = vi.fn().mockResolvedValue(undefined);

    vi.doMock("../commands/doctor", () => ({ doctor: doctorFn }));
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "doctor"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(doctorFn).toHaveBeenCalledOnce();
  });

  it("routes 'upgrade' to the upgrade command", async () => {
    const upgradeFn = vi.fn().mockResolvedValue(undefined);

    vi.doMock("../commands/upgrade", () => ({ upgrade: upgradeFn }));
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "upgrade"],
      cwd: () => "/fake/cwd",
      exit: vi.fn(),
    }));

    await runCli();

    expect(upgradeFn).toHaveBeenCalledOnce();
  });
});

describe("praxisjs index — command handler error", () => {
  it("logs the error and exits with code 1 when the handler rejects", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");
    const clack = makeClack({
      select: vi.fn().mockRejectedValue(error),
    });

    vi.doMock("picocolors", () => makePc());
    vi.doMock("@clack/prompts", () => clack);
    vi.doMock("node:fs", () => makeFs());
    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "add"],
      cwd: () => "/fake/cwd",
      exit: mockExit,
    }));

    await runCli();

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});

describe("praxisjs index — unknown command", () => {
  it("logs usage and exits with code 1 when no command is given", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs"],
      exit: mockExit,
    }));

    await runCli();

    expect(consoleSpy).toHaveBeenCalled();
    expect(String(consoleSpy.mock.calls[0]?.[0])).toContain("No command given.");
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });

  it("logs usage and exits with code 1 for an unrecognized command", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "bogus"],
      exit: mockExit,
    }));

    await runCli();

    expect(consoleSpy).toHaveBeenCalled();
    expect(String(consoleSpy.mock.calls[0]?.[0])).toContain('"bogus"');
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });

  it("logs usage and exits with code 1 for 'ai' with no subcommand", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai"],
      exit: mockExit,
    }));

    await runCli();

    expect(String(consoleSpy.mock.calls[0]?.[0])).toContain('"ai"');
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });

  it("logs usage and exits with code 1 for an unrecognized ai subcommand", async () => {
    const mockExit = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("node:process", () => ({
      argv: ["node", "praxisjs", "ai", "bogus"],
      exit: mockExit,
    }));

    await runCli();

    expect(String(consoleSpy.mock.calls[0]?.[0])).toContain('"ai bogus"');
    expect(mockExit).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
  });
});
