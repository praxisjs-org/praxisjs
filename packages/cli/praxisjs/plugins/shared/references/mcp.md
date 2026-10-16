# The PraxisJS MCP server

`@praxisjs/mcp` gives the agent the PraxisJS docs, the project's structure and the project memory.
Every PraxisJS skill depends on it. If its tools (`praxisjs_*`) are not available, stop and help the
developer connect it before writing PraxisJS code.

## Connecting it

| Agent | What `praxisjs ai add` sets up | Manual setup |
|---|---|---|
| Claude Code | `.mcp.json` at the project root with a `praxisjs` server, and `"enabledMcpjsonServers": ["praxisjs"]` in `.claude/settings.json` | `claude mcp add --scope project praxisjs -- npx -y @praxisjs/mcp` |
| Codex | `.codex/config.toml` at the project root with `[mcp_servers.praxisjs]` (Codex reads project config only in trusted projects) | `codex mcp add praxisjs -- npx -y @praxisjs/mcp` (global) |
| Cursor, VS Code, Windsurf | nothing | see https://praxisjs.org/docs/tooling/mcp |

Checks when the tools are missing:

- Claude Code: run `/mcp`. A server waiting for approval shows as pending: approve it. A failed one
  usually means `npx` cannot reach the registry; `npm install -D @praxisjs/mcp` and point the command
  at `./node_modules/.bin/praxisjs-mcp` instead.
- Codex: the project must be trusted for `.codex/config.toml` to load; otherwise add the server
  globally with `codex mcp add`.
- `npx praxisjs doctor` reports a missing or incomplete MCP configuration.

The server works on one project. It takes the root from `PRAXISJS_PROJECT_ROOT`, then
`CLAUDE_PROJECT_DIR` (set by Claude Code), then the folder the client announces, then its working
directory, and walks up to the nearest `package.json`. `praxisjs_inspect_project` prints the root it
uses: if it is wrong, set `PRAXISJS_PROJECT_ROOT` in the server's `env`.

## Tools

| Need | Tool |
|---|---|
| Find the page for a topic, or check PraxisJS already covers something | `praxisjs_search_docs({ query })` |
| Read a page | `praxisjs_get_page({ page: "essentials/components" })` |
| The docs index / everything at once | `praxisjs_overview`, `praxisjs_full_docs` (large) |
| Morphos or Kosmesis docs | any docs tool with `library: "morphos"` or `library: "kosmesis"` |
| One export: package, kind, installed signature, docs section (Morphos exports too) | `praxisjs_api_reference({ symbol: "Debounce" })` |
| Kosmesis components: registry, installed, outdated, edited | `praxisjs_ui_components({ query, installed })` |
| Every decorator / composable / component, with signatures | `praxisjs_list_apis({ kind, package, signatures })` |
| Install a `@praxisjs/*` package | `praxisjs_get_install_command({ packages, manager, dev })` |
| What the project has: versions, pages, components, stores, routes, layout | `praxisjs_inspect_project` |
| Check a file (or folder) against PraxisJS rules | `praxisjs_validate_file({ path })` |
| Where a new file goes and how it starts | `praxisjs_scaffold({ kind, name })` |
| "Is there already something that does X?" | `praxisjs_memory_check_duplicate({ description, name })` |
| Read the project memory | `praxisjs_memory_search`, `praxisjs_memory_list`, `praxisjs_memory_get` |
| Change the project memory | `praxisjs_memory_add`, `praxisjs_memory_update`, `praxisjs_memory_remove`, `praxisjs_memory_upsert` (many at once, dry run) |
| Set up / sync the project memory with the code | `praxisjs_memory_init`, `praxisjs_memory_bootstrap_plan`, `praxisjs_memory_map` |
| Bring an older `.praxis/` to the current format | `praxisjs_memory_migrate` (dry run by default) |

## Without the server

Only while the developer connects it, read the docs from the website instead of guessing:
`https://praxisjs.org/llms.txt` (index) and `https://praxisjs.org/llms.mdx/docs/<slug>/content.md`
(one page as Markdown); Morphos and Kosmesis publish the same files at `https://morphos.praxisjs.org`
and `https://kosmesis.praxisjs.org`. The project memory has no fallback: never read or write
`.praxis/` by hand.

An outdated setup (old skills, old or misplaced MCP configuration) is updated with
`npx praxisjs ai sync`: see the `praxisjs-ai-setup` skill.
