import { StatefulComponent } from "@praxisjs/core";
import { Component, Lazy } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

const scrollRoot = { current: null as HTMLDivElement | null };

@Component()
class HeavyWidget extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;border:2px solid #6d5bbd;border-radius:10px;background:#faf5ff;font-family:sans-serif">
        <p style="margin:0;font-weight:700;color:#5b21b6">Heavy component rendered!</p>
        <p style="margin:4px 0 0;font-size:.85rem;color:#7c3aed">
          Deferred until scrolled into the container's visible area.
        </p>
      </div>
    );
  }
}

const LazyHeavyWidget = Lazy({ placeholder: 80, root: scrollRoot, rootMargin: "0px" })(
  HeavyWidget,
  {} as ClassDecoratorContext,
) as typeof HeavyWidget;

@Component()
class LazyDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@Lazy — defer until scrolled into view</h3>
        <p style="margin:0;font-size:.82rem;color:#6b7280">
          Scroll inside the box below — the component renders once it enters the visible area.
        </p>
        <div
          ref={(el: HTMLDivElement) => { scrollRoot.current = el; }}
          style="height:280px;overflow-y:scroll;border:1px solid #e5e7eb;border-radius:8px"
        >
          <div style="height:340px;background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc 10px,#f1f5f9 10px,#f1f5f9 20px);display:flex;align-items:center;justify-content:center;font-size:.82rem;color:#94a3b8;user-select:none">
            ↓ Scroll down ↓
          </div>
          <div style="padding:12px">
            <LazyHeavyWidget />
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Lazy({"{ placeholder, root, rootMargin }"})</code> — pass a{" "}
          <code>root</code> ref to scope intersection to a specific scroll container.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Performance/Lazy",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const LazyStory: Story = {
  name: "@Lazy — viewport-deferred rendering",
  render: () => <LazyDemo />,
};
