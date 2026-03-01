# Component Anatomy

A PraxisJS component is a TypeScript class that extends `BaseComponent`. This guide walks through each part of a component and how they connect.

## Overview

```tsx
import {
  Component,
  Prop,
  State,
  Watch,
  Emit,
  Slot,
  OnCommand,
  Command,
  createCommand,
} from "@praxisjs/decorators";
import { BaseComponent, resource } from "@praxisjs/core";

@Component()
class UserCard extends BaseComponent {
  // ── Props ──────────────────────────────────────────────────────────────
  @Prop() userId!: number;
  @Prop() elevated = false;
  @Prop() onSave?: (user: User) => void;
  @Prop() refresh?: Command;

  // ── Local state ─────────────────────────────────────────────────────────
  @State() editing = false;
  @State() name = "";

  // ── Async data ──────────────────────────────────────────────────────────
  user = resource(async () => {
    const res = await fetch(`/api/users/${this.userId}`);
    return res.json() as Promise<User>;
  });

  // ── Watchers ─────────────────────────────────────────────────────────────
  @Watch("editing")
  onEditingChange(next: boolean) {
    if (next) this.name = this.user.data()?.name ?? "";
  }

  // ── Inbound commands ─────────────────────────────────────────────────────
  @OnCommand("refresh")
  handleRefresh() {
    this.user.refetch();
  }

  // ── Emitted events ───────────────────────────────────────────────────────
  @Emit("onSave")
  save() {
    return { ...this.user.data(), name: this.name };
  }

  // ── Slots ────────────────────────────────────────────────────────────────
  @Slot("actions") actions!: Children;
  @Slot() default!: Children;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  onMount() {
    console.log("UserCard mounted, userId:", this.userId);
  }

  onUnmount() {
    console.log("UserCard unmounted");
  }

  // ── Render ───────────────────────────────────────────────────────────────
  render() {
    const { data, pending, error } = this.user;

    if (pending()) return <div class="skeleton" />;
    if (error()) return <div class="error">{(error() as Error).message}</div>;

    return (
      <div class={`card ${this.elevated ? "elevated" : ""}`}>
        <header>
          {this.editing ? (
            <input
              value={this.name}
              onInput={(e) => {
                this.name = (e.target as HTMLInputElement).value;
              }}
            />
          ) : (
            <h2>{data()?.name}</h2>
          )}
        </header>

        <main>{this.default}</main>

        <footer>
          {this.editing ? (
            <button onClick={() => this.save()}>Save</button>
          ) : (
            <button
              onClick={() => {
                this.editing = true;
              }}
            >
              Edit
            </button>
          )}
          {this.actions}
        </footer>
      </div>
    );
  }
}
```

---

## Each part explained

### 1. `@Component`

Registers the class as a component and defines metadata.

```ts
@Component()
class UserCard extends BaseComponent {}
```

- Every component class extends `BaseComponent`

---

### 2. Props — `@Prop()`

Props are values received from the parent. The decorated property value is the **local default** — the parent always takes priority.

```ts
@Prop() userId!: number            // required (parent always provides)
@Prop() elevated = false           // optional with default
@Prop() onSave?: (u: User) => void // callback prop
@Prop() refresh?: Command          // imperative command prop
```

Props are read directly as `this.propName` — the `@Prop()` decorator creates a getter on the instance that reads the parent value with a fallback to the local default:

```tsx
render() {
  return <div class={this.elevated ? 'elevated' : ''} />
}
```

---

### 3. Local state — `@State()`

Internal component state. Each `@State` property is a signal; any assignment schedules a re-render.

```ts
@State() editing = false
@State() name = ''
```

Direct read and write:

```ts
this.editing; // reads current value
this.editing = true; // updates and schedules re-render
```

---

### 4. Async data — `resource`

Manages data fetching with reactive `pending`, `error`, and `data` state. Re-executes whenever any signal read inside the fetcher changes.

```ts
user = resource(async () => {
  const res = await fetch(`/api/users/${this.userId}`);
  return res.json();
});
```

In the template:

```tsx
if (this.user.pending()) return <Spinner />;
if (this.user.error()) return <Error />;
return <h2>{this.user.data()?.name}</h2>;
```

Manual actions:

```ts
this.user.refetch(); // re-trigger the fetcher
this.user.cancel(); // abort the in-flight request
this.user.mutate({ name: "x" }); // optimistic update
```

---

### 5. Watchers — `@Watch`

Runs a method whenever one or more `@State` / `@Prop` properties change.

```ts
@Watch('editing')
onEditingChange(next: boolean, prev: boolean) {
  if (next) this.name = this.user.data()?.name ?? ''
}
```

Multiple properties at once:

```ts
@Watch('firstName', 'lastName')
onNameChange(vals: { firstName: string; lastName: string }) {
  this.fullName = `${vals.firstName} ${vals.lastName}`
}
```

---

### 6. Inbound commands — `@OnCommand`

Subscribes to a `Command` prop, executing the method when the parent calls `command.trigger()`. Automatically unsubscribes on unmount.

```ts
@Prop() refresh?: Command

@OnCommand('refresh')
handleRefresh() {
  this.user.refetch()
}
```

In the parent:

```ts
const refreshCmd = createCommand()
<UserCard refresh={refreshCmd} />
refreshCmd.trigger()  // calls handleRefresh
```

---

### 7. Emitted events — `@Emit`

Binds the method and calls the named prop callback with the return value. Ensures correct `this` binding.

```ts
@Prop() onSave?: (user: User) => void

@Emit('onSave')
save() {
  return { ...this.user.data(), name: this.name }
  // return value is passed to this.onSave(...)
}
```

In the parent:

```tsx
<UserCard onSave={(user) => console.log("saved:", user)} />
```

---

### 8. Slots — `@Slot`

Allows distributing content into the component. An unnamed slot receives direct children with no `slot` attribute.

```ts
@Slot('actions') actions!: Children  // matched by <div slot="actions">
@Slot() default!: Children           // children without slot=""
```

In the parent:

```tsx
<UserCard userId={1}>
  <p>This goes into the default slot</p>
  <div slot="actions">
    <button>Delete</button>
  </div>
</UserCard>
```

---

### 9. Lifecycle

Override lifecycle methods directly on the class.

| Method                 | When it runs                                   |
| ---------------------- | ---------------------------------------------- |
| `onBeforeMount()`      | Before first render                            |
| `onMount()`            | After first DOM insertion                      |
| `onBeforeUpdate(prev)` | Before props are applied (synchronous)         |
| `onUpdate(prev)`       | After props are applied, before DOM commit     |
| `onAfterUpdate(prev)`  | After DOM update (async, via `queueMicrotask`) |
| `onUnmount()`          | When removed from DOM                          |
| `onError(err)`         | On uncaught error inside the component         |

```ts
onMount() {
  this._timerId = setInterval(() => this.tick(), 1000)
}

onUnmount() {
  clearInterval(this._timerId)
}
```

---

### 10. Render

The only required method. Must return a `VNode` or `null`. Re-executes reactively whenever any signal read inside it changes.

```tsx
render() {
  // Signal reads here create reactive dependencies
  const { data, pending } = this.user

  return (
    <div>
      {() => pending() ? <Spinner /> : <h2>{data()?.name}</h2>}
    </div>
  )
}
```

::: tip
Prefer reading `@State` and `@Prop` values directly inside `render()` rather than storing them in variables outside — this ensures the reactive tracking works correctly.
:::

---

## Data flow

```
      Parent
        │
   @Prop / Command
        │
        ▼
  ┌─────────────┐
  │  Component  │
  │             │
  │  @State ◄───┼── @Watch
  │  resource   │
  │  @Slot ◄────┼── children from parent
  │             │
  └──────┬──────┘
         │
    render() ──► DOM
         │
    @Emit / callback props
         │
         ▼
      Parent
```

---

## Composing with external utilities

```tsx
import { createRef, useElementSize } from "@praxisjs/composables";
import { tween } from "@praxisjs/motion";

@Component()
class AnimatedPanel extends BaseComponent {
  ref = createRef();
  size = useElementSize(this.ref);
  opacity = tween(0, 1, { duration: 400 });

  onMount() {
    this.opacity.target.set(1);
  }

  render() {
    return (
      <div
        ref={this.ref}
        style={() => ({ opacity: String(this.opacity.value()) })}
      >
        <p>Width: {() => `${this.size.width()}px`}</p>
      </div>
    );
  }
}
```
