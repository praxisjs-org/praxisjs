import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Watch } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class WatchDemo extends StatefulComponent {
  @State() query = "";
  @State() results: string[] = [];
  @State() loading = false;

  @Watch("query")
  onQueryChange(newVal: string) {
    if (!newVal.trim()) { this.results = []; return; }
    this.loading = true;
    setTimeout(() => {
      this.results = [
        `Result for "${newVal}" #1`,
        `Result for "${newVal}" #2`,
        `Result for "${newVal}" #3`,
      ];
      this.loading = false;
    }, 400);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">@Watch — side effects on change</h3>
        <input
          style="padding:7px 10px;border:1px solid #ccc;border-radius:6px"
          placeholder="Type to search…"
          value={() => this.query}
          onInput={(e: Event) => { this.query = (e.target as HTMLInputElement).value; }}
        />
        {() => this.loading && (
          <p style="margin:0;font-size:.85rem;color:#9ca3af">Loading…</p>
        )}
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">
          {() => this.results.map((r) => (
            <li style="padding:6px 10px;background:#f5f5f5;border-radius:4px;font-size:.88rem">{r}</li>
          ))}
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Watch('query')</code> fires after each change, receiving <code>(newVal, oldVal)</code>.
          Initial mount does NOT trigger it.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Watchers/Watch",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WatchSingleProp: Story = {
  name: "@Watch — single prop",
  render: () => <WatchDemo />,
};
