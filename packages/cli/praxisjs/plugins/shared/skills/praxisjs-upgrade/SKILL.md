---
name: praxisjs-upgrade
description: Upgrade a project's @praxisjs/* packages and migrate code to the new APIs — praxisjs upgrade, praxisjs doctor, the docs changelog pages and migration sections. Use when the user wants to update PraxisJS, after an upgrade breaks something, or when code uses removed APIs (for example the accessor keyword or createAccessorDecorator).
---

# Upgrade and migrate PraxisJS

Follow the `praxisjs` skill's rules.

## 1. Before

- `praxisjs_inspect_project`: current `@praxisjs/*` versions (declared and installed).
- Make sure the working tree is committed, so the upgrade is one reviewable change.

## 2. Upgrade

```bash
npx praxisjs upgrade
```

It moves every `@praxisjs/*` dependency forward to its latest release and reinstalls. Never edit
version ranges by hand; add new packages with `praxisjs_get_install_command`.

Then `npx praxisjs doctor`: it flags `@praxisjs/*` versions that don't work together, tsconfig options
PraxisJS needs and incomplete AI integrations.

## 3. Migrate

1. For each package whose major or minor version changed, read its changelog page:
   `praxisjs_get_page({ page: "changelog/<package>" })` (`changelog/decorators`, `changelog/runtime`…),
   or `praxisjs_search_docs({ query: "<API> removed", includeChangelog: true })`.
2. Follow the migration sections the changelog links to (for example `advanced/custom-decorators` →
   "Migrating from createAccessorDecorator": `accessor` fields become plain fields, accessor decorators
   become `createFieldDecorator` with `setup`).
3. Find the affected code: `praxisjs_validate_file({ path: "src" })` reports `accessor`, removed core
   exports and misplaced decorators; search the code for the removed names.
4. Check each replacement with `praxisjs_api_reference` against the installed version.
5. Run typecheck, lint, tests and the build; fix everything before finishing.

## 4. After

- `npx praxisjs ai add` again refreshes these skills for the new APIs.
- Update the agent file's Stack section if packages were added or removed, and record a migration that
  changed project conventions (`praxisjs_memory_update` / `architecture` entry).
- `praxisjs_memory_map` catches entries whose exports changed.
