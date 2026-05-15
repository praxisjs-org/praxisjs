import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ReactiveVsStaticDemo extends StatefulComponent {
  @State() count = 0;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">Reactive vs. static expressions</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0">
            <code style="font-size:.82rem">{`{() => this.count}`}</code>
            <strong style="color:#16a34a">{() => this.count}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca">
            <code style="font-size:.82rem">{`{this.count}`} (static snapshot)</code>
            <strong style="color:#dc2626">{this.count}</strong>
          </div>
        </div>
        <button
          style="padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;align-self:start"
          onClick={() => { this.count++; }}
        >
          Increment — watch the green one update
        </button>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>render()</code> runs once. Only arrow functions create reactive subscriptions.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Reactivity/ReactiveVsStatic",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ReactiveVsStatic: Story = {
  name: "Reactive vs. static expressions",
  render: () => <ReactiveVsStaticDemo />,
};
