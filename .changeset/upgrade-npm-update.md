---
"praxisjs": patch
---

`praxisjs upgrade` offers to update npm when its install crashes with `Cannot read properties of null (reading 'edgesOut')`, a peer resolution bug of npm before 11.6.0. It says which npm you have, asks to run `npm install --global npm@latest` and installs again; outside a terminal it prints the command. The install and the npm update no longer block the CLI, so their spinners keep moving.
