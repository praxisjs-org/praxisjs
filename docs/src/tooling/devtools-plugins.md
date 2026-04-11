---
title: DevTools Plugins
description: How to create and register custom plugins to extend the DevTools panel with new tabs.
---

# DevTools Plugins

The DevTools panel is extensible — each tab is a plugin, including the three built-in ones. You can add new tabs, replace existing ones, or strip the panel down to only what you need.

## Built-in plugins

The default panels are exported individually:

```ts
import { SignalsPlugin, ComponentsPlugin, TimelinePlugin } from '@praxisjs/devtools'
```

## Replacing the default plugins

Pass a `plugins` array to `DevTools.init()` to control which tabs are shown:

```ts
import { DevTools, SignalsPlugin, TimelinePlugin } from '@praxisjs/devtools'

// Only Signals and Timeline, no Components panel
DevTools.init({
  plugins: [SignalsPlugin, TimelinePlugin]
})
```

## Registering a plugin after init

Use `DevTools.registerPlugin()` to add a plugin at any point after initialization. If a plugin with the same `id` is already registered, the call is a no-op.

```ts
import { DevTools } from '@praxisjs/devtools'

DevTools.registerPlugin(MyCustomPlugin)
```

## Creating a custom plugin

A plugin is a plain object with four fields:

```ts
import type { DevtoolsPlugin, Registry } from '@praxisjs/devtools'
import { Component } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class NetworkTab extends StatefulComponent {
  render() {
    return <div>My network metrics...</div>
  }
}

export const NetworkPlugin: DevtoolsPlugin = {
  id: 'network',       // unique identifier — used to prevent duplicates
  label: 'Network',    // text shown on the tab

  // setup() is called once when the plugin is registered.
  // Use it to subscribe to Registry events or configure side effects.
  setup(registry: Registry) {
    registry.bus.on('timeline:push', (entry) => {
      // react to any timeline event
    })
  },

  // component is the class rendered inside the tab
  component: NetworkTab,
}
```

**Interface:**

```ts
interface DevtoolsPlugin {
  id: string
  label: string
  setup?: (registry: Registry) => void
  component: ComponentElement
}
```

## Using the Registry

`Registry` is a singleton that holds all DevTools data. Inside `setup()` you receive it as an argument. Anywhere else, access it via `DevTools.registry`:

```ts
import { DevTools } from '@praxisjs/devtools'

const registry = DevTools.registry

// Read current data snapshots
registry.getSignals()     // SignalEntry[]
registry.getComponents()  // ComponentEntry[]
registry.getTimeline()    // TimelineEntry[]

// Subscribe to real-time events
registry.bus.on('signal:changed', ({ entry, oldValue }) => { ... })
registry.bus.on('component:render', (entry) => { ... })
registry.bus.on('timeline:push', (entry) => { ... })
```

**Available event bus events:**

| Event                 | Payload                                  |
|-----------------------|------------------------------------------|
| `signal:registered`   | `SignalEntry`                            |
| `signal:changed`      | `{ entry: SignalEntry, oldValue }`       |
| `component:registered`| `ComponentEntry`                         |
| `component:render`    | `ComponentEntry`                         |
| `component:unmount`   | `ComponentEntry`                         |
| `lifecycle`           | `{ componentId, name, hook }`            |
| `timeline:push`       | `TimelineEntry`                          |

<llm-only>
Plugin facts:
- DevtoolsPlugin interface: { id: string, label: string, setup?: (registry: Registry) => void, component: ComponentElement }
- DevTools.registerPlugin() is idempotent — ignores duplicate ids
- setup() is called once at registration time with the Registry singleton
- DevTools.registry === Registry.instance (same singleton)
- Registry.getSignals() / getComponents() / getTimeline() return snapshots (arrays)
- Registry.bus is an EventBus — subscribe with bus.on(event, handler)
- Built-in plugins: SignalsPlugin, ComponentsPlugin, TimelinePlugin
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
