import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Item { name: string; price: number; qty: number }

@Component()
class CartDemo extends StatefulComponent {
  @State() items: Item[] = [
    { name: "Signal Core", price: 9.99, qty: 1 },
    { name: "Decorator Pack", price: 14.99, qty: 2 },
  ];

  @Computed()
  get subtotal() {
    return this.items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  @Computed()
  get itemCount() {
    return this.items.reduce((s, i) => s + i.qty, 0);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Computed — cached derived state</h3>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          {() => this.items.map((item, i) => (
            <li style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:.88rem">
              <span>{item.name}</span>
              <div style="display:flex;align-items:center;gap:8px">
                <button
                  style="padding:1px 7px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
                  onClick={() => {
                    this.items = this.items.map((it, j) =>
                      j === i ? { ...it, qty: Math.max(1, it.qty - 1) } : it,
                    );
                  }}
                >−</button>
                <span style="font-variant-numeric:tabular-nums;min-width:1.2ch;text-align:center">{item.qty}</span>
                <button
                  style="padding:1px 7px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
                  onClick={() => {
                    this.items = this.items.map((it, j) =>
                      j === i ? { ...it, qty: it.qty + 1 } : it,
                    );
                  }}
                >+</button>
                <span style="color:#9ca3af;min-width:4ch;text-align:right">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div style="border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;font-weight:700">
          <span>{() => this.itemCount} item{() => this.itemCount !== 1 ? "s" : ""}</span>
          <span>${() => this.subtotal.toFixed(2)}</span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>subtotal</code> and <code>itemCount</code> recompute only when <code>items</code> changes — not on every render.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/State & Props/Computed",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ComputedCart: Story = {
  name: "@Computed — cached derived state",
  render: () => <CartDemo />,
};
