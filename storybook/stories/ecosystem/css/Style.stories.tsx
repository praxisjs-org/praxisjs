import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Style } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class StyleDemo extends StatefulComponent {
  @Style("--accent") accent = "#6d5bbd";
  @Style("--bg")     bg     = "#f8f7ff";
  @Style("--opacity") opacity = "1";

  @State() label = "Purple";

  setTheme(name: string, accent: string, bg: string) {
    this.accent = accent;
    this.bg     = bg;
    this.label  = name;
  }

  render() {
    return (
      <div
        style={`
          background: var(--bg);
          border: 2px solid var(--accent);
          border-radius: 10px;
          padding: 20px;
          font-family: sans-serif;
          min-width: 280px;
          opacity: var(--opacity);
          transition: background 0.2s, border-color 0.2s, opacity 0.1s;
        `}
      >
        <h3 style="margin: 0 0 4px; font-size: 0.875rem; font-weight: 600; color: #1f1b4e;">
          @Style — reactive CSS custom properties
        </h3>
        <p style="margin: 0 0 16px; font-size: 0.78rem; color: #8b83bc;">
          Values sync directly to <code>element.style</code> via CSS custom properties
          — no class toggling, no re-render.
        </p>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
          {[
            { name: "Purple", accent: "#6d5bbd", bg: "#f8f7ff" },
            { name: "Blue",   accent: "#3b82f6", bg: "#eff6ff" },
            { name: "Green",  accent: "#10b981", bg: "#ecfdf5" },
            { name: "Red",    accent: "#ef4444", bg: "#fef2f2" },
          ].map(({ name, accent, bg }) => (
            <button
              key={name}
              onClick={() => this.setTheme(name, accent, bg)}
              style={`
                padding: 6px 14px;
                border-radius: 6px;
                border: 1px solid ${accent};
                background: transparent;
                color: ${accent};
                font-size: 0.78rem;
                cursor: pointer;
              `}
            >
              {name}
            </button>
          ))}
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-size: 0.82rem; color: #6b7280;">Opacity</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value="1"
            onInput={(e: Event) => {
              this.opacity = String(parseFloat((e.target as HTMLInputElement).value));
            }}
            style="flex: 1;"
          />
        </div>

        <div
          style={`
            margin-top: 16px;
            padding: 12px;
            border-radius: 6px;
            background: var(--accent);
            color: #fff;
            font-size: 0.82rem;
          `}
        >
          {() => this.label} theme
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/Style",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StyleStory: Story = {
  name: "@Style — reactive CSS custom properties",
  render: () => <StyleDemo />,
};
