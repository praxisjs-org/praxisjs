import { StatefulComponent } from "@praxisjs/core";
import { Component, FunctionProp, Prop } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Product {
  name: string;
  category: "Fruit" | "Bakery" | "Dairy";
  price: number;
}

type ProductFilter = (product: Product) => boolean;

@Component()
class FilteredProducts extends StatefulComponent {
  @Prop() items: Product[] = [];
  @FunctionProp() filter: ProductFilter = () => true;

  render() {
    return (
      <section style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:280px;max-width:420px">
        <h3 style="margin:0;font-size:1rem">@FunctionProp - function values</h3>
        <ul style="display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none">
          {() => this.items.filter((item) => this.filter(item)).map((item) => (
            <li style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #ddd;border-radius:6px;padding:8px 10px">
              <span style="display:flex;flex-direction:column;gap:2px">
                <strong style="font-size:.92rem">{item.name}</strong>
                <small style="color:#666">{item.category}</small>
              </span>
              <span style="font-variant-numeric:tabular-nums;color:#3b6f53">
                ${item.price.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}

const products: Product[] = [
  { name: "Apple", category: "Fruit", price: 1.8 },
  { name: "Sourdough", category: "Bakery", price: 6.5 },
  { name: "Yogurt", category: "Dairy", price: 3.4 },
  { name: "Croissant", category: "Bakery", price: 4.2 },
];

const meta: Meta = {
  title: "Decorators/State & Props/FunctionProp",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FunctionFilter: Story = {
  name: "@FunctionProp - filtering function",
  render: () => (
    <FilteredProducts
      items={products}
      filter={(product) => product.category === "Bakery"}
    />
  ),
};
