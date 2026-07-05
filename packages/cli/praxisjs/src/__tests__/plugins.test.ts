import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNote = vi.fn();
const mockCopy = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockMkdirSync = vi.fn();
const mockCopyFileSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock("@clack/prompts", () => ({ note: mockNote }));
vi.mock("picocolors", () => ({
  default: new Proxy({}, { get: () => (s: string) => s }),
}));
vi.mock("../utils", () => ({ copy: mockCopy }));
vi.mock("node:fs", () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    copyFileSync: mockCopyFileSync,
    rmSync: mockRmSync,
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { applyPlugin, notePlugin, removePlugin, noteRemovedPlugin } = await import("../plugins");

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockNote.mockClear();
  mockCopy.mockClear();
  mockExistsSync.mockReset().mockReturnValue(false);
  mockMkdirSync.mockClear();
  mockCopyFileSync.mockClear();
  mockRmSync.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── applyPlugin — claude-skill ────────────────────────────────────────────────

describe("applyPlugin — claude-skill", () => {
  it("copies the skill directory to .claude/skills/praxisjs", () => {
    applyPlugin("claude-skill", "/root");

    expect(mockCopy).toHaveBeenCalledWith(
      expect.stringContaining("skills"),
      expect.stringContaining(".claude"),
    );
  });

  it("creates .claude dir when it does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    applyPlugin("claude-skill", "/root");

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(".claude"),
      { recursive: true },
    );
  });

  it("skips mkdir when .claude dir already exists", () => {
    mockExistsSync.mockReturnValue(true);

    applyPlugin("claude-skill", "/root");

    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  it("copies settings.json into .claude", () => {
    applyPlugin("claude-skill", "/root");

    expect(mockCopy).toHaveBeenCalledWith(
      expect.stringContaining("settings.json"),
      expect.stringContaining("settings.json"),
    );
  });
});

// ── applyPlugin — codex-skill ─────────────────────────────────────────────────

describe("applyPlugin — codex-skill", () => {
  it("copies the skill directory to .agents/skills/praxisjs", () => {
    applyPlugin("codex-skill", "/root");

    expect(mockCopy).toHaveBeenCalledWith(
      expect.stringContaining("dot-agents"),
      expect.stringContaining(".agents"),
    );
  });

  it("creates AGENTS.md when it does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    applyPlugin("codex-skill", "/root");

    expect(mockCopyFileSync).toHaveBeenCalledWith(
      expect.stringContaining("AGENTS.md"),
      expect.stringContaining("AGENTS.md"),
    );
  });

  it("skips AGENTS.md when it already exists", () => {
    mockExistsSync.mockReturnValue(true);

    applyPlugin("codex-skill", "/root");

    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });
});

// ── applyPlugin — none ────────────────────────────────────────────────────────

describe("applyPlugin — none", () => {
  it("does nothing", () => {
    applyPlugin("none", "/root");

    expect(mockCopy).not.toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });
});

// ── removePlugin — claude-skill ───────────────────────────────────────────────

describe("removePlugin — claude-skill", () => {
  it("removes the skill directory", () => {
    removePlugin("claude-skill", "/root");

    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("skills"),
      { recursive: true, force: true },
    );
  });

  it("removes settings.json", () => {
    removePlugin("claude-skill", "/root");

    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("settings.json"),
      { force: true },
    );
  });

  it("does not touch CLAUDE.md or .praxisjs-ai.json", () => {
    removePlugin("claude-skill", "/root");

    const calledPaths = mockRmSync.mock.calls.map((c) => String(c[0]));
    expect(calledPaths.some((p) => p.includes("CLAUDE.md"))).toBe(false);
    expect(calledPaths.some((p) => p.includes(".praxisjs-ai.json"))).toBe(false);
  });
});

// ── removePlugin — codex-skill ────────────────────────────────────────────────

describe("removePlugin — codex-skill", () => {
  it("removes the skill directory", () => {
    removePlugin("codex-skill", "/root");

    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining(".agents"),
      { recursive: true, force: true },
    );
  });

  it("does not touch AGENTS.md or .praxisjs-ai.json", () => {
    removePlugin("codex-skill", "/root");

    const calledPaths = mockRmSync.mock.calls.map((c) => String(c[0]));
    expect(calledPaths.some((p) => p.includes("AGENTS.md"))).toBe(false);
    expect(calledPaths.some((p) => p.includes(".praxisjs-ai.json"))).toBe(false);
  });

  it("calls rmSync exactly once (skill dir only)", () => {
    removePlugin("codex-skill", "/root");

    expect(mockRmSync).toHaveBeenCalledOnce();
  });
});

// ── removePlugin — none ───────────────────────────────────────────────────────

describe("removePlugin — none", () => {
  it("does nothing", () => {
    removePlugin("none", "/root");

    expect(mockRmSync).not.toHaveBeenCalled();
  });
});

// ── noteRemovedPlugin ──────────────────────────────────────────────────────────

describe("noteRemovedPlugin — claude-skill", () => {
  it("calls note with Claude Code title", () => {
    noteRemovedPlugin("claude-skill");

    expect(mockNote).toHaveBeenCalledOnce();
    const [, title] = mockNote.mock.calls[0] as [string, string];
    expect(title).toBe("Claude Code");
  });

  it("note body mentions what was removed and left untouched", () => {
    noteRemovedPlugin("claude-skill");

    const [body] = mockNote.mock.calls[0] as [string, string];
    expect(body).toContain(".claude/skills/praxisjs/");
    expect(body).toContain(".claude/settings.json");
    expect(body).toContain("CLAUDE.md");
  });
});

describe("noteRemovedPlugin — codex-skill", () => {
  it("calls note with Codex title", () => {
    noteRemovedPlugin("codex-skill");

    expect(mockNote).toHaveBeenCalledOnce();
    const [, title] = mockNote.mock.calls[0] as [string, string];
    expect(title).toBe("Codex");
  });

  it("note body mentions what was removed and left untouched", () => {
    noteRemovedPlugin("codex-skill");

    const [body] = mockNote.mock.calls[0] as [string, string];
    expect(body).toContain(".agents/skills/praxisjs/");
    expect(body).toContain("AGENTS.md");
  });
});

describe("noteRemovedPlugin — none", () => {
  it("does not call note", () => {
    noteRemovedPlugin("none");

    expect(mockNote).not.toHaveBeenCalled();
  });
});

// ── notePlugin ────────────────────────────────────────────────────────────────

describe("notePlugin — claude-skill", () => {
  it("calls note with Claude Code title", () => {
    notePlugin("claude-skill");

    expect(mockNote).toHaveBeenCalledOnce();
    const [, title] = mockNote.mock.calls[0] as [string, string];
    expect(title).toBe("Claude Code");
  });

  it("note body mentions .claude/skills/praxisjs", () => {
    notePlugin("claude-skill");

    const [body] = mockNote.mock.calls[0] as [string, string];
    expect(body).toContain(".claude/skills/praxisjs/");
  });
});

describe("notePlugin — codex-skill", () => {
  it("calls note with Codex title", () => {
    notePlugin("codex-skill");

    expect(mockNote).toHaveBeenCalledOnce();
    const [, title] = mockNote.mock.calls[0] as [string, string];
    expect(title).toBe("Codex");
  });

  it("note body mentions .agents/skills/praxisjs", () => {
    notePlugin("codex-skill");

    const [body] = mockNote.mock.calls[0] as [string, string];
    expect(body).toContain(".agents/skills/praxisjs/");
  });
});

describe("notePlugin — none", () => {
  it("does not call note", () => {
    notePlugin("none");

    expect(mockNote).not.toHaveBeenCalled();
  });
});
