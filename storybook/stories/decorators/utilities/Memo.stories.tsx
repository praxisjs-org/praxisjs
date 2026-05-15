import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Memo } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class MemoDemo extends StatefulComponent {
  @State() discount = 0;

  private computeCount = 0;
  @State() computeLog: string[] = [];

  @Memo()
  discountedPrice(price: number) {
    return price * (1 - this.discount);
  }

  onDiscountChange() {
    const entries = [99, 149, 249].map(
      (p) => `$${p} → $${this.discountedPrice(p).toFixed(2)}`,
    );
    this.computeLog = [
      `discount ${Math.round(this.discount * 100)}% → [${entries.join(", ")}]`,
      ...this.computeLog.slice(0, 4),
    ];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">
          @Memo — memoized per-argument cache
        </h3>
        <label style="display:flex;align-items:center;gap:8px;font-size:.9rem">
          Discount
          <input
            type="range"
            min="0"
            max="50"
            style="flex:1"
            value={() => this.discount * 100}
            onInput={(e: Event) => {
              this.discount =
                Number((e.target as HTMLInputElement).value) / 100;
              this.onDiscountChange();
            }}
          />
          <span style="min-width:3ch;font-variant-numeric:tabular-nums">
            {() => Math.round(this.discount * 100)}%
          </span>
        </label>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          {[99, 149, 249].map((price) => (
            <li style="display:flex;justify-content:space-between;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:.88rem">
              <span>${price}</span>
              <strong style="color:#6d5bbd">
                ${() => this.discountedPrice(price).toFixed(2)}
              </strong>
            </li>
          ))}
        </ul>
        <div>
          <p style="margin:0 0 4px;font-size:.78rem;font-weight:600;color:#9ca3af">
            Cache invalidation log
          </p>
          <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px">
            {() =>
              this.computeLog.length === 0 ? (
                <li style="font-size:.78rem;color:#d1d5db">
                  Move the slider to see cache updates
                </li>
              ) : (
                this.computeLog.map((entry, i) => (
                  <li
                    style={`padding:3px 8px;font-size:.78rem;font-family:monospace;border-radius:3px;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}
                  >
                    {entry}
                  </li>
                ))
              )
            }
          </ul>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Memo()</code> must be a pure function — only reads signals,
          never writes them. When <code>discount</code> changes, all cached
          values recompute at once.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Utilities/Memo",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MemoStory: Story = {
  name: "@Memo — per-argument cache",
  render: () => <MemoDemo />,
};
