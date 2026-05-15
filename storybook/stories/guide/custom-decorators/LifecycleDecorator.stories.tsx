import { StatefulComponent } from "@praxisjs/core";
import { Component, State, createLifecycleMethodDecorator } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

function OnResize() {
  return createLifecycleMethodDecorator({
    register(callback: () => void) {
      window.addEventListener("resize", callback);
      return () => window.removeEventListener("resize", callback);
    },
  });
}

@Component()
class OnResizeDemo extends StatefulComponent {
  @State() cols = 3;
  @State() width = window.innerWidth;

  @OnResize()
  recalculate() {
    this.width = window.innerWidth;
    this.cols = window.innerWidth > 1024 ? 4 : window.innerWidth > 640 ? 3 : 1;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@OnResize — lifecycle method decorator</h3>
        <div style="display:flex;gap:12px">
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:800;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => this.width}px
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">window width</p>
          </div>
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:800;color:#6d5bbd">
              {() => this.cols}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">columns</p>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Resize the browser — <code>recalculate()</code> is called automatically.
          Built with <code>createLifecycleMethodDecorator</code>: auto-subscribes on mount,
          unsubscribes on unmount.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/LifecycleDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const LifecycleDecorator: Story = {
  name: "createLifecycleMethodDecorator — @OnResize",
  render: () => <OnResizeDemo />,
};
