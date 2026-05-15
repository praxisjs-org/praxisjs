import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import { Store, UseStore, ReactiveStore } from "@praxisjs/store";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Shared store ─────────────────────────────────────────────────────────────

interface Product { id: number; name: string; price: number }
interface CartItem extends Product { qty: number }

@Store()
class CartStore extends ReactiveStore {
  @State() items: CartItem[] = [];
  @State() discount = 0;

  @Computed()
  get subtotal() {
    return this.items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  @Computed()
  get total() {
    return this.subtotal * (1 - this.discount);
  }

  add(product: Product) {
    const existing = this.items.find((i) => i.id === product.id);
    if (existing) {
      this.items = this.items.map((i) =>
        i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
      );
    } else {
      this.items = [...this.items, { ...product, qty: 1 }];
    }
  }

  remove(id: number) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  clear() {
    this.items = [];
    this.discount = 0;
  }
}

// ─── Product list ─────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: 1, name: "Signal Core", price: 9.99 },
  { id: 2, name: "Decorator Pack", price: 14.99 },
  { id: 3, name: "Runtime Engine", price: 24.99 },
  { id: 4, name: "Router Module", price: 12.99 },
];

@Component()
class ProductList extends StatefulComponent {
  @UseStore(CartStore) cart!: CartStore;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:5px">
        {PRODUCTS.map((p) => (
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px">
            <span style="font-size:.88rem;font-weight:500">{p.name}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:.82rem;color:#9ca3af">${p.price.toFixed(2)}</span>
              <button
                style="padding:4px 10px;font-size:.78rem;border-radius:5px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
                onClick={() => { this.cart.add(p); }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
}

// ─── Cart summary ─────────────────────────────────────────────────────────────

@Component()
class CartSummary extends StatefulComponent {
  @UseStore(CartStore) cart!: CartStore;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;min-width:220px">
        <p style="margin:0;font-weight:700;font-size:.92rem">
          Cart ({() => this.cart.items.length} item{() => this.cart.items.length !== 1 ? "s" : ""})
        </p>

        {() => this.cart.items.length === 0
          ? <p style="margin:0;font-size:.85rem;color:#d1d5db">Empty</p>
          : this.cart.items.map((item) => (
            <div style="display:flex;justify-content:space-between;font-size:.83rem">
              <span>{item.name} ×{item.qty}</span>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="color:#555">${(item.price * item.qty).toFixed(2)}</span>
                <button
                  style="all:unset;cursor:pointer;font-size:.9rem;color:#d1d5db"
                  onClick={() => { this.cart.remove(item.id); }}
                >✕</button>
              </div>
            </div>
          ))
        }

        <div style="border-top:1px solid #e5e7eb;padding-top:8px;display:flex;flex-direction:column;gap:6px">
          <label style="display:flex;align-items:center;gap:6px;font-size:.8rem">
            Discount
            <input
              type="range" min="0" max="50" style="flex:1"
              value={() => Math.round(this.cart.discount * 100)}
              onInput={(e: Event) => { this.cart.discount = Number((e.target as HTMLInputElement).value) / 100; }}
            />
            <span style="min-width:3ch;font-variant-numeric:tabular-nums">{() => Math.round(this.cart.discount * 100)}%</span>
          </label>
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.9rem">
            <span>Total</span>
            <span>${() => this.cart.total.toFixed(2)}</span>
          </div>
        </div>

        <button
          style="padding:6px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.8rem;color:#9ca3af"
          onClick={() => { this.cart.clear(); }}
        >
          Clear cart
        </button>
      </div>
    );
  }
}

// ─── Story wrapper ────────────────────────────────────────────────────────────

@Component()
class StoreDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:360px">
        <h3 style="margin:0;font-size:1rem">@Store / @UseStore — shared global state</h3>
        <p style="margin:0;font-size:.82rem;color:#6b7280">
          <code>ProductList</code> and <code>CartSummary</code> share the same <code>CartStore</code> singleton.
          Changes in one update the other instantly.
        </p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
          <div style="flex:1;min-width:200px">
            <p style="margin:0 0 6px;font-size:.82rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">Products</p>
            <ProductList />
          </div>
          <CartSummary />
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/Store",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <StoreDemo />,
};
