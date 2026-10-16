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
vi.mock("node:os", () => ({ homedir: () => "/home/dev" }));
const mockPlugins = vi.hoisted(() => ({
  installedIntegrations: vi.fn((): string[] => []),
  planSync: vi.fn((plugin: string) => ({ plugin })),
  hasPendingChanges: vi.fn((plan: { plugin: string }) => plan.plugin === "codex-skill"),
}));
vi.mock("../plugins", () => ({ MCP_SERVER_NAME: "praxisjs", sharedSkillNames: () => ["praxisjs-component"], ...mockPlugins }));
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
    useDefineForClassFields: true,
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
        compilerOptions: { jsx: "react-jsx", jsxImportSource: "react", useDefineForClassFields: true },
      }),
    });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain('"jsxImportSource" must be "@praxisjs/jsx"');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags useDefineForClassFields not set to true", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { jsx: "react-jsx", jsxImportSource: "@praxisjs/jsx" },
      }),
    });

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain('"useDefineForClassFields" must be true');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags a wrong jsx setting", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    stubReadFileSync({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { jsx: "preserve", jsxImportSource: "@praxisjs/jsx", useDefineForClassFields: true },
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
  const MCP_JSON = { ".mcp.json": JSON.stringify({ mcpServers: { praxisjs: { command: "npx" } } }) };
  const COMPLETE = [
    "package.json",
    "tsconfig.json",
    ".claude/skills/praxisjs/SKILL.md",
    ".claude/skills/praxisjs-component/SKILL.md",
    "CLAUDE.md",
    ".praxisjs-ai.json",
  ];

  it("is not reported when the skill is not installed", async () => {
    stubExistsSync(["package.json", "tsconfig.json", "CLAUDE.md", ".praxisjs-ai.json"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).not.toContain("Claude Code");
  });

  it("passes when the skills, the MCP server, CLAUDE.md and .praxisjs-ai.json are all there", async () => {
    stubExistsSync(COMPLETE);
    stubReadFileSync(MCP_JSON);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("Claude Code integration is installed and initialized correctly");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("flags a missing or unreadable MCP server configuration", async () => {
    stubExistsSync(COMPLETE);
    stubReadFileSync({ ".mcp.json": JSON.stringify({ mcpServers: { other: {} } }) });

    await doctor();

    expect((mockNote.mock.calls[0] as [string])[0]).toContain("missing the praxisjs MCP server in .mcp.json");

    mockNote.mockClear();
    stubReadFileSync({ ".mcp.json": "{ broken" });
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("missing the praxisjs MCP server in .mcp.json");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags missing DX skills, CLAUDE.md and .praxisjs-ai.json", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".claude/skills/praxisjs/SKILL.md"]);
    stubReadFileSync(MCP_JSON);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain("missing .claude/skills/praxisjs-component/, CLAUDE.md, .praxisjs-ai.json");
    expect(body).toContain("praxisjs ai add");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("doctor — Codex integration", () => {
  const TOML = { "config.toml": '[mcp_servers.praxisjs]\ncommand = "npx"\n' };
  const COMPLETE = [
    "package.json",
    "tsconfig.json",
    ".agents/skills/praxisjs/SKILL.md",
    ".agents/skills/praxisjs-component/SKILL.md",
    "AGENTS.md",
    ".praxisjs-ai.json",
  ];

  it("is not reported when the skill is not installed, even if AGENTS.md exists for other reasons", async () => {
    stubExistsSync(["package.json", "tsconfig.json", "AGENTS.md"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).not.toContain("Codex");
  });

  it("passes with the server in the project config or in the global one", async () => {
    stubExistsSync([...COMPLETE, "/project/.codex/config.toml"]);
    stubReadFileSync(TOML);
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("Codex integration is installed and initialized correctly");

    mockNote.mockClear();
    stubExistsSync([...COMPLETE, "/home/dev/.codex/config.toml"]);
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("Codex integration is installed and initialized correctly");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("flags a config without the server", async () => {
    stubExistsSync([...COMPLETE, "/project/.codex/config.toml"]);
    stubReadFileSync({ "config.toml": '[mcp_servers.other]\n' });

    await doctor();

    expect((mockNote.mock.calls[0] as [string])[0]).toContain("missing the praxisjs MCP server in .codex/config.toml (or ~/.codex/config.toml)");
  });

  it("flags missing DX skills, the server, AGENTS.md and .praxisjs-ai.json", async () => {
    stubExistsSync(["package.json", "tsconfig.json", ".agents/skills/praxisjs/SKILL.md"]);

    await doctor();

    const [body] = mockNote.mock.calls[0] as [string];
    expect(body).toContain(
      "missing .agents/skills/praxisjs-component/, the praxisjs MCP server in .codex/config.toml (or ~/.codex/config.toml), AGENTS.md, .praxisjs-ai.json",
    );
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

describe("doctor — @praxisjs/* version compatibility", () => {
  function run(pkg: Record<string, Record<string, string>>, installed: Record<string, string> = {}): Promise<void> {
    const installedPaths = Object.keys(installed).map((name) => `node_modules/${name}/package.json`);
    mockExistsSync.mockImplementation((p: unknown) => {
      const path = String(p);
      if (path.includes("node_modules")) return installedPaths.some((suffix) => path.endsWith(suffix));
      return path.endsWith("/project/package.json") || path.endsWith("tsconfig.json");
    });
    const overrides: Record<string, string> = { "/project/package.json": JSON.stringify(pkg) };
    for (const [name, content] of Object.entries(installed)) overrides[`node_modules/${name}/package.json`] = content;
    stubReadFileSync(overrides);
    return doctor();
  }

  const body = (): string => (mockNote.mock.calls[0] as [string])[0];

  it("passes when the versions go together", async () => {
    await run({
      dependencies: { "@praxisjs/core": "^2.3.0", "@praxisjs/decorators": "^1.8.0", "@praxisjs/jsx": "^0.8.0", "@praxisjs/runtime": "^0.8.0" },
      devDependencies: { "@praxisjs/vite-plugin": "^4.1.0" },
    });

    expect(body()).toContain("@praxisjs/* package versions are compatible.");
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("flags vite-plugin 4.1 with a runtime older than 0.8", async () => {
    await run({
      dependencies: { "@praxisjs/runtime": "^0.7.1" },
      devDependencies: { "@praxisjs/vite-plugin": "^4.1.0" },
    });

    expect(body()).toContain("@praxisjs/vite-plugin@4.1.0 needs @praxisjs/runtime >= 0.8.0 (found 0.7.1)");
    expect(body()).toContain("praxisjs upgrade");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("flags vite-plugin 4.1 when the runtime is not a dependency at all", async () => {
    await run({ dependencies: { "@praxisjs/core": "^2.3.0" }, devDependencies: { "@praxisjs/vite-plugin": "4.1.2" } });

    expect(body()).toContain("@praxisjs/vite-plugin@4.1.2 needs @praxisjs/runtime >= 0.8.0 as a dependency");
  });

  it("flags jsx 0.8 with runtime 0.7 and decorators 1.8 with core 2.2", async () => {
    await run({
      dependencies: {
        "@praxisjs/core": "^2.2.0",
        "@praxisjs/decorators": "^1.8.0",
        "@praxisjs/jsx": "~0.8.0",
        "@praxisjs/runtime": "~0.7.1",
      },
    });

    expect(body()).toContain("@praxisjs/jsx@0.8.0 needs @praxisjs/runtime >= 0.8.0 (found 0.7.1)");
    expect(body()).toContain("@praxisjs/decorators@1.8.0 needs @praxisjs/core >= 2.3.0 (found 2.2.0)");
  });

  it("ignores packages older than the release that introduced the requirement", async () => {
    await run({ dependencies: { "@praxisjs/runtime": "^0.6.0" }, devDependencies: { "@praxisjs/vite-plugin": "^4.0.6" } });

    expect(body()).toContain("@praxisjs/* package versions are compatible.");
  });

  it("prefers the installed version over the declared range", async () => {
    await run(
      { dependencies: { "@praxisjs/runtime": "^0.7.1" }, devDependencies: { "@praxisjs/vite-plugin": "^4.0.6" } },
      {
        "@praxisjs/runtime": JSON.stringify({ version: "0.7.3" }),
        "@praxisjs/vite-plugin": JSON.stringify({ version: "4.1.1" }),
      },
    );

    expect(body()).toContain("@praxisjs/vite-plugin@4.1.1 needs @praxisjs/runtime >= 0.8.0 (found 0.7.3)");
  });

  it("falls back to the declared range when the installed manifest is unreadable or has no version", async () => {
    await run(
      { dependencies: { "@praxisjs/runtime": "^0.8.0" }, devDependencies: { "@praxisjs/vite-plugin": "^4.1.0" } },
      { "@praxisjs/runtime": "{ broken", "@praxisjs/vite-plugin": JSON.stringify({ name: "x" }) },
    );

    expect(body()).toContain("@praxisjs/* package versions are compatible.");
  });

  it("skips ranges it cannot read, such as workspace:* or latest", async () => {
    await run({ dependencies: { "@praxisjs/runtime": "latest" }, devDependencies: { "@praxisjs/vite-plugin": "workspace:*" } });

    expect(body()).toContain("@praxisjs/* package versions are compatible.");
  });

  it("does not check versions when package.json fails", async () => {
    stubExistsSync([]);

    await doctor();

    expect(body()).not.toContain("package versions");
  });
});

describe("doctor — AI setup version", () => {
  it("is not reported without an integration", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).not.toContain("AI setup");
  });

  it("passes when the setup matches this version and flags an outdated one", async () => {
    stubExistsSync(["package.json", "tsconfig.json"]);
    mockPlugins.installedIntegrations.mockReturnValueOnce(["claude-skill"]);
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("AI setup matches this praxisjs version.");

    mockNote.mockClear();
    mockPlugins.installedIntegrations.mockReturnValueOnce(["claude-skill", "codex-skill"]);
    await doctor();
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("AI setup is outdated (codex-skill)");
    expect((mockNote.mock.calls[0] as [string])[0]).toContain("praxisjs ai sync");
  });
});
