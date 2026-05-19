import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { StateMachine, Transition } from "@praxisjs/fsm";
import type { Machine } from "@praxisjs/fsm";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type FetchState = "idle" | "loading" | "success" | "error";
type FetchEvent = "FETCH" | "RESOLVE" | "REJECT" | "RESET";

@Component()
class FetchFSM extends StatefulComponent {
  @StateMachine<FetchState, FetchEvent>({
    initial: "idle",
    states: {
      idle:    { on: { FETCH: "loading" } },
      loading: { on: { RESOLVE: "success", REJECT: "error" } },
      success: { on: { RESET: "idle", FETCH: "loading" } },
      error:   { on: { RESET: "idle", FETCH: "loading" } },
    },
  })
  machine!: Machine<FetchState, FetchEvent>;

  @State() data: string | null = null;
  @State() history: string[] = [];

  @Transition("machine", "FETCH")
  async load() {
    this.history = [`FETCH → loading`, ...this.history.slice(0, 5)];
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    if (Math.random() > 0.35) {
      this.data = `Result #${Math.floor(Math.random() * 1000)}`;
      this.machine.send("RESOLVE");
      this.history = [`RESOLVE → success`, ...this.history.slice(0, 5)];
    } else {
      this.machine.send("REJECT");
      this.history = [`REJECT → error`, ...this.history.slice(0, 5)];
    }
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">Fetch FSM — idle / loading / success / error</h3>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {(["idle", "loading", "success", "error"] as FetchState[]).map((s) => (
            <span
              key={s}
              style={() => `padding:4px 10px;border-radius:99px;font-size:.78rem;font-weight:700;transition:all .2s;background:${this.machine.is(s) ? "#6d5bbd" : "#f1f5f9"};color:${this.machine.is(s) ? "#fff" : "#9ca3af"}`}
            >
              {s}
            </span>
          ))}
        </div>

        {() => this.machine.is("idle") && (
          <p style="margin:0;font-size:.85rem;color:#6b7280">Ready to fetch.</p>
        )}
        {() => this.machine.is("loading") && (
          <p style="margin:0;font-size:.85rem;color:#9ca3af">Fetching… (65% success rate)</p>
        )}
        {() => this.machine.is("success") && (
          <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:.88rem;color:#166534">
            ✅ {this.data}
          </div>
        )}
        {() => this.machine.is("error") && (
          <div style="padding:10px 14px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;font-size:.88rem;color:#b91c1c">
            ❌ Request failed
          </div>
        )}

        <div style="display:flex;gap:8px">
          <button
            disabled={() => !this.machine.can("FETCH")}
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { void this.load(); }}
          >
            {() => this.machine.is("loading") ? "Loading…" : "Fetch"}
          </button>
          <button
            disabled={() => !this.machine.can("RESET")}
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.88rem;color:#6b7280"
            onClick={() => { this.machine.reset(); this.data = null; }}
          >
            Reset
          </button>
        </div>

        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px">
          {() => this.history.map((entry, i) => (
            <li style={`padding:3px 8px;border-radius:3px;font-size:.78rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>
              {entry}
            </li>
          ))}
        </ul>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>machine.can('FETCH')</code> — only true when event is valid in current state.
          <code>@Transition</code> wraps the method: body runs only if the transition succeeds.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/FSM/FetchFSM",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FetchMachine: Story = {
  name: "@StateMachine — async fetch states",
  render: () => <FetchFSM />,
};
