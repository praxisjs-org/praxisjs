import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State, Computed } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class Counter extends StatefulComponent {
  @Prop() initialCount = 0;
  @Prop() step = 1;
  @Prop() label = "count";

  @State() count = 0;

  onMount() {
    this.count = this.initialCount;
  }

  @Computed()
  get doubled() {
    return this.count * 2;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;align-items:center;gap:20px;font-family:sans-serif;padding:32px">
        <div style="text-align:center">
          <p style="font-size:4rem;font-weight:800;margin:0;font-variant-numeric:tabular-nums;line-height:1;color:#6d5bbd">
            {() => this.count}
          </p>
          <p style="font-size:0.78rem;color:#aaa;margin:6px 0 0;text-transform:uppercase;letter-spacing:.12em">
            {() => this.label} · doubled: {() => this.doubled}
          </p>
        </div>
        <div style="display:flex;gap:8px">
          <button
            style="padding:8px 20px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.9rem"
            onClick={() => { this.count -= this.step; }}
          >
            −{() => this.step}
          </button>
          <button
            style="padding:8px 20px;border-radius:8px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.9rem;font-weight:600"
            onClick={() => { this.count += this.step; }}
          >
            +{() => this.step}
          </button>
          <button
            style="padding:8px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.9rem;color:#888"
            onClick={() => { this.count = 0; }}
          >
            Reset
          </button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#ccc;max-width:280px;text-align:center">
          <code>@State()</code> turns a class field into a reactive signal. Arrow functions in JSX subscribe to it.
        </p>
      </div>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: "Getting Started/Counter",
  component: Counter,
  tags: ["autodocs"],
  argTypes: {
    initialCount: { control: { type: "number" }, description: "Starting value" },
    step:  { control: { type: "number", min: 1, max: 20 }, description: "Amount added/subtracted per click" },
    label: { control: "text", description: "Display label" },
  },
};
export default meta;

type Story = StoryObj<any>;

export const Default: Story = {
  args: { initialCount: 0, step: 1, label: "count" },
};

export const BigStep: Story = {
  args: { initialCount: 100, step: 10, label: "score" },
};
