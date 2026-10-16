import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Index } from "@praxisjs/runtime";
import type { Meta, StoryObj } from "@praxisjs/storybook";

const button = "padding:5px 12px;border-radius:6px;border:1px solid #d4d4d8;background:#fff;cursor:pointer;font-size:.82rem";

@Component()
class IndexListDemo extends StatefulComponent {
  @State() tags: string[] = ["signals", "signals", "decorators"];

  rename(index: number, value: string) {
    this.tags = this.tags.map((tag, i) => (i === index ? value : tag));
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">Index — rows by position</h3>
        <div style="display:flex;flex-direction:column;gap:5px">
          <Index each={() => this.tags} fallback={<span style="color:#9ca3af;font-size:.85rem">No tags</span>}>
            {(tag, i) => (
              <label style="display:flex;align-items:center;gap:8px;font-size:.85rem">
                <span style="width:16px;color:#9ca3af">{i + 1}</span>
                <input
                  style="flex:1;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px"
                  value={() => tag()}
                  onInput={(e: Event) => { this.rename(i, (e.target as HTMLInputElement).value); }}
                />
              </label>
            )}
          </Index>
        </div>
        <div style="display:flex;gap:6px">
          <button style={button} onClick={() => { this.tags = [...this.tags, "new tag"]; }}>Add</button>
          <button style={button} onClick={() => { this.tags = this.tags.slice(0, -1); }}>Remove last</button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#71717a">
          Current value: <code>{() => JSON.stringify(this.tags)}</code>. Every keystroke replaces a string,
          which would change its key in <code>For</code> and recreate the input. <code>Index</code> keeps the
          input at that position, so focus and caret stay, and repeated values are fine.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lists/IndexList",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const IndexList: Story = {
  name: "Index — rows by position",
  render: () => <IndexListDemo />,
};
