import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import { Storable, Store, store, ReactiveStore } from "@praxisjs/store";
import type { StorePlugin } from "@praxisjs/store";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Log store (holds plugin events reactively) ───────────────────────────────

interface LogEntry { kind: "mutation" | "action"; label: string }

@Storable()
class LogStore extends ReactiveStore {
  @State() entries: LogEntry[] = [];

  add(entry: LogEntry) {
    this.entries = [...this.entries, entry];
  }

  clear() {
    this.entries = [];
  }
}

// ─── Logger plugin ────────────────────────────────────────────────────────────
// Pushes events into LogStore lazily (store() is called at runtime, not at
// definition time, so no circular initialization issue).

const loggerPlugin: StorePlugin = {
  name: "logger",
  onMutation({ key, value, prevValue }) {
    store(LogStore).add({
      kind: "mutation",
      label: `${key}: ${JSON.stringify(prevValue)} → ${JSON.stringify(value)}`,
    });
  },
  onAction({ name, args }) {
    const a = (args as unknown[]).map((x) => JSON.stringify(x)).join(", ");
    store(LogStore).add({ kind: "action", label: `${name}(${a})` });
  },
};

// ─── Counter store — plugin declared here ────────────────────────────────────

@Storable({ plugins: [loggerPlugin] })
class CounterStore extends ReactiveStore {
  @State() count = 0;
  @State() step = 1;

  @Computed()
  get doubled() { return this.count * 2; }

  increment() { this.count += this.step; }
  decrement() { this.count -= this.step; }
  reset() { this.count = 0; }
}

// ─── Components ───────────────────────────────────────────────────────────────

@Component()
class CounterControls extends StatefulComponent {
  @Store(CounterStore) counter!: CounterStore;

  render() {
    return (
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:2rem;font-weight:700;min-width:3ch;text-align:center">
          {() => this.counter.count}
        </span>
        <div style="display:flex;gap:6px">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.counter.increment(); }}
          >
            +{() => this.counter.step}
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.counter.decrement(); }}
          >
            −{() => this.counter.step}
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.88rem;color:#555"
            onClick={() => { this.counter.reset(); }}
          >
            Reset
          </button>
        </div>
        <label style="display:flex;align-items:center;gap:5px;font-size:.85rem;color:#555">
          Step
          <input
            type="number" min="1" max="10"
            style="width:50px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:5px;font-size:.85rem"
            value={() => this.counter.step}
            onInput={(e: Event) => { this.counter.step = Number((e.target as HTMLInputElement).value); }}
          />
        </label>
      </div>
    );
  }
}

@Component()
class PluginEventLog extends StatefulComponent {
  @Store(LogStore) log!: LogStore;

  render() {
    return (
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <p style="margin:0;font-size:.78rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">
            Plugin event log
          </p>
          <button
            style="font-size:.76rem;color:#9ca3af;border:none;background:none;cursor:pointer;padding:2px 6px"
            onClick={() => { this.log.clear(); }}
          >
            Clear
          </button>
        </div>
        <div style="background:#1e1e2e;border-radius:8px;padding:10px 12px;min-height:80px;max-height:220px;overflow-y:auto">
          {() => this.log.entries.length === 0
            ? <span style="color:#444;font-size:.8rem;font-family:monospace">— no events yet —</span>
            : [...this.log.entries].reverse().map((e) => (
              <div style={`font-family:monospace;font-size:.79rem;margin-bottom:3px;color:${
                e.kind === "mutation" ? "#a6e3a1" : "#89b4fa"
              }`}>
                [{e.kind}] {e.label}
              </div>
            ))
          }
        </div>
        <p style="margin:6px 0 0;font-size:.76rem;color:#9ca3af">
          <span style="color:#a6e3a1">[mutation]</span> state change &nbsp;
          <span style="color:#89b4fa">[action]</span> method called
        </p>
      </div>
    );
  }
}

@Component()
class LoggerPluginDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:380px">
        <div>
          <h3 style="margin:0 0 4px;font-size:.95rem">Logger plugin</h3>
          <p style="margin:0;font-size:.82rem;color:#6b7280">
            <code>loggerPlugin</code> is declared in <code>@Storable({"{ plugins: [loggerPlugin] }"})</code> on
            <code>CounterStore</code>. Every mutation and action is captured in a separate
            <code>LogStore</code> and rendered below.
          </p>
        </div>
        <CounterControls />
        <PluginEventLog />
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Store/Logger Plugin",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <LoggerPluginDemo />,
};
