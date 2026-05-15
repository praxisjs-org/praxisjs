import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { WindowSize } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class WindowSizeDemo extends StatefulComponent {
  @Compose(WindowSize)
  window!: WindowSize;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">WindowSize — reactive viewport dimensions</h3>
        <div style="display:flex;gap:12px">
          <div style="flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:2rem;font-weight:800;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => this.window.width}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">width</p>
          </div>
          <div style="flex:1;padding:14px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:2rem;font-weight:800;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => this.window.height}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">height</p>
          </div>
        </div>
        <div style="padding:8px 12px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;font-size:.82rem;color:#6d5bbd">
          {() => this.window.width < 640
            ? "📱 Small screen (< 640px)"
            : this.window.width < 1024
            ? "💻 Medium screen (640–1024px)"
            : "🖥️ Large screen (> 1024px)"}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Resize the browser window — values update reactively via <code>resize</code> event.
          <code>@Compose(WindowSize)</code> binds the composable and cleans up on unmount.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/DOM/WindowSize",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WindowSizeStory: Story = {
  name: "WindowSize — viewport dimensions",
  render: () => <WindowSizeDemo />,
};
