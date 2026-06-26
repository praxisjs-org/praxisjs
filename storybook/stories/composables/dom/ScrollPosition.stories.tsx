import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Ref } from "@praxisjs/decorators";
import { ScrollPosition } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ScrollPositionDemo extends StatefulComponent {
  @Ref<HTMLDivElement>()
  scrollRef!: Ref<HTMLDivElement>;

  @Compose(ScrollPosition, "scrollRef")
  scroll!: ScrollPosition;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">ScrollPosition — reactive scroll coordinates</h3>
        <div style="display:flex;gap:12px;font-variant-numeric:tabular-nums">
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:700;color:#6d5bbd">
              {() => Math.round(this.scroll.x)}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">scrollX (px)</p>
          </div>
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:700;color:#6d5bbd">
              {() => Math.round(this.scroll.y)}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">scrollY (px)</p>
          </div>
        </div>
        <div
          ref={this.scrollRef}
          style="height:200px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa"
        >
          <div style="width:700px;padding:12px;display:flex;flex-direction:column;gap:6px">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                style={`display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;background:${i % 2 === 0 ? "#fff" : "#f1f5f9"};flex-shrink:0`}
              >
                <span style="font-size:.78rem;color:#9ca3af;font-variant-numeric:tabular-nums;width:24px">#{i + 1}</span>
                <div style={`height:8px;border-radius:99px;background:hsl(${250 + i * 4},60%,60%);width:${80 + i * 20}px;flex-shrink:0`} />
                <span style="font-size:.82rem;color:#374151;white-space:nowrap">item label {i + 1} — some extra content to force horizontal scroll</span>
              </div>
            ))}
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Scroll vertically and horizontally — <code>x</code> and <code>y</code> update reactively.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/DOM/ScrollPosition",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ScrollPositionStory: Story = {
  name: "ScrollPosition — scroll coordinates",
  render: () => <ScrollPositionDemo />,
};
