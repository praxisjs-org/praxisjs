import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Ref } from "@praxisjs/decorators";
import { Intersection } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class IntersectionDemo extends StatefulComponent {
  @Ref<HTMLDivElement>()
  boxRef!: Ref<HTMLDivElement>;

  @Compose(Intersection, "boxRef", { threshold: 0.5 })
  visibility!: Intersection;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Intersection — viewport visibility</h3>
        <div style="padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.82rem;color:#0369a1">
          Scroll the target element in and out of view. Threshold: 50%.
        </div>
        <div style="height:120px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px">
          <div style="height:80px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.82rem;color:#94a3b8">
            ↓ scroll ↓
          </div>
          <div
            ref={this.boxRef}
            style={() => `margin-top:8px;height:70px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;transition:all .3s;background:${this.visibility.visible ? "#ede9fe" : "#f1f5f9"};color:${this.visibility.visible ? "#5b21b6" : "#9ca3af"};border:2px solid ${this.visibility.visible ? "#6d5bbd" : "#e5e7eb"}`}
          >
            {() => this.visibility.visible ? "In viewport ✓" : "Out of view"}
          </div>
          <div style="height:80px;background:#f1f5f9;border-radius:6px;margin-top:8px;display:flex;align-items:center;justify-content:center;font-size:.82rem;color:#94a3b8">
            ↑ scroll up ↑
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Uses <code>IntersectionObserver</code>. <code>visible: boolean</code> turns reactive
          when ≥50% of the element enters the viewport.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/DOM/Intersection",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const IntersectionStory: Story = {
  name: "Intersection — viewport visibility",
  render: () => <IntersectionDemo />,
};
