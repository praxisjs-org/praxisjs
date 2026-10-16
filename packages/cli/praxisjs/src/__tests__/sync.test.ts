import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  argv: ["node", "praxisjs", "ai", "sync"],
  env: {} as Record<string, string | undefined>,
  stdin: { isTTY: true as boolean | undefined },
  exit: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn((value: unknown) => typeof value === "symbol"),
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  log: { warn: vi.fn(), success: vi.fn(), info: vi.fn() },
  planSync: vi.fn(),
  applySync: vi.fn(),
  installedIntegrations: vi.fn(),
  hasPendingChanges: vi.fn(),
  hasMcpServer: vi.fn(() => true),
  printAgentPrompt: vi.fn(),
}));

vi.mock("node:process", () => ({
  get argv() {
    return mocks.argv;
  },
  env: mocks.env,
  stdin: mocks.stdin,
  exit: mocks.exit,
  cwd: () => "/project",
}));
vi.mock("@clack/prompts", () => ({
  confirm: mocks.confirm,
  isCancel: mocks.isCancel,
  note: mocks.note,
  intro: mocks.intro,
  outro: mocks.outro,
  log: mocks.log,
}));
vi.mock("picocolors", () => ({ default: new Proxy({}, { get: () => (s: string) => s }) }));
vi.mock("../plugins", () => ({
  planSync: mocks.planSync,
  applySync: mocks.applySync,
  installedIntegrations: mocks.installedIntegrations,
  hasPendingChanges: mocks.hasPendingChanges,
}));

vi.mock("../agent-prompts", () => ({ hasMcpServer: mocks.hasMcpServer, printAgentPrompt: mocks.printAgentPrompt }));

const { describePlan, isInteractive, offerAiSync, sync, syncIntegration } = await import("../commands/ai/sync");

const PLAN = {
  plugin: "claude-skill",
  legacy: true,
  warnings: ["settings.json is not valid JSON"],
  files: [
    { path: "a.md", action: "create", next: "a" },
    { path: "b.md", action: "unchanged", current: "b", next: "b" },
    { path: "c.md", action: "edited", current: "mine\nsame", next: "new\nsame" },
    { path: "d.md", action: "remove-edited", current: "old" },
    { path: "e.md", action: "remove", current: "e" },
  ],
  configs: [
    { file: ".mcp.json", after: "{}" },
    { file: ".claude/settings.json", before: "{}", after: "{}" },
  ],
};

beforeEach(() => {
  mocks.argv = ["node", "praxisjs", "ai", "sync"];
  for (const key of Object.keys(mocks.env)) Reflect.deleteProperty(mocks.env, key);
  mocks.stdin.isTTY = true;
  mocks.planSync.mockReturnValue(PLAN);
  mocks.applySync.mockReturnValue({ written: ["a.md"], removed: ["e.md"], kept: ["c.md"], configs: [".mcp.json"], warnings: [...PLAN.warnings, "extra"] });
  mocks.installedIntegrations.mockReturnValue(["claude-skill"]);
  mocks.hasPendingChanges.mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("isInteractive", () => {
  it("needs a terminal and no CI", () => {
    expect(isInteractive()).toBe(true);
    mocks.env.CI = "1";
    expect(isInteractive()).toBe(false);
    Reflect.deleteProperty(mocks.env, "CI");
    mocks.stdin.isTTY = undefined;
    expect(isInteractive()).toBe(false);
  });
});

describe("describePlan", () => {
  it("lists every change, the legacy notice and the unchanged count", () => {
    const text = describePlan(PLAN as never);
    expect(text).toContain("earlier praxisjs release");
    expect(text).toContain("add                      a.md");
    expect(text).toContain("edited by you            c.md");
    expect(text).toContain("remove, edited by you    d.md");
    expect(text).toContain("remove (no longer shipped) e.md");
    expect(text).toContain("add                      .mcp.json");
    expect(text).toContain("update                   .claude/settings.json");
    expect(text).toContain("1 file already current");
    expect(describePlan({ ...PLAN, legacy: false, files: [{ path: "x", action: "unchanged" }, { path: "y", action: "unchanged" }], configs: [] } as never)).toBe(
      "2 files already current",
    );
    expect(describePlan({ ...PLAN, legacy: false, files: [], configs: [] } as never)).toBe("");
  });
});

describe("syncIntegration", () => {
  it("only describes the plan in a dry run", async () => {
    expect(await syncIntegration("claude-skill", "/project", { dryRun: true, interactive: true })).toBeUndefined();
    expect(mocks.note.mock.calls[0][1]).toBe("Claude Code (dry run)");
    expect(mocks.log.warn).toHaveBeenCalledWith("settings.json is not valid JSON");
    expect(mocks.applySync).not.toHaveBeenCalled();
  });

  it("shows the diff of each edited file and applies only the approved ones", async () => {
    mocks.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(Symbol("cancel"));
    await syncIntegration("claude-skill", "/project", { dryRun: false, interactive: true });
    expect(mocks.note.mock.calls.map((c) => c[1])).toEqual(["Claude Code", "c.md: yours → new", "d.md: yours → removed"]);
    expect(mocks.note.mock.calls[1][0]).toContain("- mine\n+ new\n  same");
    expect(mocks.applySync).toHaveBeenCalledWith(PLAN, "/project", new Set(["c.md"]));
    expect(mocks.log.warn).toHaveBeenCalledWith("extra");
    expect(mocks.log.success).toHaveBeenCalledWith("Claude Code: 1 written, 1 removed, 1 kept with your edits, config: .mcp.json");
    expect(mocks.log.info).not.toHaveBeenCalled();
  });

  it("never asks or overwrites without a terminal", async () => {
    mocks.applySync.mockReturnValueOnce({ written: [], removed: [], kept: ["c.md"], configs: [], warnings: [] });
    await syncIntegration("codex-skill", "/project", { dryRun: false, interactive: false });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.applySync).toHaveBeenCalledWith(PLAN, "/project", new Set());
    expect(mocks.log.success).toHaveBeenCalledWith("Codex: 0 written, 0 removed, 1 kept with your edits");
    expect(mocks.log.info).toHaveBeenCalledWith(expect.stringContaining("never overwritten without a terminal"));
  });

  it("says when there is nothing to change", async () => {
    mocks.planSync.mockReturnValueOnce({ ...PLAN, legacy: false, warnings: [], files: [], configs: [] });
    await syncIntegration("claude-skill", "/project", { dryRun: true, interactive: false });
    expect(mocks.note).toHaveBeenCalledWith("Nothing to change.", "Claude Code (dry run)");
  });
});

describe("sync command", () => {
  it("fails when nothing is installed", async () => {
    mocks.installedIntegrations.mockReturnValueOnce([]);
    await sync();
    expect(mocks.outro).toHaveBeenCalledWith(expect.stringContaining("praxisjs ai add"));
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });

  it("syncs every installed integration, or previews with --dry-run", async () => {
    mocks.stdin.isTTY = undefined;
    await sync();
    expect(mocks.applySync).toHaveBeenCalledOnce();
    expect(mocks.outro).toHaveBeenCalledWith(expect.stringContaining("AI setup is up to date"));

    mocks.argv = [...mocks.argv, "--dry-run"];
    await sync();
    expect(mocks.applySync).toHaveBeenCalledOnce();
    expect(mocks.outro).toHaveBeenLastCalledWith(expect.stringContaining("Dry run"));
    expect(mocks.printAgentPrompt).not.toHaveBeenCalled();
  });

  it("prints the map prompt for each integration whose MCP server the sync added", async () => {
    mocks.installedIntegrations.mockReturnValueOnce(["claude-skill", "codex-skill"]);
    // before: claude has no server, codex has one; after: both have it
    mocks.hasMcpServer.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(true);
    await sync();
    expect(mocks.printAgentPrompt).toHaveBeenCalledOnce();
    expect(mocks.printAgentPrompt).toHaveBeenCalledWith("claude-skill", "map");

    mocks.argv = [...mocks.argv, "--dry-run"];
    mocks.hasMcpServer.mockReturnValueOnce(false).mockReturnValueOnce(false);
    await sync();
    expect(mocks.printAgentPrompt).toHaveBeenCalledOnce();
  });
});

describe("offerAiSync", () => {
  it("does nothing when the setup is current", async () => {
    mocks.hasPendingChanges.mockReturnValue(false);
    await offerAiSync("/project");
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.log.info).not.toHaveBeenCalled();
  });

  it("only prints the command without a terminal", async () => {
    mocks.stdin.isTTY = undefined;
    await offerAiSync("/project");
    expect(mocks.log.info).toHaveBeenCalledWith("The AI setup (Claude Code) is outdated: run `praxisjs ai sync`.");
  });

  it("asks, and syncs on yes", async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    await offerAiSync("/project");
    expect(mocks.applySync).not.toHaveBeenCalled();
    mocks.confirm.mockResolvedValueOnce(Symbol("cancel"));
    await offerAiSync("/project");
    expect(mocks.applySync).not.toHaveBeenCalled();
    mocks.confirm.mockResolvedValueOnce(true).mockResolvedValue(false);
    await offerAiSync("/project");
    expect(mocks.applySync).toHaveBeenCalledOnce();
  });

  it("falls back to the raw integration name", async () => {
    mocks.stdin.isTTY = undefined;
    mocks.installedIntegrations.mockReturnValueOnce(["mystery"]);
    await offerAiSync("/project");
    expect(mocks.log.info).toHaveBeenCalledWith("The AI setup (mystery) is outdated: run `praxisjs ai sync`.");
  });
});
