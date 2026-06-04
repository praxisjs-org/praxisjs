import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class TemperatureConverterAccessor extends StatefulComponent {
  @State() celsius = 0;

  @Computed({
    get(this: TemperatureConverterAccessor): number {
      return Math.round((this.celsius * 9) / 5 + 32);
    },
    set(this: TemperatureConverterAccessor, value: number) {
      this.celsius = Math.round(((value - 32) * 5) / 9);
    },
  })
  accessor fahrenheit!: number;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">{"@Computed({ get, set }) — accessor form"}</h3>
        <p style="margin:0;font-size:.85rem;color:#6b7280">
          TypeScript-compatible writable computed — no cast needed. Edit either field.
        </p>
        <div style="display:flex;gap:12px;align-items:center">
          <label style="display:flex;flex-direction:column;gap:4px;flex:1;font-size:.88rem;font-weight:500">
            Celsius
            <input
              type="number"
              value={() => this.celsius}
              onInput={(e: Event) => {
                this.celsius = Number((e.target as HTMLInputElement).value);
              }}
              style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.95rem;width:100%;box-sizing:border-box"
            />
          </label>
          <span style="margin-top:20px;color:#9ca3af">⇄</span>
          <label style="display:flex;flex-direction:column;gap:4px;flex:1;font-size:.88rem;font-weight:500">
            Fahrenheit
            <input
              type="number"
              value={() => this.fahrenheit}
              onInput={(e: Event) => {
                this.fahrenheit = Number((e.target as HTMLInputElement).value);
              }}
              style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.95rem;width:100%;box-sizing:border-box"
            />
          </label>
        </div>
        <div style="font-size:.78rem;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px">
          <code>accessor fahrenheit!</code> with <code>{"@Computed({ get, set })"}</code> — both
          functions co-located in the decorator. TypeScript infers the field as writable.
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/State & Props/WritableComputedAccessor",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TemperatureConverterAccessorStory: Story = {
  name: "@Computed with get + set — accessor form",
  render: () => <TemperatureConverterAccessor />,
};
