---
name: praxisjs-ai-setup
description: Update an existing PraxisJS project's AI setup to the current version — skills, PraxisJS MCP server configuration and the .praxis/ project memory format — with praxisjs ai sync and praxisjs_memory_migrate, keeping local edits. Use when a project was set up by an older praxisjs/create-praxisjs, when praxisjs doctor reports an outdated AI setup, when MCP tools are missing or old, or when the user asks to update the AI integration.
---

# Update this project's AI setup

Follow the `praxisjs` skill's rules. Three parts can be out of date; check each.

## 1. Skills and MCP configuration (`praxisjs ai sync`)

1. `npx praxisjs doctor` reports an outdated AI setup and anything missing.
2. Preview: `npx praxisjs ai sync --dry-run`. It lists, per installed integration (Claude Code,
   Codex):
   - files to add (new skills, references), to update (unedited old copies), to remove (no longer
     shipped);
   - files **edited by the developer**, which are never overwritten silently;
   - MCP configuration changes (`.mcp.json` + `.claude/settings.json` approval for Claude Code,
     `.codex/config.toml` for Codex), including moving an old server entry out of
     `.claude/settings.json`, where Claude Code never read it.
3. Show the developer the preview, then run `npx praxisjs ai sync` in their terminal: it shows the
   diff of each edited file and asks before replacing or deleting it. Without a terminal (CI, piped)
   edited files are always kept.
4. Restart or reconnect the agent so it loads the new skills and the MCP server (Claude Code: approve
   the server if asked, check with `/mcp`).

Installs from before this mechanism are recognized (the CLI knows the hashes of every file earlier
releases installed) and updated in place; anything the developer changed counts as an edit.
`.praxisjs-ai.lock.json` records what the CLI installed from now on: commit it.

## 2. Project memory

- No `.praxis/`: run the `praxisjs-memory-bootstrap` skill.
- `.praxis/` in an older format (memory tools ask for a migration): `praxisjs_memory_migrate` (dry
  run by default) → review the plan with the developer → `praxisjs_memory_migrate({ dryRun: false })`.
  The migration rewrites entries canonically and swaps the folder atomically; invalid entries are
  reported and kept, fix them afterwards with `praxisjs_memory_update` or remove and re-add them.
- Then `praxisjs_memory_map` to catch entries that drifted from the code.

## 3. Project memory file and preferences

- `CLAUDE.md` / `AGENTS.md`: add the "Working agreements" and "Project memory" blocks from the main
  skill's memory-file template (in `../praxisjs/references/`) if missing; move catalog-like content
  (component lists, rules, decisions) into the project memory with `praxisjs_memory_upsert` and keep
  the file to stack, entry points and constraints.
- `.praxisjs-ai.json`: keep it; ask about new preferences only if the init flow asks something it
  lacks.

## 4. Report

Tell the developer what changed (files, MCP config, memory format), which edited files were kept, and
what to commit (`.praxisjs-ai.lock.json`, skills, MCP config, `.praxis/`).
