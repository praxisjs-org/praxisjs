# @verbose/motion

```sh
npm install @verbose/motion
```

Animation utilities based on signals: tweens, physics springs, and keyframe animations for DOM elements.

## Easings

All animation functions accept an `easing` option. Built-in easings:

```ts
import { easings } from '@verbose/motion'
// linear, easeIn, easeOut, easeInOut, easeInCubic, bounce, elastic
```

You can also pass a custom easing function `(t: number) => number` where `t` is in `[0, 1]`.

---

## Tween

### `tween(from, to, options?)`

Animates a number from `from` to `to` over a duration. Returns a reactive object backed by signals.

```ts
import { tween } from '@verbose/motion'

const anim = tween(0, 100, { duration: 500, easing: 'easeOut' })

anim.value.value    // current animated number
anim.playing.value  // true while animating
anim.progress.value // 0 → 1
anim.stop()
anim.reset()
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `300` | Duration in ms |
| `easing` | `Easing` | `'linear'` | Easing function or name |
| `delay` | `number` | `0` | Delay before starting |

**Returned object:**

| Property | Type | Description |
|----------|------|-------------|
| `value` | `Computed<number>` | Current interpolated value |
| `target` | `Signal<number>` | Destination value (set to re-animate) |
| `playing` | `Computed<boolean>` | Whether animation is running |
| `progress` | `Computed<number>` | 0–1 progress |
| `stop()` | `() => void` | Cancel animation |
| `reset()` | `() => void` | Jump back to `from` |

Animate to a new target reactively:

```ts
anim.target.set(200)  // smoothly animates from current value to 200
```

---

## Spring

### `spring(initial, options?)`

A physics-based spring that overshoots and oscillates naturally. Great for interactive gestures.

```ts
import { spring } from '@verbose/motion'

const pos = spring(0, { stiffness: 200, damping: 20 })

pos.value.value  // current position
pos.target.set(100)  // spring toward 100
pos.stop()
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stiffness` | `number` | `150` | Spring tension |
| `damping` | `number` | `15` | Resistance to motion |
| `mass` | `number` | `1` | Mass of the object |
| `precision` | `number` | `0.01` | Threshold to consider settled |

**Returned object:**

| Property | Type | Description |
|----------|------|-------------|
| `value` | `Computed<number>` | Current position |
| `target` | `Signal<number>` | Destination (set to start spring) |
| `stop()` | `() => void` | Stop spring |

---

## useMotion

### `useMotion(ref)`

Animates CSS properties of a DOM element using keyframe-style objects. Works with enter/exit animations.

```ts
import { createRef } from '@verbose/composables'
import { useMotion } from '@verbose/motion'

const boxRef = createRef<HTMLDivElement>()
const motion = useMotion(boxRef)

// Animate freely
motion.animate({
  opacity: [0, 1],
  x: [-20, 0],
  duration: 300,
  easing: 'easeOut',
})

// Enter animation (runs on mount)
motion.enter({
  opacity: [0, 1],
  scale: [0.9, 1],
  duration: 200,
})

// Exit animation
motion.exit({
  opacity: [1, 0],
  y: [0, 10],
  duration: 150,
  onComplete: () => console.log('exited'),
})
```

**Keyframe properties:**

| Property | Type | Description |
|----------|------|-------------|
| `opacity` | `[number, number]` | Fade in/out |
| `x` | `[number, number]` | Horizontal translate (px) |
| `y` | `[number, number]` | Vertical translate (px) |
| `scale` | `[number, number]` | Scale transform |
| `rotate` | `[number, number]` | Rotation (deg) |
| `duration` | `number` | Duration in ms |
| `easing` | `Easing` | Easing function or name |
| `delay` | `number` | Delay before start |
| `onComplete` | `() => void` | Callback when done |

---

## `@Animate` Decorator

Marks a `@State` property as animated, so changes transition smoothly instead of jumping.

```ts
import { Animate } from '@verbose/motion'

@Component()
class ProgressBar extends BaseComponent {
  @Animate
  @State() progress = 0

  render() {
    return <div style={{ width: `${this.progress}%` }} />
  }
}
```
