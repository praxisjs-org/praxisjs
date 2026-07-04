export const PLUGINS = [
  {
    name: "none",
    display: "None",
    description: "Skip AI integrations",
  },
  {
    name: "claude-skill",
    display: "Claude Code",
    description:
      "PraxisJS skill + MCP config — docs-first development, CLAUDE.md management, project conventions",
  },
  {
    name: "codex-skill",
    display: "Codex",
    description:
      "PraxisJS skill for Codex — docs-first development, AGENTS.md management, project conventions",
  },
] as const;

export type PluginName = (typeof PLUGINS)[number]["name"];
