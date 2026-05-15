import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Throttle } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ThrottleDemo extends StatefulComponent {
  @State() x = 0;
  @State() y = 0;
  @State() callCount = 0;
  @State() throttledCount = 0;
  @State() lastPos = { x: 0, y: 0 };

  @Throttle(150)
  recordPosition(x: number, y: number) {
    this.throttledCount++;
    this.lastPos = { x, y };
  }

  onMouseMove(e: MouseEvent) {
    this.callCount++;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.x = Math.round(e.clientX - rect.left);
    this.y = Math.round(e.clientY - rect.top);
    this.recordPosition(this.x, this.y);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Throttle(150ms) — at most once per 150ms</h3>
        <div
          style="height:120px;border:2px dashed #e5e7eb;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:crosshair;background:#fafafa;position:relative;overflow:hidden"
          onMouseMove={(e: MouseEvent) => { this.onMouseMove(e); }}
        >
          <span style="font-size:.82rem;color:#d1d5db;pointer-events:none;user-select:none">Move cursor here</span>
          <div
            style={() => `position:absolute;width:10px;height:10px;border-radius:50%;background:#6d5bbd;transform:translate(-50%,-50%);left:${this.lastPos.x}px;top:${this.lastPos.y}px;transition:none;pointer-events:none`}
          />
        </div>
        <div style="display:flex;gap:16px;font-size:.85rem;color:#555">
          <span>mousemove calls: <strong>{() => this.callCount}</strong></span>
          <span>Updates: <strong style="color:#6d5bbd">{() => this.throttledCount}</strong></span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Scroll/resize/mouse events fire hundreds of times per second.
          <code>@Throttle</code> limits execution to once per 150ms — leading-edge.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Timing/Throttle",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ThrottleStory: Story = {
  name: "@Throttle — mouse tracking",
  render: () => <ThrottleDemo />,
};
