import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { For } from "@praxisjs/runtime";
import type { Meta, StoryObj } from "@praxisjs/storybook";
import { ReactiveStore } from "@praxisjs/store";

class Todo extends ReactiveStore {
  @State() text: string;
  @State() done: boolean;

  constructor(text: string, done = false) {
    super();
    this.text = text;
    this.done = done;
  }
}

@Component()
class FineGrainedListsDemo extends StatefulComponent {
  @State() todos: Todo[] = [
    new Todo("Learn PraxisJS signals", true),
    new Todo("Build a component"),
    new Todo("Ship to production"),
  ];

  add() {
    this.todos = [...this.todos, new Todo("")];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">JSX — fine-grained rows</h3>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
          <For each={() => this.todos}>
            {(todo) => (
              <li
                style={() => `display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;background:${todo().done ? "#f0fdf4" : "#fafafa"};border:1px solid ${todo().done ? "#bbf7d0" : "#e5e7eb"}`}
              >
                <input
                  type="checkbox"
                  checked={() => todo().done}
                  onChange={() => { todo().done = !todo().done; }}
                />
                <input
                  style="flex:1;border:none;background:transparent;font-size:.88rem"
                  placeholder="Type here…"
                  value={() => todo().text}
                  onInput={(e: Event) => { todo().text = (e.target as HTMLInputElement).value; }}
                />
              </li>
            )}
          </For>
        </ul>
        <button
          style="align-self:flex-start;padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
          onClick={() => { this.add(); }}
        >Add row</button>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Each row is a store with its own <code>@State()</code> fields, and <code>For</code> keys rows by the
          store itself. Typing or toggling writes one field and re-runs only that row's bindings, so the caret
          and focus stay put. <em>Add row</em> renders one new row and leaves the others alone.
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
