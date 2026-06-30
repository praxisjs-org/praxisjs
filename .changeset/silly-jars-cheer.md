---
"@praxisjs/jsx": patch
---

Audit every attribute in `dom-types.ts` for `Reactive<T>` coverage. The runtime has always accepted a zero-argument function for any JSX attribute, but many attributes (all 30 previously-static `aria-*` attributes, `role`, global attributes like `slot`/`accessKey`/`popover`, and dozens of per-element attributes across `AnchorHTMLAttributes`, `InputHTMLAttributes`, `TableHTMLAttributes`, etc.) weren't typed as `Reactive<T>`, so passing a function for them was a type error even though it worked at runtime. This also fixes several same-attribute inconsistencies between interfaces (e.g. `href`/`target`/`value`/`max`/`src`/`width`/`height`/`dateTime` were reactive in some elements but not others). Attributes that are genuinely one-shot or static by browser spec (`autoFocus`, `autoPlay`, `defaultValue`, `defaultChecked`, `is`, `nonce`, `xmlns`) are intentionally left as-is.
