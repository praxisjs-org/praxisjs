import { StatefulComponent } from "@praxisjs/core";
import { Component, Selector, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

const ROWS = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, label: `Row #${String(i + 1).padStart(3, "0")}` }));

@Component()
class SelectorDemo extends StatefulComponent {
  @State() selected = 0;
  @Selector("selected") isSelected!: Selector<number>;

  @State() naiveRuns = 0;
  @State() selectorRuns = 0;

  private naiveCount = 0;
  private selectorCount = 0;

  select(id: number) {
    this.naiveCount = 0;
    this.selectorCount = 0;
    this.selected = id;
    this.naiveRuns = this.naiveCount;
    this.selectorRuns = this.selectorCount;
  }

  naiveClass(id: number) {
    this.naiveCount++;
    return this.selected === id ? "on" : "";
  }

  selectorClass(id: number) {
    this.selectorCount++;
    return this.isSelected(id) ? "on" : "";
  }

  list(title: string, runs: () => number, rowClass: (id: number) => string) {
    return (
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <p style="margin:0;font-size:.85rem;font-weight:600">{title}</p>
        <p style="margin:0;font-size:.78rem;color:#6b7280">
          Bindings re-run on last click: <strong style="color:#6d5bbd">{() => runs()}</strong>
        </p>
        <ul style="margin:0;padding:0;list-style:none;height:220px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px">
          {ROWS.map((row) => (
            <li
              class={() => rowClass(row.id)}
              style="padding:5px 10px;font-size:.82rem;cursor:pointer;border-bottom:1px solid #f3f4f6"
              onClick={() => { this.select(row.id); }}
            >
              {row.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:480px">
        <style>{".on{background:#ede9fe;color:#5b21b6;font-weight:600}"}</style>
        <h3 style="margin:0;font-size:1rem">@Selector — notify only the rows that changed</h3>
        <p style="margin:0;font-size:.82rem;color:#6b7280">
          Click any row. Both lists share the same <code>selected</code> state.
        </p>
        <div style="display:flex;gap:14px">
          {this.list("this.selected === id", () => this.naiveRuns, (id) => this.naiveClass(id))}
          {this.list("this.isSelected(id)", () => this.selectorRuns, (id) => this.selectorClass(id))}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Every row comparing <code>selected</code> directly re-runs on each click. With{" "}
          <code>@Selector("selected")</code> only the previous and the next row do.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Performance/Selector",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const SelectorStory: Story = {
  name: "@Selector — keyed selection",
  render: () => <SelectorDemo />,
};
