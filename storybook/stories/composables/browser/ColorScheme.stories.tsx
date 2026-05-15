import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { ColorScheme } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ColorSchemeDemo extends StatefulComponent {
  @Compose(ColorScheme)
  scheme!: ColorScheme;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">ColorScheme — preferred color scheme</h3>
        <div style={() => `padding:20px;border-radius:10px;text-align:center;transition:all .3s;background:${this.scheme.isDark ? "#1a1a2e" : "#fff"};border:1px solid ${this.scheme.isDark ? "#2d2d4e" : "#e5e7eb"}`}>
          <p style={() => `margin:0;font-size:1.5rem`}>
            {() => this.scheme.isDark ? "🌙" : "☀️"}
          </p>
          <p style={() => `margin:6px 0 0;font-size:.88rem;font-weight:600;color:${this.scheme.isDark ? "#e2e2e2" : "#374151"}`}>
            {() => this.scheme.isDark ? "Dark mode" : "Light mode"}
          </p>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Change your OS or browser color preference to see this update.
          Use <code>scheme.isDark</code> or <code>scheme.isLight</code> to reactively adapt the UI.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/ColorScheme",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ColorSchemeStory: Story = {
  name: "ColorScheme — preferred color scheme",
  render: () => <ColorSchemeDemo />,
};
