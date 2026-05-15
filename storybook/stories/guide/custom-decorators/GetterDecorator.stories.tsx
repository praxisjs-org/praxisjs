import { StatefulComponent } from "@praxisjs/core";
import { Component, State, createGetterDecorator } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

function Clamp(min: number, max: number) {
  return createGetterDecorator({
    wrap(original, instance) {
      return () => {
        const value = original.call(instance) as number;
        return Math.min(max, Math.max(min, value));
      };
    },
  });
}

@Component()
class ClampDemo extends StatefulComponent {
  @State() raw = 50;

  @Clamp(0, 100)
  get clamped() { return this.raw; }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Clamp — getter decorator</h3>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:.9rem">
          Raw value (−50 to 200 range)
          <div style="display:flex;align-items:center;gap:8px">
            <input
              type="range" min="-50" max="200" style="flex:1"
              value={() => this.raw}
              onInput={(e: Event) => { this.raw = Number((e.target as HTMLInputElement).value); }}
            />
            <span style="min-width:4ch;font-variant-numeric:tabular-nums;color:#dc2626;font-weight:600">
              {() => this.raw}
            </span>
          </div>
        </label>
        <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:.88rem">
          <span style="color:#6b7280">Clamped to [0, 100]:</span>
          <strong style="color:#16a34a;font-variant-numeric:tabular-nums">{() => this.clamped}</strong>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Built with <code>createGetterDecorator</code>: wraps the getter's return value
          without changing the reactive subscription chain.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/GetterDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const GetterDecorator: Story = {
  name: "createGetterDecorator — @Clamp",
  render: () => <ClampDemo />,
};
