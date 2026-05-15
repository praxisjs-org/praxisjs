import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Queue, QueueOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class QueueDemo extends StatefulComponent {
  @State() log: string[] = [];

  async processItem(label: string) {
    const start = Date.now();
    this.log = [`⏳ Processing "${label}"…`, ...this.log];
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
    const elapsed = Date.now() - start;
    this.log = this.log.map((l) =>
      l.includes(`"${label}"`) ? `✅ Done "${label}" (${elapsed}ms)` : l,
    );
  }

  @Queue("processItem")
  taskProcess!: QueueOf<QueueDemo, "processItem">;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Queue — serial execution, one at a time</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {["alpha", "beta", "gamma", "delta"].map((name) => (
            <button
              key={name}
              style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { void this.taskProcess(name); }}
            >
              Queue "{name}"
            </button>
          ))}
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.taskProcess.clear(); }}
          >
            Clear queue
          </button>
        </div>
        <div style="display:flex;gap:16px;font-size:.85rem;color:#555">
          <span>Running: <strong style="color:#6d5bbd">{() => this.taskProcess.loading() ? "yes" : "no"}</strong></span>
          <span>Queued: <strong style="color:#6d5bbd">{() => this.taskProcess.pending()}</strong></span>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;max-height:150px;overflow-y:auto">
          {() => this.log.length === 0
            ? <li style="font-size:.82rem;color:#aaa">Queue items to see serial execution</li>
            : this.log.slice(0, 8).map((entry, i) => (
              <li style={`padding:5px 10px;border-radius:4px;font-size:.8rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>
                {entry}
              </li>
            ))
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Calls are processed one at a time in the order queued.
          <code>.pending()</code> shows how many are waiting. <code>.clear()</code> cancels all pending calls.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Concurrency/Queue",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const QueueStory: Story = {
  name: "@Queue — serial execution",
  render: () => <QueueDemo />,
};
