---
title: Motion
description: "@praxisjs/motion — signal-driven animations via @Tween and @Spring field decorators. Assigning a value triggers a smooth animated transition."
---

# Motion

Animated field decorators. Assign a value and the transition plays automatically — no imperative API needed.

::: code-group

```sh [npm]
npm install @praxisjs/motion
```

```sh [pnpm]
pnpm add @praxisjs/motion
```

```sh [yarn]
yarn add @praxisjs/motion
```

```sh [bun]
bun add @praxisjs/motion
```

:::

## `@Tween(options?)`

Animates a numeric field from its current value to any new assignment using a duration-based tween.

```tsx
import { Tween } from '@praxisjs/motion'

@Component()
class ProgressBar extends StatefulComponent {
  @Tween({ duration: 600, easing: 'easeOut' })
  progress = 0

  load() {
    this.progress = 100  // smoothly animates to 100
  }

  render() {
    return (
      <div
        class="bar"
        style={() => ({ width: `${this.progress}%` })}
      />
    )
  }
}
```

Reading the field returns the current interpolated value. Assigning starts a new animation from where it currently is.

<StorybookLink story="ecosystem-motion-tween--tween-story" label="Live demo — @Tween" />

| Option | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | `300` | Animation duration in ms |
| `easing` | `Easing` | `'easeOut'` | Easing function or name |
| `delay` | `number` | `0` | Delay before starting in ms |

---

## `@Spring(options?)`

Physics-based spring animation. Assigning a value lets the field settle naturally with momentum and overshoot.

```tsx
import { Spring } from '@praxisjs/motion'

@Component()
class DragHandle extends StatefulComponent {
  @Spring({ stiffness: 0.2, damping: 0.7 })
  x = 0

  @Spring()
  y = 0

  onPointerMove(e: PointerEvent) {
    this.x = e.clientX
    this.y = e.clientY
  }

  render() {
    return (
      <div
        class="handle"
        style={() => ({ transform: `translate(${this.x}px, ${this.y}px)` })}
        onPointermove={(e) => this.onPointerMove(e)}
      />
    )
  }
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `stiffness` | `number` | `0.15` | Spring strength — higher = snappier. Must be greater than `0`. |
| `damping` | `number` | `0.8` | Resistance — lower = more bounce |
| `mass` | `number` | `1` | Object mass — higher = more inertia |
| `precision` | `number` | `0.001` | Settlement threshold |

::: warning Validation
`stiffness` must be greater than `0`. Passing `0` or a negative value throws an error.
:::

<StorybookLink story="ecosystem-motion-spring--spring-story" label="Live demo — @Spring" />

---

## Easings

Available easing names for `@Tween`:

```ts
'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'easeInCubic' | 'bounce' | 'elastic'
```

Passing an unrecognised name throws an error listing the valid options.

Custom easing: pass any `(t: number) => number` function where `t` is in `[0, 1]`:

```ts
@Tween({ easing: (t) => t * t * t, duration: 400 })
scale = 1
```

<llm-only>
Motion facts:
- @Tween and @Spring are field decorators from '@praxisjs/motion' — they replace the field with a getter/setter
- Reading the field returns the current animated value (a number) — reactive, use inside arrow functions in JSX
- Assigning to the field sets the target and starts the animation from the current value
- @Tween uses requestAnimationFrame with a fixed duration; @Spring uses a physics simulation per frame
- Spring defaults are tuned for UI: stiffness=0.15, damping=0.8 (not the large values from CSS spring libraries)
- TweenOptions type from '@praxisjs/motion', SpringOptions type from '@praxisjs/motion'
- tween(), spring() are internal — not in the public API
- There is no useMotion() or @Animate() — only @Tween and @Spring decorators
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
