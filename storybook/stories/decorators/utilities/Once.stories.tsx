import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Once } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class OnceDemo extends StatefulComponent {
  @State() log: string[] = [];
  @State() result: string | null = null;

  @Once()
  async loadConfig(): Promise<string> {
    const ts = new Date().toLocaleTimeString();
    this.log = [...this.log, `loadConfig() called at ${ts} — fetch started`];
    await new Promise((r) => setTimeout(r, 600));
    const config = `config-${Math.random().toString(36).slice(2, 8)}`;
    this.log = [...this.log, `Resolved: ${config}`];
    return config;
  }

  async call() {
    const r = await this.loadConfig();
    this.result = r;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">
          @Once — runs at most once per instance
        </h3>
        <div style="display:flex;gap:8px">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { void this.call(); }}
          >
            Call loadConfig()
          </button>
          <span style="font-size:.85rem;color:#555;align-self:center">
            Result:{" "}
            <strong style="color:#6d5bbd">{() => this.result ?? "—"}</strong>
          </span>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() =>
            this.log.map((entry, i) => (
              <li
                style={`padding:5px 10px;border-radius:4px;font-size:.8rem;font-family:monospace;background:${i === this.log.length - 1 ? "#ede9fe" : "#f5f5f5"}`}
              >
                {entry}
              </li>
            ))
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Click multiple times — the fetch only runs once. Subsequent calls
          return the same cached Promise.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Utilities/Once",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const OnceStory: Story = {
  name: "@Once — run once per instance",
  render: () => <OnceDemo />,
};
