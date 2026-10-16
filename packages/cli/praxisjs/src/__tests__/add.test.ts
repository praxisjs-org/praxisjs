import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  installedIntegrations: vi.fn(),
  applyPlugin: vi.fn(() => ["warning"]),
  syncIntegration: vi.fn(),
  outro: vi.fn(),
  warn: vi.fn(),
  notePlugin: vi.fn(),
  hasMcpServer: vi.fn(() => false),
  printAgentPrompt: vi.fn(),
}));

vi.mock("node:process", () => ({ cwd: () => "/project", exit: vi.fn() }));
vi.mock("@clack/prompts", () => ({
  cancel: vi.fn(),
  intro: vi.fn(),
  isCancel: () => false,
  log: { warn: mocks.warn },
  outro: mocks.outro,
  select: mocks.select,
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));
vi.mock("picocolors", () => ({ default: new Proxy({}, { get: () => (s: string) => s }) }));
vi.mock("../plugins", () => ({
  applyPlugin: mocks.applyPlugin,
  installedIntegrations: mocks.installedIntegrations,
  notePlugin: mocks.notePlugin,
}));
vi.mock("../agent-prompts", () => ({ hasMcpServer: mocks.hasMcpServer, printAgentPrompt: mocks.printAgentPrompt }));
vi.mock("../commands/ai/sync", () => ({ isInteractive: () => false, syncIntegration: mocks.syncIntegration }));

const { add } = await import("../commands/ai/add");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ai add", () => {
  it("installs a new integration", async () => {
    mocks.select.mockResolvedValue("codex-skill");
    mocks.installedIntegrations.mockReturnValue([]);
    await add();
    expect(mocks.applyPlugin).toHaveBeenCalledWith("codex-skill", "/project");
    expect(mocks.warn).toHaveBeenCalledWith("warning");
    expect(mocks.notePlugin).toHaveBeenCalledWith("codex-skill");
    expect(mocks.printAgentPrompt).toHaveBeenCalledWith("codex-skill", "map");
    expect(mocks.outro.mock.invocationCallOrder[0]).toBeLessThan(mocks.printAgentPrompt.mock.invocationCallOrder[0] ?? 0);
  });

  it("updates an integration that is already installed instead of overwriting it", async () => {
    mocks.select.mockResolvedValue("claude-skill");
    mocks.installedIntegrations.mockReturnValue(["claude-skill"]);
    await add();
    expect(mocks.syncIntegration).toHaveBeenCalledWith("claude-skill", "/project", { dryRun: false, interactive: false });
    expect(mocks.applyPlugin).not.toHaveBeenCalled();
    expect(mocks.outro).toHaveBeenCalledWith("Updated the existing integration.");
    expect(mocks.printAgentPrompt).not.toHaveBeenCalled();
  });

  it("prints the map prompt when updating an integration adds its MCP server", async () => {
    mocks.select.mockResolvedValue("claude-skill");
    mocks.installedIntegrations.mockReturnValue(["claude-skill"]);
    mocks.hasMcpServer.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await add();
    expect(mocks.printAgentPrompt).toHaveBeenCalledWith("claude-skill", "map");
  });

  it("treats 'none' as a fresh choice", async () => {
    mocks.select.mockResolvedValue("none");
    mocks.installedIntegrations.mockReturnValue(["claude-skill"]);
    await add();
    expect(mocks.applyPlugin).toHaveBeenCalledWith("none", "/project");
  });
});
