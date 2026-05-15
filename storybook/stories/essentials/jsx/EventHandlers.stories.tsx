import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class EventsDemo extends StatefulComponent {
  @State() log: string[] = [];
  @State() value = "";

  record(msg: string) {
    this.log = [msg, ...this.log.slice(0, 5)];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">JSX — event handlers</h3>
        <input
          style="padding:7px 10px;border:1px solid #ccc;border-radius:6px"
          placeholder="Type here…"
          value={() => this.value}
          onInput={(e: Event) => {
            this.value = (e.target as HTMLInputElement).value;
            this.record(`onInput: "${this.value}"`);
          }}
          onFocus={() => { this.record("onFocus"); }}
          onBlur={() => { this.record("onBlur"); }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter") this.record(`onKeyDown: Enter`);
          }}
        />
        <button
          style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;align-self:start"
          onClick={() => { this.record("onClick"); }}
          onDblClick={() => { this.record("onDblClick"); }}
        >
          Click or double-click me
        </button>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px">
          {() => this.log.length === 0
            ? <li style="font-size:.85rem;color:#aaa">Events will appear here…</li>
            : this.log.map((entry, i) => (
              <li style={`padding:4px 10px;border-radius:4px;font-size:.82rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>
                {entry}
              </li>
            ))
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Event props are camelCase: <code>onClick</code>, <code>onInput</code>, <code>onKeyDown</code>, <code>onFocus</code>, <code>onBlur</code>, etc.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/JSX/EventHandlers",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const EventHandlers: Story = {
  name: "Event handlers",
  render: () => <EventsDemo />,
};
