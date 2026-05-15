import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Clipboard } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ClipboardDemo extends StatefulComponent {
  @Compose(Clipboard)
  clipboard!: Clipboard;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Clipboard — copy to clipboard</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {["npm install @praxisjs/core", "pnpm add @praxisjs/core", "yarn add @praxisjs/core"].map((cmd) => (
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;font-size:.82rem;font-family:monospace;flex:1;min-width:200px">
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{cmd}</span>
              <button
                style={() => `padding:4px 10px;border-radius:4px;border:none;cursor:pointer;font-size:.78rem;font-weight:600;transition:all .15s;background:${this.clipboard.copied && this.clipboard.content === cmd ? "#16a34a" : "#6d5bbd"};color:#fff`}
                onClick={() => { void this.clipboard.copy(cmd); }}
              >
                {() => this.clipboard.copied && this.clipboard.content === cmd ? "Copied!" : "Copy"}
              </button>
            </div>
          ))}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>clipboard.copy(text)</code> writes to the clipboard.
          <code>clipboard.copied</code> turns <code>true</code> briefly, then resets after 2s.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/Clipboard",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ClipboardStory: Story = {
  name: "Clipboard — copy to clipboard",
  render: () => <ClipboardDemo />,
};
