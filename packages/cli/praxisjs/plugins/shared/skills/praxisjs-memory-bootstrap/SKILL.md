---
name: praxisjs-memory-bootstrap
description: Initialize the PraxisJS project memory (.praxis/) with a thorough analysis of the whole project, run as parallel focused passes (UI components, utilities and stores, routes and pages, business rules, architecture and data flow, conventions, dependencies including Morphos/Kosmesis, tests and tooling) and recorded through the PraxisJS MCP server. Use the first time an agent works in a PraxisJS project, when .praxis/ is missing or nearly empty, or when the user asks to analyze or document the project. Safe to re-run.
---

# Bootstrap the project memory

Follow the `praxisjs` skill's rules. Reference: `../praxisjs/references/project-memory.md`.

**Everything is written through the MCP tools** (`praxisjs_memory_upsert`, `praxisjs_memory_*`).
Never read, create or edit files under `.praxis/` yourself, and never in a subagent either.

## 1. Prepare

1. `praxisjs_inspect_project`: the project, its layout and whether the memory exists.
2. No memory: `praxisjs_memory_init` (creates `.praxis/`, records `conventions/project-structure` and,
   with Morphos/Kosmesis, `conventions/ui-libraries`). An older format: `praxisjs_memory_migrate` (dry
   run, then `{ dryRun: false }`).
3. `praxisjs_memory_bootstrap_plan`: what the memory already has, and eight focused passes, each with
   its goal, the files to read and the categories it writes.
4. Tell the developer the analysis is starting and roughly how many files it covers.

## 2. Run the passes

**With subagents** (Claude Code's Task tool, or your agent's equivalent): start one subagent per pass,
in parallel. Give each one: the pass section of the plan (goal, files, categories, steps), these
rules, and "write only through praxisjs_memory_upsert; return a summary of what you recorded and the
questions you could not answer".

**Without subagents:** run the passes one after another yourself, in the plan's order.

Every pass:

- Reads the listed files (and what they import, when needed); records only what the code shows.
- Searches before writing (`praxisjs_memory_search`) and writes with `praxisjs_memory_upsert`:
  first `{ dryRun: true }`, then for real. Matching entries are updated, not duplicated.
- Links every entry to its source: `location` (+ `exports`) for code, `locations` for rules, `paths`
  for conventions.
- Writes good entries: a one-line `summary` of what it is for, `purpose` (when to use it and when
  not), `api`, a real `usage`.
- Never stores secrets, credentials or private URLs.
- Ends with a short summary: entries added / updated, and open questions.

## 3. Re-runs and conflicts

- Re-running is safe: unchanged entries stay unchanged, lists are merged, and entries tagged
  `unreviewed` are completed freely.
- An upsert answering `needs-confirmation` would rewrite text people wrote (a title, summary or
  section of a reviewed entry). Collect these, show the developer old vs new, and pass
  `confirmRewrite: true` only for what they approve. Ask before any large rewrite.
- `praxisjs_memory_map` afterwards: stale entries (moved or deleted code) are updated or removed, and
  anything reusable still unrecorded is added.

## 4. Report

Merge the passes' summaries into one message for the developer:

- What was recorded per category (counts and the most important entries).
- Gaps and questions: business rules that could not be inferred, ambiguous ownership, conventions the
  code contradicts, third-party code that duplicates a PraxisJS/Morphos/Kosmesis feature.
- That `.praxis/` should be committed, and how to keep it current (the `praxisjs-memory` skill).
