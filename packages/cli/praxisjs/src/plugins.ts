import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { note } from "@clack/prompts";
import pc from "picocolors";

import { copy } from "./utils";

import type { PluginName } from "./constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function applyPlugin(plugin: PluginName, root: string): void {
  const pluginDir = path.resolve(__dirname, "../plugins", plugin);

  if (plugin === "claude-skill") {
    copy(
      path.join(pluginDir, "skills", "praxisjs"),
      path.join(root, ".claude", "skills", "praxisjs"),
    );
    const settingsDir = path.join(root, ".claude");
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    copy(
      path.join(pluginDir, "dot-claude", "settings.json"),
      path.join(settingsDir, "settings.json"),
    );
    return;
  }

  if (plugin === "codex-skill") {
    copy(
      path.join(pluginDir, "dot-agents", "skills", "praxisjs"),
      path.join(root, ".agents", "skills", "praxisjs"),
    );
    const agentsMd = path.join(root, "AGENTS.md");
    if (!fs.existsSync(agentsMd)) {
      fs.copyFileSync(path.join(pluginDir, "AGENTS.md"), agentsMd);
    }
  }
}

export function removePlugin(plugin: PluginName, root: string): void {
  if (plugin === "claude-skill") {
    fs.rmSync(path.join(root, ".claude", "skills", "praxisjs"), { recursive: true, force: true });
    fs.rmSync(path.join(root, ".claude", "settings.json"), { force: true });
    return;
  }

  if (plugin === "codex-skill") {
    fs.rmSync(path.join(root, ".agents", "skills", "praxisjs"), { recursive: true, force: true });
  }
}

export function noteRemovedPlugin(plugin: PluginName): void {
  if (plugin === "claude-skill") {
    note(
      [
        pc.dim("Removed") + " .claude/skills/praxisjs/",
        pc.dim("Removed") + " .claude/settings.json",
        pc.dim("Left untouched:") + " CLAUDE.md, .praxisjs-ai.json",
      ].join("\n"),
      "Claude Code",
    );
    return;
  }

  if (plugin === "codex-skill") {
    note(
      [
        pc.dim("Removed") + " .agents/skills/praxisjs/",
        pc.dim("Left untouched:") + " AGENTS.md, .praxisjs-ai.json",
      ].join("\n"),
      "Codex",
    );
  }
}

export function notePlugin(plugin: PluginName): void {
  if (plugin === "claude-skill") {
    note(
      [
        pc.dim("Skill installed at") + " .claude/skills/praxisjs/",
        pc.dim("MCP server configured in") + " .claude/settings.json",
        pc.dim("Docs:") + " praxisjs.org/docs/tooling/mcp",
      ].join("\n"),
      "Claude Code",
    );
    return;
  }

  if (plugin === "codex-skill") {
    note(
      [
        pc.dim("Skill installed at") + " .agents/skills/praxisjs/",
        pc.dim("AGENTS.md created at project root"),
        pc.dim("Add MCP to ~/.codex/config.toml:") + " praxisjs.org/docs/tooling/mcp",
      ].join("\n"),
      "Codex",
    );
  }
}
