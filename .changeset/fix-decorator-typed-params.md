---
"@praxisjs/decorators": patch
"@praxisjs/concurrent": patch
---

Fix method decorators rejecting typed parameters

`createMethodDecorator` used `unknown[]` for the method value type, which caused TypeScript to reject decorated methods with typed parameters (e.g. `async loadUser(id: number)`). Changed to `any[]` so the decorator accepts any async method signature. Updated the `Task`, `Queue`, and `Pool` decorator casts in `@praxisjs/concurrent` accordingly.
