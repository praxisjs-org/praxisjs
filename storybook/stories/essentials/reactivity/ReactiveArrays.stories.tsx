import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ReactiveArraysDemo extends StatefulComponent {
  @State() items: string[] = ["signals", "decorators", "jsx"];
  @State() input = "";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">Reactive arrays — new references</h3>
        <div style="display:flex;gap:6px">
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="Add item…"
            value={() => this.input}
            onInput={(e: Event) => { this.input = (e.target as HTMLInputElement).value; }}
          />
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => {
              if (this.input.trim()) {
                this.items = [...this.items, this.input.trim()];
                this.input = "";
              }
            }}
          >
            Add
          </button>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          {() => this.items.map((item, i) => (
            <li style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;font-size:.88rem">
              {item}
              <button
                style="all:unset;cursor:pointer;color:#9ca3af;font-size:1rem"
                onClick={() => { this.items = this.items.filter((_, j) => j !== i); }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Always replace: <code>this.items = [...this.items, x]</code>. Never mutate in place — <code>push()</code> won't trigger updates.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Reactivity/ReactiveArrays",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ReactiveArrays: Story = {
  name: "Reactive arrays — new references",
  render: () => <ReactiveArraysDemo />,
};
