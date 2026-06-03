# @praxisjs/mcp

## 0.3.0

### Minor Changes

- a0372af: Knowledge base expanded with `@praxisjs/css` documentation.

  The MCP server now surfaces the full `@praxisjs/css` reference — `Stylesheet`, `ReactiveStylesheet`, `@Styled()`, the fluent CSS builder, `@Param()`, `@Style()`, `keyframes()`, `globalStyle()`, `preflight()`, design tokens (`TokenSheet`, `@Themed`, `ThemeInstance`), `cx()`, and the `praxisjsCSS()` Vite plugin — via `praxisjs_get_page`, `praxisjs_full_docs`, and `praxisjs_overview`.

## 0.2.0

### Minor Changes

- 1d79aae: Initial release — MCP server (`praxisjs-mcp`) compatible with any MCP-capable AI assistant (Claude Code, Cursor, VS Code/Copilot, Windsurf). Four tools: `praxisjs_overview` (docs index), `praxisjs_get_page` (page by slug), `praxisjs_full_docs` (full reference), and `praxisjs_get_install_command` (generates correct CLI install commands without version pinning).
