import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, State, getter } from "@praxisjs/decorators";
import { VirtualList, type VirtualItem } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface ListItem { id: number; name: string; value: number }

const ITEMS: ListItem[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  name: `Item #${String(i + 1).padStart(4, "0")}`,
  value: Math.round(Math.random() * 1000),
}));

@Component()
class VirtualDemo extends StatefulComponent {
  @State() filter = "";
  containerRef = { current: null as HTMLDivElement | null };

  get filteredItems(): ListItem[] {
    const q = this.filter.toLowerCase();
    return q ? ITEMS.filter((i) => i.name.includes(q)) : ITEMS;
  }

  @Compose(VirtualList, "containerRef", getter("filteredItems"), 44, 3)
  virtual!: VirtualList<ListItem>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">VirtualList — 2 000 items, reactive filter</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px;font-family:inherit"
            placeholder="Filter…"
            value={() => this.filter}
            onInput={(e: Event) => { this.filter = (e.target as HTMLInputElement).value; }}
          />
          <span style="font-size:.78rem;color:#9ca3af;white-space:nowrap">
            {() => this.filteredItems.length} rows
          </span>
        </div>
        <div
          ref={(el: HTMLDivElement) => { this.containerRef.current = el; }}
          style="height:400px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px"
        >
          <div style={() => `height:${this.virtual.totalHeight}px;position:relative`}>
            <div style={() => `height:${this.virtual.offsetTop}px`} />
            {() => (this.virtual.visibleItems as VirtualItem<ListItem>[]).map(({ item, index }) => (
              <div
                key={item.id}
                style={`display:flex;justify-content:space-between;align-items:center;padding:0 14px;height:44px;border-bottom:1px solid #f1f5f9;font-size:.88rem;background:${index % 2 === 0 ? "#fff" : "#fafafa"}`}
              >
                <span style="color:#374151">{item.name}</span>
                <span style="font-variant-numeric:tabular-nums;color:#6d5bbd;font-weight:600">{item.value}</span>
              </div>
            ))}
            <div style={() => `height:${this.virtual.offsetBottom}px`} />
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Only visible rows (+ 3 buffer) are in the DOM. Filter reactively updates the visible window.
          Exposed signals: <code>visibleItems</code>, <code>totalHeight</code>, <code>offsetTop</code>, <code>offsetBottom</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Performance/VirtualList",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const VirtualListStory: Story = {
  name: "VirtualList — reactive virtual scroll",
  render: () => <VirtualDemo />,
};
