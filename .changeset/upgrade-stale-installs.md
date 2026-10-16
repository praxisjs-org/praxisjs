---
"praxisjs": patch
---

`praxisjs upgrade` no longer holds Morphos back in a project an earlier upgrade left half installed. The peer checks used the version in `node_modules` even when it was outside the range `package.json` declares, so a stale `@morphos/core` 0.1.3 blocked every Morphos release that needs 0.1.6 and showed false "Already incompatible" notes. A copy outside its declared range is now ignored, since the install replaces it. Before an npm install, `upgrade` also deletes `node_modules/.package-lock.json`, npm's hidden lockfile, which still listed the folders it removes.
