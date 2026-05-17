---
"create-praxisjs": minor
---

Add AI integrations to the scaffolder and a new `add` subcommand for existing projects.

**New project flow** — after choosing a template, a second select asks "Add an AI integration?" with two options:

- **Claude Code** — copies the PraxisJS skill to `.claude/skills/praxisjs/` and creates `.claude/settings.json` pre-configured with the `@praxisjs/mcp` server.
- **Codex** — copies the PraxisJS skill to `.agents/skills/praxisjs/` and creates `AGENTS.md` at the project root (MCP is configured separately in `~/.codex/config.toml`).

**Existing projects** — run `npx create-praxisjs add` (or `pnpm dlx` / `yarn dlx` / `bunx`) to add an integration interactively to the current directory.

**Bug fix** — corrected plugin and template path resolution (`../plugins/` instead of `../../plugins/`) so the bundled binary correctly locates its asset directories at runtime.
