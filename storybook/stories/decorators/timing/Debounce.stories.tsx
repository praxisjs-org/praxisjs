import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Debounce } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class DebounceDemo extends StatefulComponent {
  @State() query = "";
  @State() fetchLog: string[] = [];
  @State() callCount = 0;
  @State() fetchCount = 0;

  @Debounce(400)
  performSearch(q: string) {
    this.fetchCount++;
    this.fetchLog = [
      `[${new Date().toLocaleTimeString()}] Fetching "${q}"`,
      ...this.fetchLog.slice(0, 4),
    ];
  }

  onInput(e: Event) {
    this.callCount++;
    this.query = (e.target as HTMLInputElement).value;
    this.performSearch(this.query);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Debounce(400ms) — waits 400ms after last keystroke</h3>
        <input
          style="padding:7px 10px;border:1px solid #ccc;border-radius:6px"
          placeholder="Type quickly…"
          value={() => this.query}
          onInput={(e: Event) => { this.onInput(e); }}
        />
        <div style="display:flex;gap:16px;font-size:.85rem;color:#555">
          <span>Keystrokes: <strong>{() => this.callCount}</strong></span>
          <span>Fetches: <strong style="color:#6d5bbd">{() => this.fetchCount}</strong></span>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() => this.fetchLog.length === 0
            ? <li style="font-size:.82rem;color:#aaa">No fetches yet — type to trigger</li>
            : this.fetchLog.map((entry, i) => (
              <li style={`padding:5px 10px;border-radius:4px;font-size:.8rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>
                {entry}
              </li>
            ))
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Rapid keystrokes produce many calls but only one fetch fires — 400ms after the last keystroke.
          Any pending timer is automatically cleared on unmount.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Timing/Debounce",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const DebounceStory: Story = {
  name: "@Debounce — search input",
  render: () => <DebounceDemo />,
};
