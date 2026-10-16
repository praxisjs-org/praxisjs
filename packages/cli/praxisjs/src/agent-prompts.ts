import fs from "node:fs";
import path from "node:path";

import pc from "picocolors";

import { PLUGINS, type PluginName } from "./constants";

// docs/content/docs/guide/getting-started.mdx shows both prompts word for word (a test checks it).
export const SETUP_PROMPT =
  "Set up this new PraxisJS project with me. Check that the praxisjs MCP server is connected, then read the praxisjs skill and the docs it points to. Run its session start checklist: ask me the setup questions in one message, set up the project memory, and confirm the folder structure and conventions with me before writing any code.";

export const MAP_PROMPT =
  "Map this PraxisJS project into its memory. Check that the praxisjs MCP server is connected, then run the praxisjs-memory-bootstrap skill over the whole project. Confirm the folder structure and conventions you find with me, and ask about anything the code does not make clear.";

export type AgentPromptKind = "setup" | "map";

const TITLES: Record<AgentPromptKind, string> = {
  setup: "Start the project setup",
  map: "Map the project into its memory",
};

function agentName(plugin: PluginName): string {
  return PLUGINS.find((p) => p.name === plugin)?.display ?? plugin;
}

/**
 * Printed after the outro, outside clack's frame, so the prompt is one plain line that copies
 * cleanly from the terminal.
 */
export function printAgentPrompt(plugin: PluginName, kind: AgentPromptKind): void {
  if (plugin === "none") return;
  const prompt = kind === "setup" ? SETUP_PROMPT : MAP_PROMPT;
  console.log(`\n${pc.bold(TITLES[kind])} ${pc.dim(`(paste this into ${agentName(plugin)})`)}\n\n${prompt}\n`);
}

/** Whether the praxisjs MCP server is configured for `plugin`'s agent in `root`. */
export function hasMcpServer(plugin: Exclude<PluginName, "none">, root: string): boolean {
  if (plugin === "codex-skill") {
    const file = path.join(root, ".codex", "config.toml");
    return fs.existsSync(file) && /^\[mcp_servers\.praxisjs\]/m.test(fs.readFileSync(file, "utf-8"));
  }
  const file = path.join(root, ".mcp.json");
  if (!fs.existsSync(file)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(file, "utf-8")) as { mcpServers?: Record<string, unknown> } | null;
    return config?.mcpServers?.praxisjs !== undefined;
  } catch {
    return false;
  }
}
