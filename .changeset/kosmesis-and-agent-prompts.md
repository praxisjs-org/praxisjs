---
"create-praxisjs": minor
"praxisjs": minor
---

Start projects with Kosmesis and with a ready-to-paste agent prompt.

- create-praxisjs asks "Add Kosmesis UI components?" (Tailwind CSS or `@praxisjs/css`), or takes `--kosmesis[=tailwind|praxisjs-css]` / `--no-kosmesis`, with every template and with Tauri v2. It runs `kosmesis init` without prompts through the package manager (`kosmesis@^0.6.0`) and adds `button` and `card`; when that fails it keeps the project and prints the commands to run later.
- New `praxisjs add kosmesis` sets Kosmesis up in an existing project (Tauri included): it detects the project, installs missing dependencies, runs `kosmesis init` (interactive in a terminal without flags, otherwise `--yes` with `--style-system`, `--components` and the `kosmesis init` flags) and prints the next steps.
- With an AI integration, create-praxisjs ends with a prompt that starts the project setup with the agent (PraxisJS MCP server, skills and docs, the memory bootstrap skill, folder structure and conventions). `praxisjs ai add`, `praxisjs ai sync` when it adds the MCP server, and `praxisjs add kosmesis` with an AI integration end with a prompt that maps the project into its memory. Both prompts are in the Quick Start.
- The skills no longer map an unmapped project on their own at session start: after `praxisjs_inspect_project`, they ask, with the `.praxisjs-ai.json` questions, whether the project is still the empty scaffold (`praxisjs_memory_init` only) or should be mapped (the `praxisjs-memory-bootstrap` skill), and save the answer as `memory` in `.praxisjs-ai.json`. The new-project setup prompt runs this checklist; the map prompt stays an explicit request to map.
