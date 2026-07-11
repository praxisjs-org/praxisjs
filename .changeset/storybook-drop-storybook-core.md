---
"@praxisjs/storybook": patch
---

Removed the `@storybook/core` dependency and peer dependency. It never published a Storybook 9/10 release, so it dragged in a stale `@storybook/theming@8.6.18` (via its own `@storybook/core@8.6.18` sub-dependency) that peer-requires `storybook@^8.x`, conflicting with this repo's `storybook@10.4.0` and pinning `esbuild` below what `vite@8.1.4` requires.

`src/render.ts` and `src/types.ts` now import `RenderContext`, `WebRenderer`, `ComponentAnnotations`, and `StoryAnnotations` from `storybook/internal/types` and `storybook/internal/csf` instead — the same types, re-exported directly from the `storybook` package since Storybook 9 folded `@storybook/core`'s contents into it. No change to `Meta`, `StoryObj`, or any other public export.
