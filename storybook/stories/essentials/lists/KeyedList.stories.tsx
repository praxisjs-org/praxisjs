import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { For } from "@praxisjs/runtime";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Fruit { id: number; name: string }

const FRUITS = ["Apple", "Banana", "Cherry", "Date", "Elderberry", "Fig"];
let nextId = FRUITS.length;

const button = "padding:5px 12px;border-radius:6px;border:1px solid #d4d4d8;background:#fff;cursor:pointer;font-size:.82rem";

@Component()
class KeyedListDemo extends StatefulComponent {
  @State() fruits: Fruit[] = FRUITS.map((name, id) => ({ id, name }));
  @State() renders = 0;

  shuffle() {
    const next = this.fruits.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    this.fruits = next;
  }

  swapEnds() {
    if (this.fruits.length < 2) return;
    const next = this.fruits.slice();
    [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
    this.fruits = next;
  }

  add() {
    this.fruits = [...this.fruits, { id: nextId, name: `Fruit #${String(nextId)}` }];
    nextId++;
  }

  remove(id: number) {
    this.fruits = this.fruits.filter((f) => f.id !== id);
  }

  rename(id: number) {
    this.fruits = this.fruits.map((f) => (f.id === id ? { ...f, name: f.name.toUpperCase() } : f));
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:340px">
        <h3 style="margin:0;font-size:1rem">For — keyed rows</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button style={button} onClick={() => { this.shuffle(); }}>Shuffle</button>
          <button style={button} onClick={() => { this.swapEnds(); }}>Swap first and last</button>
          <button style={button} onClick={() => { this.add(); }}>Add</button>
          <button style={button} onClick={() => { this.fruits = []; }}>Clear</button>
        </div>
        <ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          <For
            each={() => this.fruits}
            by={(fruit) => fruit.id}
            fallback={<li style="color:#9ca3af;font-size:.85rem">Empty. Press Add.</li>}
          >
            {(fruit, index) => {
              this.renders++;
              return (
                <li style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#fafafa;border:1px solid #e5e7eb">
                  <span style="width:20px;color:#9ca3af;font-size:.8rem">{() => index() + 1}</span>
                  <span style="flex:1;font-size:.88rem">{() => fruit().name}</span>
                  <input style="width:90px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px" placeholder="note" />
                  <button style={button} onClick={() => { this.rename(fruit().id); }}>Aa</button>
                  <button style={button} onClick={() => { this.remove(fruit().id); }}>✕</button>
                </li>
              );
            }}
          </For>
        </ol>
        <p style="margin:0;font-size:.78rem;color:#71717a">
          Row renders so far: <strong>{() => this.renders}</strong>. Type a note, then shuffle or swap: each
          note stays with its fruit because rows are moved, not rebuilt. <em>Aa</em> replaces the object under
          the same key and only the name updates. Only added rows are rendered.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lists/KeyedList",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const KeyedList: Story = {
  name: "For — keyed rows",
  render: () => <KeyedListDemo />,
};
