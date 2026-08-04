---
"create-praxisjs": patch
---

Fix the **blog** template's `vite.config.ts` plugin order: `contentPlugin()` now runs before `praxisjs()`.

Both plugins run with `enforce: "pre"`, and Vite preserves relative order within that tier. With `praxisjs()` first, its decorator lowering stripped `@Collection('./path/*.md')` down to a plain `Collection('./path/*.md')` call before `contentPlugin()`'s regex transform ever saw the `@` — so the glob string reached `@praxisjs/content` unexpanded, and `getCollection()` iterated the string's individual characters as if they were files, producing one broken entry per character instead of the real posts.
