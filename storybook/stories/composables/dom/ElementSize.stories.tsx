import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Ref } from "@praxisjs/decorators";
import { ElementSize } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ElementSizeDemo extends StatefulComponent {
  @Ref<HTMLDivElement>()
  containerRef!: Ref<HTMLDivElement>;

  @Compose(ElementSize, "containerRef")
  size!: ElementSize;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">ElementSize — reactive element dimensions</h3>
        <div
          ref={this.containerRef}
          style="resize:both;overflow:auto;padding:20px;border:2px dashed #e5e7eb;border-radius:8px;background:#fafafa;min-width:100px;min-height:60px;cursor:se-resize"
        >
          <p style="margin:0;font-size:.82rem;color:#9ca3af;text-align:center;pointer-events:none">
            Drag corner to resize
          </p>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:6px;text-align:center">
            <p style="margin:0;font-size:1.5rem;font-weight:700;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => Math.round(this.size.width)}
            </p>
            <p style="margin:2px 0 0;font-size:.72rem;color:#9ca3af">width (px)</p>
          </div>
          <div style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:6px;text-align:center">
            <p style="margin:0;font-size:1.5rem;font-weight:700;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => Math.round(this.size.height)}
            </p>
            <p style="margin:2px 0 0;font-size:.72rem;color:#9ca3af">height (px)</p>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Uses <code>ResizeObserver</code> — fires whenever the element's dimensions change.
          <code>@Compose(ElementSize, 'containerRef')</code> resolves the ref at bind time.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/DOM/ElementSize",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ElementSizeStory: Story = {
  name: "ElementSize — element dimensions",
  render: () => <ElementSizeDemo />,
};
