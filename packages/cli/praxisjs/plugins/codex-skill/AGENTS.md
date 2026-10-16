# [Project name]

## Working agreements
- Look up every PraxisJS API in the docs through the PraxisJS MCP server before writing code — never guess (use the praxisjs Codex skill)
- Before writing a component, composable, store, service, decorator or helper, run praxisjs_memory_check_duplicate and reuse what exists
- Extend PraxisJS with its decorator builders, Composable, store plugins and devtools plugins; never the `accessor` keyword
- Build UI from installed Kosmesis components, the Kosmesis registry (`npx kosmesis add`) and Morphos primitives before writing new ones
- Put files where conventions/project-structure says (praxisjs_scaffold); move misplaced code you touch
- Never hardcode version numbers in package.json — install packages via praxisjs_get_install_command or `praxisjs upgrade`
- Validate changed files with praxisjs_validate_file

## Stack
- PraxisJS [version] + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]
- Styling: [@praxisjs/css / plain / modules / tailwind / unocss / none]

## Architecture
[2–4 sentences: what the app does, how it's organized, main entry points]

## Project memory
Reusable code, business rules, decisions and conventions are in `.praxis/`, read and changed only
through the PraxisJS MCP server (`praxisjs_memory_*` tools). Never edit those files by hand.

## Known constraints
[Anything that would surprise a developer — auth, browser targets, env vars, etc.]
