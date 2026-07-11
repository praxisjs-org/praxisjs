# praxisjs

## 1.0.1

### Patch Changes

- 9c2a7e0: `praxisjs doctor` now flags `useDefineForClassFields: false` instead of `true`, matching the Vite 8 / oxc requirement (see the `@praxisjs/vite-plugin` changelog). Projects still on the old Vite 7 setup with `false` will need to flip this once they upgrade.

  Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output.

## 1.0.0

### Major Changes

- 7fc21f8: **Breaking:** the `add` command is renamed to `ai add` — run `praxisjs ai add` instead of `praxisjs add`. This makes room for future `praxisjs ai <subcommand>` commands.

  Three new commands:
  - `praxisjs ai remove` — removes an AI integration: deletes the skill directory and, for Claude Code, `.claude/settings.json`. Leaves `CLAUDE.md`/`AGENTS.md` and `.praxisjs-ai.json` untouched, since those aren't owned exclusively by the integration.
  - `praxisjs doctor` — diagnoses common project issues: missing `@praxisjs/*` dependencies, tsconfig options required by PraxisJS (`jsxImportSource`, `jsx`, `useDefineForClassFields`), and whether an installed AI integration (Claude Code or Codex) is fully initialized — skill files, MCP config/`AGENTS.md`, the memory file (`CLAUDE.md`/`AGENTS.md`), and `.praxisjs-ai.json` all present.
  - `praxisjs upgrade` — updates every `@praxisjs/*` dependency in `package.json` to its latest published version and reinstalls with the detected package manager.

  The Claude Code and Codex skill instructions were also rewritten to match the current framework: the full docs slug list, the renamed router/store APIs (`@Router`/`@Route`, `@Storable`/`@Store`), the `praxisjs_get_install_command` MCP tool for dependency installs, and pointers to `praxisjs doctor` / `praxisjs upgrade` for existing-project maintenance.

## 0.1.0

### Minor Changes

- 38f8205: Initial release — CLI for maintaining existing PraxisJS projects. Ships `praxisjs add`, which installs an AI integration (Claude Code or Codex skill) into an existing project; this command previously lived in `create-praxisjs`.
