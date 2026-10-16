---
"create-praxisjs": minor
---

Add a Tauri v2 desktop option that combines with every template: a "Desktop app with Tauri v2?" prompt, plus `--tauri` / `--no-tauri` flags for non-interactive use. The scaffolder runs the official Tauri CLI (`tauri init`) through the user's package manager, then patches `tauri.conf.json`, `package.json` scripts and dependencies, `vite.config.ts`, `.gitignore` and `README.md`, and adds a `Greet` component that calls a Rust command with `invoke()`. A missing Rust toolchain or a failing Tauri CLI leaves a working web project with instructions. Unknown command-line options are now rejected.
