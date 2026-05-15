import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ListsDemo extends StatefulComponent {
  @State() todos: { id: number; text: string; done: boolean }[] = [
    { id: 1, text: "Learn PraxisJS signals", done: true },
    { id: 2, text: "Build a component", done: false },
    { id: 3, text: "Ship to production", done: false },
  ];

  @State() input = "";

  toggle(id: number) {
    this.todos = this.todos.map((t) => t.id === id ? { ...t, done: !t.done } : t);
  }

  add() {
    if (!this.input.trim()) return;
    this.todos = [...this.todos, { id: Date.now(), text: this.input.trim(), done: false }];
    this.input = "";
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">JSX — lists</h3>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          {() => this.todos.map((t) => (
            <li
              style={`display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;background:${t.done ? "#f0fdf4" : "#fafafa"};border:1px solid ${t.done ? "#bbf7d0" : "#e5e7eb"}`}
            >
              <input
                type="checkbox"
                checked={() => t.done}
                onChange={() => { this.toggle(t.id); }}
              />
              <span style={`font-size:.88rem;${t.done ? "text-decoration:line-through;color:#9ca3af" : ""}`}>{t.text}</span>
            </li>
          ))}
        </ul>
        <div style="display:flex;gap:6px">
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="New task…"
            value={() => this.input}
            onInput={(e: Event) => { this.input = (e.target as HTMLInputElement).value; }}
            onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter") this.add(); }}
          />
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.add(); }}
          >Add</button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          No reconciliation — when the signal changes, the arrow function re-runs and
          all list nodes are rebuilt from scratch. PraxisJS is fine-grained at the
          <em>arrow function</em> level, not the item level.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/JSX/Lists",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Lists: Story = {
  name: "Lists — no reconciliation",
  render: () => <ListsDemo />,
};
