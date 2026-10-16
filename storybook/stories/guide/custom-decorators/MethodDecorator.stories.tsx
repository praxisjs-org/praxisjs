import { StatefulComponent } from "@praxisjs/core";
import { Component, State, createMethodDecorator } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

const calls = Symbol("calls");

function CountCalls() {
  return createMethodDecorator({
    label: "@CountCalls()",
    setup(original) {
      return function (this: { [calls]?: number }, ...args: unknown[]) {
        this[calls] = (this[calls] ?? 0) + 1;
        return original.apply(this, args);
      };
    },
  });
}

@Component()
class CountCallsDemo extends StatefulComponent {
  @State() result = 0;
  @State() callCount = 0;

  @CountCalls()
  compute(n: number) {
    this.callCount++;
    this.result = n * n;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">@CountCalls — method decorator</h3>
        <div style="display:flex;gap:8px">
          {[2, 5, 10, 15].map((n) => (
            <button
              key={n}
              style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { this.compute(n); }}
            >
              {n}²
            </button>
          ))}
        </div>
        <div style="display:flex;gap:12px;font-size:.85rem">
          <span>Result: <strong style="color:#6d5bbd">{() => this.result || "—"}</strong></span>
          <span>Calls: <strong>{() => this.callCount}</strong></span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Built with <code>createMethodDecorator</code>'s <code>setup</code> form: one replacement
          shared by every instance, the call count kept in a symbol slot on the instance.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/MethodDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MethodDecorator: Story = {
  name: "createMethodDecorator — @CountCalls",
  render: () => <CountCallsDemo />,
};
