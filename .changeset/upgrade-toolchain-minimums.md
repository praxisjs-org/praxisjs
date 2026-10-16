---
"praxisjs": patch
---

`praxisjs upgrade` checks Node.js (`^20.19.0 || >=22.12.0`) and npm (`11.6.0`) against minimums before installing, instead of reacting to one npm error. An older Node.js is reported with a link to nodejs.org; an older npm makes it ask to update npm first, to the newest release the running Node.js supports (`npm@latest` now needs Node.js 22.22 or later). When the install fails, it says which of the two to update.
