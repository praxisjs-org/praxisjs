---
"create-praxisjs": patch
"@praxisjs/di": minor
---

Remove reflect-metadata dependency and implement TC39-compatible metadata storage

The DI container now uses WeakMaps for storing constructor and property dependency metadata instead of relying on the reflect-metadata polyfill. This reduces external dependencies while maintaining full API compatibility. New helpers `setConstructorDeps` and `setPropDep` are exported for manual metadata management when needed.
