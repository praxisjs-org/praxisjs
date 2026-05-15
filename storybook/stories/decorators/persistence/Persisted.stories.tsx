import { StatefulComponent } from "@praxisjs/core";
import { Component, Persisted } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class PersistedDemo extends StatefulComponent {
  @Persisted("sb:theme") theme = "light";
  @Persisted("sb:fontSize") fontSize = 14;
  @Persisted("sb:username") username = "";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Persisted — survives page reload</h3>

        <label style="display:flex;align-items:center;gap:8px;font-size:.9rem">
          Username
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            value={() => this.username}
            onInput={(e: Event) => { this.username = (e.target as HTMLInputElement).value; }}
          />
        </label>

        <label style="display:flex;align-items:center;gap:8px;font-size:.9rem">
          Theme
          <select
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            onChange={(e: Event) => { this.theme = (e.target as HTMLSelectElement).value; }}
          >
            <option value="light" selected={() => this.theme === "light"}>Light</option>
            <option value="dark"  selected={() => this.theme === "dark"}>Dark</option>
            <option value="auto"  selected={() => this.theme === "auto"}>Auto</option>
          </select>
        </label>

        <label style="display:flex;align-items:center;gap:8px;font-size:.9rem">
          Font size
          <input
            type="range" min="10" max="24"
            style="flex:1"
            value={() => this.fontSize}
            onInput={(e: Event) => { this.fontSize = Number((e.target as HTMLInputElement).value); }}
          />
          <span style="min-width:3ch;font-variant-numeric:tabular-nums">{() => this.fontSize}px</span>
        </label>

        <div style={() => `padding:12px;border-radius:8px;transition:all .2s;background:${this.theme === "dark" ? "#1a1a2e" : "#f8f9fa"};color:${this.theme === "dark" ? "#e2e2e2" : "#333"};font-size:${this.fontSize}px`}>
          Hello, {() => this.username || "stranger"}! Theme: {() => this.theme}.
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          Reload the page — all values persist via <code>localStorage</code>.
          Key defaults to the field name; use <code>@Persisted('key')</code> to override.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Persistence/Persisted",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PersistedStory: Story = {
  name: "@Persisted — localStorage",
  render: () => <PersistedDemo />,
};
