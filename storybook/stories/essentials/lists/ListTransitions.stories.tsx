import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { createTransition } from "@praxisjs/motion";
import { For } from "@praxisjs/runtime";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Toast { id: number; message: string }

const fade = createTransition({ name: "toast", duration: 250 });
let nextId = 1;

const button = "padding:5px 12px;border-radius:6px;border:1px solid #d4d4d8;background:#fff;cursor:pointer;font-size:.82rem";

@Component()
class ListTransitionsDemo extends StatefulComponent {
  @State() toasts: Toast[] = [];

  push() {
    const id = nextId++;
    this.toasts = [{ id, message: `Saved draft #${String(id)}` }, ...this.toasts];
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <style>{`
          .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(16px); }
          .toast-enter-to, .toast-leave-from { opacity: 1; transform: none; }
          .toast-row { transition: opacity .25s ease, transform .25s ease; }
        `}</style>
        <h3 style="margin:0;font-size:1rem">For — enter and leave transitions</h3>
        <div style="display:flex;gap:6px">
          <button style={button} onClick={() => { this.push(); }}>Show toast</button>
          <button style={button} onClick={() => { this.toasts = []; }}>Dismiss all</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;min-height:40px">
          <For each={() => this.toasts} by="id" transition={fade}>
            {(toast) => (
              <div class="toast-row" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:#18181b;color:#fff;font-size:.85rem">
                <span style="flex:1">{() => toast().message}</span>
                <button
                  style="border:none;background:transparent;color:#a1a1aa;cursor:pointer"
                  onClick={() => { this.dismiss(toast().id); }}
                >✕</button>
              </div>
            )}
          </For>
        </div>
        <p style="margin:0;font-size:.78rem;color:#71717a">
          <code>transition</code> takes <code>createTransition()</code> from <code>@praxisjs/motion</code>.
          A dismissed toast stays in place until its leave animation finishes, and the others are not
          moved or rebuilt while it leaves.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lists/ListTransitions",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ListTransitions: Story = {
  name: "For — transitions",
  render: () => <ListTransitionsDemo />,
};
