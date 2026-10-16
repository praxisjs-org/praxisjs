---
name: praxisjs-memory
description: Use and maintain the PraxisJS project memory (.praxis/, managed only through the PraxisJS MCP server) — reusable components and utilities, business rules, architecture decisions, conventions and glossary. Use at the start of a task, before creating anything reusable, after adding or moving code, or when the user asks what exists, why something is the way it is, or to document a rule or decision.
---

# Use the project memory

Full reference: `../praxisjs/references/project-memory.md`.

**Only through the MCP tools.** Never read, write, create or delete files under `.praxis/` directly,
even to "just fix a typo": use `praxisjs_memory_*`.

## Set up

1. `praxisjs_inspect_project` tells whether the memory exists.
2. If not, run the `praxisjs-memory-bootstrap` skill: a full analysis of the project in parallel
   passes, recorded through `praxisjs_memory_upsert`. For a quick start instead:
   `praxisjs_memory_init`, then `praxisjs_memory_map({ record: true })` and complete every entry tagged
   `unreviewed` (`praxisjs_memory_update` with a real `summary`, `purpose`, `api`, `usage`).
3. A memory tool says the format is older: `praxisjs_memory_migrate` (dry run first, see the
   `praxisjs-ai-setup` skill).
4. Tell the developer `.praxis/` was created and should be committed.

## During a task

- **Start:** `praxisjs_memory_search` with the feature's words; read the business rules and conventions
  that match and follow them.
- **Before writing anything reusable:** `praxisjs_memory_check_duplicate({ description, name })`.
- **Placing files:** `praxisjs_scaffold` (it applies `conventions/project-structure`).
- **After:** record what you added (`praxisjs_memory_add`), changed (`praxisjs_memory_update`) or
  deleted (`praxisjs_memory_remove`). Rules and decisions that came up in the conversation are entries
  too (`business-rules`, `architecture`, `conventions`, `glossary`).
- **When code moved:** `praxisjs_memory_map` lists stale entries and where the code is now; update them.

## Quality bar

- One entry per reusable thing; no entries for pages or one-off code.
- `summary` says what it is for in one line; `purpose` says when to use it (and when not to).
- No secrets, credentials or private URLs (the tools refuse them).
- Ask before removing entries the user didn't ask about, unless the code they describe is gone.
