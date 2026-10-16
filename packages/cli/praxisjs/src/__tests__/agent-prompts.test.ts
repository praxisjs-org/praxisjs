import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("picocolors", () => ({ default: new Proxy({}, { get: () => (s: string) => s }) }));

const { hasMcpServer, MAP_PROMPT, printAgentPrompt, SETUP_PROMPT } = await import("../agent-prompts");

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../docs/content/docs/guide");

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "praxisjs-prompts-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("agent prompts", () => {
  it("are one short English line each, naming the MCP server and the folder structure and conventions", () => {
    for (const prompt of [SETUP_PROMPT, MAP_PROMPT]) {
      expect(prompt).not.toContain("\n");
      expect(prompt.length).toBeLessThan(400);
      expect(prompt).toContain("praxisjs MCP server");
      expect(prompt).toContain("folder structure and conventions");
    }
  });

  it("let the skill ask scaffold / map for a new project, and ask for the full mapping for an existing one", () => {
    expect(SETUP_PROMPT).toContain("session start checklist");
    expect(SETUP_PROMPT).not.toContain("praxisjs-memory-bootstrap");
    expect(MAP_PROMPT).toContain("praxisjs-memory-bootstrap skill");
  });

  it("appear word for word in the quickstart, which ai-skills links to", () => {
    const quickstart = fs.readFileSync(path.join(DOCS, "getting-started.mdx"), "utf-8");
    expect(quickstart).toContain(SETUP_PROMPT);
    expect(quickstart).toContain(MAP_PROMPT);
    expect(fs.readFileSync(path.join(DOCS, "ai-skills.mdx"), "utf-8")).toContain("getting-started#set-up-with-your-agent");
  });

  it("prints the prompt as a plain line, named for the agent", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    printAgentPrompt("claude-skill", "setup");
    printAgentPrompt("codex-skill", "map");
    printAgentPrompt("none", "map");

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0]?.[0]).toBe(`\nStart the project setup (paste this into Claude Code)\n\n${SETUP_PROMPT}\n`);
    expect(log.mock.calls[1]?.[0]).toBe(`\nMap the project into its memory (paste this into Codex)\n\n${MAP_PROMPT}\n`);
  });

  it("falls back to the raw integration name", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    printAgentPrompt("cursor" as "codex-skill", "map");
    expect(String(log.mock.calls[0]?.[0])).toContain("(paste this into cursor)");
  });
});

describe("hasMcpServer", () => {
  it("reads .mcp.json for Claude Code", () => {
    expect(hasMcpServer("claude-skill", root)).toBe(false);
    fs.writeFileSync(path.join(root, ".mcp.json"), "{ not json");
    expect(hasMcpServer("claude-skill", root)).toBe(false);
    fs.writeFileSync(path.join(root, ".mcp.json"), "null");
    expect(hasMcpServer("claude-skill", root)).toBe(false);
    fs.writeFileSync(path.join(root, ".mcp.json"), JSON.stringify({ mcpServers: { other: {} } }));
    expect(hasMcpServer("claude-skill", root)).toBe(false);
    fs.writeFileSync(path.join(root, ".mcp.json"), JSON.stringify({ mcpServers: { praxisjs: { command: "npx" } } }));
    expect(hasMcpServer("claude-skill", root)).toBe(true);
  });

  it("reads .codex/config.toml for Codex", () => {
    expect(hasMcpServer("codex-skill", root)).toBe(false);
    fs.mkdirSync(path.join(root, ".codex"));
    fs.writeFileSync(path.join(root, ".codex", "config.toml"), '[mcp_servers.other]\ncommand = "x"\n');
    expect(hasMcpServer("codex-skill", root)).toBe(false);
    fs.writeFileSync(path.join(root, ".codex", "config.toml"), '[mcp_servers.praxisjs]\ncommand = "npx"\n');
    expect(hasMcpServer("codex-skill", root)).toBe(true);
  });
});
