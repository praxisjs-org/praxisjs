# Project memory (`.praxis/`)

`.praxis/` at the project root records what the project already has and how it is built. It is
versioned with the code and reviewed in pull requests. It exists so nobody writes a second date
picker, breaks a business rule, or puts files where they don't belong.

**Access it only through the MCP tools.** Never open, edit, create or delete files under `.praxis/`
yourself: the tools validate every entry, refuse secrets, write atomically, keep `index.md` in sync and
format files so diffs stay small. Every file carries a "Managed by the PraxisJS MCP server" header.

## What it holds

| Category | One entry per | Main fields |
|---|---|---|
| `components` | reusable UI component | `location`, `exports`, Purpose, API, Usage |
| `utilities` | composable, store, service, custom decorator, helper, stylesheet (`kind`) | `kind`, `location`, `exports`, Purpose, API, Usage |
| `business-rules` | domain rule | Rule, Rationale, Examples, `locations` where it is enforced |
| `architecture` | decision (ADR, numbered `0001-…`) | `status`, `date`, Context, Decision, Consequences |
| `conventions` | organization or coding rule (`conventions/project-structure` says where each kind of file lives) | `scope`, `paths`, Rule, Rationale, Examples |
| `glossary` | domain term | `aliases`, Definition |

Every entry also has `title`, a one-line `summary`, `tags` and `related` (`"category/id"`).

## When to use which tool

| Moment | Do |
|---|---|
| Start of a task | `praxisjs_memory_search` for the feature's words; read the matching conventions and business rules |
| Before creating any component, composable, store, service, decorator or helper | `praxisjs_memory_check_duplicate({ description, name })`; reuse or extend what it finds |
| Before placing a new file | `praxisjs_scaffold` (it follows `conventions/project-structure`) |
| After adding reusable code | `praxisjs_memory_add` (`components` or `utilities`) with purpose, API and usage |
| After changing reusable code's API or location | `praxisjs_memory_update` |
| After deleting reusable code | `praxisjs_memory_remove` |
| A domain rule came up in the task | `praxisjs_memory_add` in `business-rules` |
| An architecture choice was made | `praxisjs_memory_add` in `architecture` |
| A new folder or coding convention was agreed | `praxisjs_memory_update` on `conventions/project-structure`, or a new `conventions` entry |
| Memory missing (`praxisjs_inspect_project` says so) | the `praxisjs-memory-bootstrap` skill (`praxisjs_memory_bootstrap_plan`, `praxisjs_memory_upsert`) |
| Code moved, or memory looks out of date | `praxisjs_memory_map`; fix each stale entry it reports |
| A memory tool says the format is older | `praxisjs_memory_migrate` (dry run, then `{ dryRun: false }`) |

`praxisjs_memory_map({ record: true })` records every unrecorded item; undocumented ones are tagged
`unreviewed`. Complete them (`purpose`, `usage`) before relying on them. It also records installed
Kosmesis components (tag `kosmesis`) and keeps `conventions/ui-libraries` in line with the Morphos
and Kosmesis usage in the code.

`praxisjs_memory_upsert` writes many entries at once and is safe to re-run: it updates the entry that
matches (same id, same location and export, or same title), merges lists, and answers
`needs-confirmation` instead of rewriting text in a reviewed entry until you pass
`confirmRewrite: true` (after asking the developer).

The format is versioned (`schema` in `.praxis/index.md`). The tools refuse to write to an older format
until `praxisjs_memory_migrate` brought it up to date, and to a newer one until the server is updated.

## Writing good entries

- `summary`: what it is for, in one line ("Paginated table with sortable columns"), not its name again.
- `purpose`: when to use it and when not to.
- `api`: the props, arguments or public members someone needs to call it.
- `usage`: a short, real example.
- No secrets, tokens, credentials or private URLs: say where a value comes from (an env variable).
- Mention the memory in the project memory file (`CLAUDE.md` / `AGENTS.md`) once; don't copy entries there.
