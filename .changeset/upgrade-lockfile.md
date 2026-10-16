---
"praxisjs": patch
---

`praxisjs upgrade` installs the upgraded packages reliably. With npm it first drops the `@praxisjs/*`, `@morphos/*` and `kosmesis` entries (and their folders) from `package-lock.json`, whose old releases pinned exact versions of each other and made the install fail; every other dependency keeps its locked version. On Windows the package manager now runs through a shell (it is a `.cmd` script, so the install used to fail every time), and a failed install shows the end of the package manager's output. When `package.json` is already up to date but `node_modules` doesn't match it, which is what an earlier upgrade that failed to install leaves behind, `upgrade` lists the packages and installs again instead of stopping at "Nothing to upgrade".
