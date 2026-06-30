---
"create-praxisjs": patch
---

Fix `npx create-praxisjs add` throwing `ENOENT` when installing the Claude or Codex skill integration. The `plugins/` directory was missing from the package's `files` field in `package.json`, so it wasn't included in the published npm tarball.
