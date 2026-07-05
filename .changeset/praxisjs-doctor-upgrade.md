---
"praxisjs": major
---

**Breaking:** the `add` command is renamed to `ai add` — run `praxisjs ai add` instead of `praxisjs add`. This makes room for future `praxisjs ai <subcommand>` commands.

Three new commands:

- `praxisjs ai remove` — removes an AI integration: deletes the skill directory and, for Claude Code, `.claude/settings.json`. Leaves `CLAUDE.md`/`AGENTS.md` and `.praxisjs-ai.json` untouched, since those aren't owned exclusively by the integration.
- `praxisjs doctor` — diagnoses common project issues: missing `@praxisjs/*` dependencies, tsconfig options required by PraxisJS (`jsxImportSource`, `jsx`, `useDefineForClassFields`), and whether an installed AI integration (Claude Code or Codex) is fully initialized — skill files, MCP config/`AGENTS.md`, the memory file (`CLAUDE.md`/`AGENTS.md`), and `.praxisjs-ai.json` all present.
- `praxisjs upgrade` — updates every `@praxisjs/*` dependency in `package.json` to its latest published version and reinstalls with the detected package manager.

The Claude Code and Codex skill instructions were also rewritten to match the current framework: the full docs slug list, the renamed router/store APIs (`@Router`/`@Route`, `@Storable`/`@Store`), the `praxisjs_get_install_command` MCP tool for dependency installs, and pointers to `praxisjs doctor` / `praxisjs upgrade` for existing-project maintenance.
