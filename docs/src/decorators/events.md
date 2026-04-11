---
title: Events & Slots
description: Communicate up the component tree with @Emit, receive children with @Slot, and trigger imperative actions with @OnCommand.
---

# Events & Slots

## `@Emit(propName)`

Binds a method and calls the named prop callback with its return value. Handles `this` binding automatically.

```tsx
@Component()
class SearchInput extends StatefulComponent {
  @Prop() onSearch?: (query: string) => void
  @State() value = ''

  @Emit('onSearch')
  handleSubmit() {
    return this.value  // passed to onSearch prop
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input value={() => this.value}
          onInput={(e) => { this.value = (e.target as HTMLInputElement).value }} />
        <button type="submit">Search</button>
      </form>
    )
  }
}

// Usage:
<SearchInput onSearch={(q) => console.log('searching:', q)} />
```

### Exposing the prop type without `@Prop`

If you don't use `@Prop` for the callback, declare the prop type with `declare` so it appears in JSX:

```tsx
@Component()
class Modal extends StatefulComponent {
  @Emit('onClose')
  handleClose() { /* ... */ }

  declare onClose: (() => void) | undefined  // makes onClose appear in <Modal> props
}
```

---

## `@Slot(name?)`

Declares a named slot. Returns the children distributed into that slot. Omit the name for the default slot.

```tsx
import type { Children } from '@praxisjs/shared'

@Component()
class Card extends StatefulComponent {
  @Slot() default!: Children
  @Slot('header') header?: Children
  @Slot('footer') footer?: Children

  render() {
    return (
      <div class="card">
        {this.header && <header>{this.header}</header>}
        <main>{this.default}</main>
        {this.footer && <footer>{this.footer}</footer>}
      </div>
    )
  }
}

// Usage:
<Card>
  <span slot="header">Title</span>
  <p>Body content</p>
  <span slot="footer">Footer text</span>
</Card>
```

---

## `@OnCommand(propName)`

Subscribes the decorated method to a `Command` prop — an imperative event bus for triggering component actions from the outside. Auto-unsubscribes on unmount.

```tsx
import { Command, createCommand } from '@praxisjs/decorators'

@Component()
class VideoPlayer extends StatefulComponent {
  @Prop() play?: Command
  @Prop() pause?: Command

  @OnCommand('play')
  handlePlay() {
    this.isPlaying = true
  }

  @OnCommand('pause')
  handlePause() {
    this.isPlaying = false
  }
}

// Usage:
const play = createCommand()
const pause = createCommand()

<VideoPlayer play={play} pause={pause} />

// Trigger from outside:
play.trigger()
pause.trigger()
```

### `Command<T>` with payload

```ts
const seek = createCommand<number>()
seek.trigger(45.2)  // seek to 45.2 seconds

// Subscribe manually:
seek.subscribe((time) => console.log('seek to', time))
```

<llm-only>
@Emit:
- Binds `this` to the method — it can be passed as a direct reference (e.g., onSubmit={this.handleSubmit})
- The return value of the method is passed as the argument to the prop callback
- The prop callback is optional — if not provided, the emit is a no-op

@Slot:
- @Slot() default — captures all children not assigned to a named slot
- @Slot('name') — captures children with slot="name" attribute
- Children type is from @praxisjs/shared

@OnCommand:
- Command is an imperative event bus — useful for triggering component behavior from a parent without prop drilling
- createCommand() returns a Command object with .trigger() and .subscribe() methods
- @OnCommand auto-subscribes on mount and unsubscribes on unmount
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
