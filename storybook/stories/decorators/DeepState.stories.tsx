import { StatefulComponent } from "@praxisjs/core";
import { Component, DeepState } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface AppConfig {
  theme: { mode: "light" | "dark"; accent: string };
  font: { size: number; family: string };
  notifications: { email: boolean; push: boolean };
}

@Component()
class DeepStateDemo extends StatefulComponent {
  @DeepState() config: AppConfig = {
    theme: { mode: "light", accent: "#6d5bbd" },
    font: { size: 14, family: "sans-serif" },
    notifications: { email: true, push: false },
  };

  @DeepState() tags: string[] = ["praxisjs", "signals", "decorators"];

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@DeepState — nested mutations are reactive</h3>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.config.theme.mode = this.config.theme.mode === "light" ? "dark" : "light"; }}
          >
            Toggle theme.mode
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.config.font.size++; }}
          >
            font.size++
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.config.notifications.email = !this.config.notifications.email; }}
          >
            Toggle notifications.email
          </button>
        </div>

        <pre style={() => `margin:0;padding:12px;border-radius:8px;font-size:.78rem;background:${this.config.theme.mode === "dark" ? "#1a1a2e" : "#f5f5f5"};color:${this.config.theme.mode === "dark" ? "#e2e2e2" : "#333"};overflow:auto;transition:background .2s`}>
          {() => JSON.stringify(this.config, null, 2)}
        </pre>

        <div>
          <p style="margin:0 0 6px;font-size:.88rem;font-weight:600">Tags (array mutations with push/splice)</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            {() => this.tags.map((tag, i) => (
              <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#ede9fe;color:#5b21b6;border-radius:99px;font-size:.8rem;font-weight:600">
                {tag}
                <button
                  style="all:unset;cursor:pointer;font-size:1rem;line-height:1;opacity:.6"
                  onClick={() => { this.tags.splice(i, 1); }}
                >×</button>
              </span>
            ))}
          </div>
          <button
            style="padding:5px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.tags.push(`tag-${this.tags.length + 1}`); }}
          >
            push tag
          </button>
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          No <code>this.config = &#123;...this.config&#125;</code> needed — any mutation at any depth triggers updates.
          <br />
          Use <code>@State</code> when possible; reach for <code>@DeepState</code> only for deeply nested structures.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/DeepState",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <DeepStateDemo />,
};
