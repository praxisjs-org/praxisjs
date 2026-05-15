import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { MediaQuery } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class MediaQueryDemo extends StatefulComponent {
  @Compose(MediaQuery, "(max-width: 640px)")
  sm!: MediaQuery;

  @Compose(MediaQuery, "(min-width: 641px) and (max-width: 1024px)")
  md!: MediaQuery;

  @Compose(MediaQuery, "(min-width: 1025px)")
  lg!: MediaQuery;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">MediaQuery — reactive breakpoints</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          {([
            { label: "≤ 640px (sm)", active: () => this.sm.matches },
            { label: "641–1024px (md)", active: () => this.md.matches },
            { label: "≥ 1025px (lg)", active: () => this.lg.matches },
          ] as { label: string; active: () => boolean }[]).map((b) => (
            <div
              key={b.label}
              style={() => `display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;border:1px solid ${b.active() ? "#6d5bbd" : "#e5e7eb"};background:${b.active() ? "#ede9fe" : "#fafafa"};font-size:.85rem;transition:all .2s`}
            >
              <span style={() => b.active() ? "color:#5b21b6;font-weight:600" : "color:#9ca3af"}>
                {b.label}
              </span>
              <span style={() => `font-size:.75rem;font-weight:700;color:${b.active() ? "#6d5bbd" : "#d1d5db"}`}>
                {() => b.active() ? "ACTIVE" : "—"}
              </span>
            </div>
          ))}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Resize the browser window — the active breakpoint updates reactively via <code>matchMedia</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/MediaQuery",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MediaQueryStory: Story = {
  name: "MediaQuery — reactive breakpoints",
  render: () => <MediaQueryDemo />,
};
