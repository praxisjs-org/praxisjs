---
"praxisjs": minor
---

`praxisjs upgrade` also upgrades the `@morphos/*` packages and the `kosmesis` CLI a project already lists, with the same range rules as `@praxisjs/*`. It reads the peer dependencies of the releases it picks and holds back any upgrade that would break one (held back `@praxisjs/*` packages stay together), lists peer conflicts the project already had, and groups its output by ecosystem. In a Kosmesis project it ends by running the installed `kosmesis outdated` (0.5.0 or later) or printing the command to run.
