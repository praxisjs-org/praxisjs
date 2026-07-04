import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNote = vi.fn();
const mockCopy = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockMkdirSync = vi.fn();
const mockCopyFileSync = vi.fn();

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
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { applyPlugin, notePlugin } = await import("../plugins");

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockNote.mockClear();
  mockCopy.mockClear();
  mockExistsSync.mockReset().mockReturnValue(false);
  mockMkdirSync.mockClear();
  mockCopyFileSync.mockClear();
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
