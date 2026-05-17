export const TEMPLATES = [
  {
    name: "minimal",
    display: "Minimal",
    description: "Signals, decorators, class components",
  },
  {
    name: "router",
    display: "With Router",
    description: "Minimal + @praxisjs/router for client-side routing",
  },
  {
    name: "full",
    display: "Full",
    description: "Router + store + di + composables + concurrent + devtools",
  },
] as const;

export type TemplateName = (typeof TEMPLATES)[number]["name"];

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

export const RENAME_MAP: Record<string, string> = {
  _gitignore: ".gitignore",
};
