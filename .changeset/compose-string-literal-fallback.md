---
"@praxisjs/decorators": patch
"create-praxisjs": patch
---

`@Compose` now accepts string literals as constructor arguments directly, without requiring an intermediate instance property.

Previously, every string argument was unconditionally resolved as a property name on the component instance — passing `@Compose(KeyCombo, 'ctrl+s')` would look up `instance['ctrl+s']`, return `undefined`, and crash at runtime.

Now the resolution falls back to the literal string when no matching property exists on the instance. A new `getter(propName)` helper is also exported for composables that need a live getter instead of a snapshot value:

```tsx
import { getter } from '@praxisjs/decorators'

@Compose(TimeAgo, getter('postedAt'))  // passes () => this.postedAt — reactive
timeAgo!: TimeAgo
```

Now the resolution falls back to the literal string when no matching property exists on the instance:

```ts
// before — required a workaround property
readonly saveCombo = "ctrl+s";
@Compose(KeyCombo, "saveCombo") save!: KeyCombo;

// after — works directly
@Compose(KeyCombo, "ctrl+s") save!: KeyCombo;
@Compose(MediaQuery, "(max-width: 768px)") mobile!: MediaQuery;
```

Property-name resolution (used for forwarding refs like `@Compose(ElementSize, 'containerRef')`) is unchanged — if the named property exists on the instance, its value is used.
