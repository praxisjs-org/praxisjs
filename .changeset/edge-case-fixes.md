---
"@praxisjs/core": patch
"@praxisjs/decorators": patch
"@praxisjs/runtime": patch
"@praxisjs/vite-plugin": patch
"@praxisjs/router": patch
---

Edge-case fixes in the new fast paths. `@praxisjs/vite-plugin` keeps a claimed field's initializer in the field's own scope instead of moving it into the constructor, where a constructor parameter or local of the same name shadowed what it read (and `new.target` fields are claimed too). `selector()` from `@praxisjs/core` compares against the current source value when read outside an effect, also inside a batch or an event handler before its subscribers are notified. `@praxisjs/runtime` keeps updating a hydrated element through a reactive child that fills it alone, rebuilds compiled templates when `render()` runs with another global document (a new SSG window), and always writes `open`, `selectedIndex`, media and scroll props from reactive bindings so a re-run restores what the user changed. Compiled templates keep the leading whitespace of JSX text (`{v} / {m}` lost its first space) and keep tabs inside a line, as the JSX transform does. Methods of `@Bind`, `@Emit` and the other built-in method decorators can be spied on with `vi.spyOn(instance, name)` before their first read again. `@praxisjs/router`'s `Link` removes its `class` attribute when it stops being active instead of leaving `class=""`.
