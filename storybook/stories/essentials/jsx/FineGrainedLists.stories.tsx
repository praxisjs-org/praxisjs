import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Todo { text: string; done: boolean }

@Component()
class FineGrainedListsDemo extends StatefulComponent {
  @State() ids: number[] = [1, 2, 3];
  @State() todos: Record<number, Todo> = {
    1: { text: "Learn PraxisJS signals", done: true },
    2: { text: "Build a component", done: false },
    3: { text: "Ship to production", done: false },
  };

  update(id: number, patch: Partial<Todo>) {
    this.todos = { ...this.todos, [id]: { ...this.todos[id], ...patch } };
  }

  add() {
    const id = Date.now();
    this.todos = { ...this.todos, [id]: { text: "", done: false } };
    this.ids = [...this.ids, id];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">JSX — fine-grained rows</h3>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          {() => this.ids.map((id) => (
            <li
              style={() => `display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;background:${this.todos[id].done ? "#f0fdf4" : "#fafafa"};border:1px solid ${this.todos[id].done ? "#bbf7d0" : "#e5e7eb"}`}
            >
              <input
                type="checkbox"
                checked={() => this.todos[id].done}
                onChange={() => { this.update(id, { done: !this.todos[id].done }); }}
              />
              <input
                style="flex:1;border:none;background:transparent;font-size:.88rem"
                placeholder="Type here…"
                value={() => this.todos[id].text}
                onInput={(e: Event) => { this.update(id, { text: (e.target as HTMLInputElement).value }); }}
              />
            </li>
          ))}
        </ul>
        <button
          style="align-self:flex-start;padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
          onClick={() => { this.add(); }}
        >Add row</button>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          The list arrow reads only <code>ids</code>; each row reads its own content in nested arrows.
          Type in a row or toggle a checkbox: the rows are not rebuilt, so the caret and focus stay put.
          Only <em>Add row</em> rebuilds the list.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/JSX/FineGrainedLists",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FineGrainedLists: Story = {
  name: "Lists — fine-grained rows",
  render: () => <FineGrainedListsDemo />,
};
