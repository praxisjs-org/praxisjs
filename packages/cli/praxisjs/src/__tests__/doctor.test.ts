import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIntro = vi.fn();
const mockOutro = vi.fn();
const mockNote = vi.fn();
const mockExit = vi.fn();
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock("@clack/prompts", () => ({
  intro: mockIntro,
  outro: mockOutro,
  note: mockNote,
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
  },
}));

const { doctor } = await import("../commands/doctor");

const PKG_WITH_PRAXIS = JSON.stringify({ dependencies: { "@praxisjs/core": "^2.0.0" } });
const PKG_WITHOUT_PRAXIS = JSON.stringify({ dependencies: { react: "^18.0.0" } });
const VALID_TSCONFIG = JSON.stringify({
  compilerOptions: {
    jsx: "react-jsx",
    jsxImportSource: "@praxisjs/jsx",
    useDefineForClassFields: false,
  },
});

/** existsSync returns true only for paths whose suffix is in `truthy`. */
function stubExistsSync(truthy: string[]): void {
  mockExistsSync.mockImplementation((p: unknown) => truthy.some((suffix) => String(p).endsWith(suffix)));
}

/** readFileSync returns per-path content; falls back to a valid package.json/tsconfig.json. */
function stubReadFileSync(overrides: Record<string, string> = {}): void {
  mockReadFileSync.mockImplementation((p: unknown) => {
    const path = String(p);
    const key = Object.keys(overrides).find((suffix) => path.endsWith(suffix));
    if (key) return overrides[key];
    if (path.endsWith("tsconfig.json")) return VALID_TSCONFIG;
    return PKG_WITH_PRAXIS;
  });
}

beforeEach(() => {
  mockIntro.mockClear();
  mockOutro.mockClear();
  mockNote.mockClear();
  mockExit.mockClear();
  mockExistsSync.mockReset();
  mockReadFileSync.mockReset();
  stubReadFileSync();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("doctor — package.json presence", () => {
  it("reports an issue and exits 1 when package.json is missing", async () => {
    stubExistsSync([]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("No package.json found");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("reports an issue when package.json has no @praxisjs/* dependency", async () => {
    stubExistsSync(["package.json"]);
    stubReadFileSync({ "package.json": PKG_WITHOUT_PRAXIS });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("No @praxisjs/* dependencies found");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("reports an issue when package.json is malformed", async () => {
    stubExistsSync(["package.json"]);
    stubReadFileSync({ "package.json": "{ not valid json" });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("could not be parsed");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("does not check tsconfig.json when package.json itself fails its check", async () => {
    stubExistsSync([]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).not.toContain("tsconfig.json");
  });

  it("passes when package.json and tsconfig.json are both valid and no AI integration is installed", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("declares @praxisjs/* dependencies");
    expect(body).toContain("tsconfig.json is configured correctly");
    expect(mockExit).not.toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalledWith("Everything looks good!");
  });
});

describe("doctor — tsconfig.json", () => {
  it("flags a missing tsconfig.json", async () => {
    stubExistsSync(["package.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("No tsconfig.json found");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a malformed tsconfig.json", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({ "tsconfig.json": "{ not valid json" });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("tsconfig.json exists but could not be parsed");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a wrong jsxImportSource", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { jsx: "react-jsx", jsxImportSource: "react", useDefineForClassFields: false },
      }),
    });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain('"jsxImportSource" must be "@praxisjs/jsx"');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags useDefineForClassFields not set to false", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { jsx: "react-jsx", jsxImportSource: "@praxisjs/jsx" },
      }),
    });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain('"useDefineForClassFields" must be false');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a wrong jsx setting", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { jsx: "preserve", jsxImportSource: "@praxisjs/jsx", useDefineForClassFields: false },
      }),
    });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain('"jsx" must be "react-jsx"');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("reports all issues together when compilerOptions is entirely missing", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({ "tsconfig.json": JSON.stringify({}) });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("jsxImportSource");
    expect(body).toContain("useDefineForClassFields");
    expect(body).toContain('"jsx" must be "react-jsx"');
  });
});

describe("doctor — Claude Code integration", () => {
  it("is not reported when the skill is not installed", async () => {
    stubExistsSync(["package.json", "tsconfig.json", "CLAUDE.md", ".praxisjs-ai.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).not.toContain("Claude Code");
  });

  it("passes when the skill, settings.json, CLAUDE.md, and .praxisjs-ai.json all exist", async () => {
    stubExistsSync([
      "package.json",
      "tsconfig.json",
      ".claude/skills/praxisjs/SKILL.md",
      ".claude/settings.json",
      "CLAUDE.md",
      ".praxisjs-ai.json",
    ]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("Claude Code integration is installed and initialized correctly");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("flags a missing settings.json when the skill is present", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".claude/skills/praxisjs/SKILL.md", "CLAUDE.md", ".praxisjs-ai.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing .claude/settings.json");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a missing CLAUDE.md when the skill is present", async () => {
    stubExistsSync([
      "package.json",
      "tsconfig.json",
      ".claude/skills/praxisjs/SKILL.md",
      ".claude/settings.json",
      ".praxisjs-ai.json",
    ]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing CLAUDE.md");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a missing .praxisjs-ai.json when the skill is present", async () => {
    stubExistsSync([
      "package.json",
      "tsconfig.json",
      ".claude/skills/praxisjs/SKILL.md",
      ".claude/settings.json",
      "CLAUDE.md",
    ]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing .praxisjs-ai.json");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("lists every missing piece when only the skill exists", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".claude/skills/praxisjs/SKILL.md"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain(".claude/settings.json");
    expect(body).toContain("CLAUDE.md");
    expect(body).toContain(".praxisjs-ai.json");
  });
});

describe("doctor — Codex integration", () => {
  it("is not reported when the skill is not installed, even if AGENTS.md exists for other reasons", async () => {
    stubExistsSync(["package.json", "tsconfig.json", "AGENTS.md"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).not.toContain("Codex");
  });

  it("passes when the skill, AGENTS.md, and .praxisjs-ai.json all exist", async () => {
    stubExistsSync([
      "package.json",
      "tsconfig.json",
      ".agents/skills/praxisjs/SKILL.md",
      "AGENTS.md",
      ".praxisjs-ai.json",
    ]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("Codex integration is installed and initialized correctly");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("flags a missing AGENTS.md when the skill is present", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".agents/skills/praxisjs/SKILL.md", ".praxisjs-ai.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing AGENTS.md");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a missing .praxisjs-ai.json when the skill and AGENTS.md are present", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".agents/skills/praxisjs/SKILL.md", "AGENTS.md"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing .praxisjs-ai.json");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("doctor — multiple issues", () => {
  it("uses the plural form when more than one issue is found", async () => {
    stubExistsSync([".agents/skills/praxisjs/SKILL.md"]);

    await doctor();

    expect(mockOutro).toHaveBeenCalledWith("2 issues found.");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
