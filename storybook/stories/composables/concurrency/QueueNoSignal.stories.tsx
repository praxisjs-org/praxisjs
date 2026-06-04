import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Queue, QueueOf, QueueClearedError } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * @Queue without AbortSignal — no "signal" first param.
 *
 * clear() cancels pending items (they get QueueClearedError), but the
 * currently running item keeps running to completion. Its result is
 * simply dropped once it finishes.
 * Add "signal: AbortSignal" as the first param to abort it early too.
 */

type LogEntry = { label: string; status: "running" | "done" | "cancelled"; ms?: number };

@Component()
class QueueNoSignalDemo extends StatefulComponent {
  @State() log: LogEntry[] = [];

  async processItem(label: string) {
    const start = Date.now();
    await new Promise<void>((r) => setTimeout(r, 800 + Math.random() * 500));
    const ms = Date.now() - start;
    this.log = this.log.map((e) =>
      e.label === label && e.status === "running" ? { ...e, status: "done", ms } : e,
    );
  }

  @Queue("processItem")
  taskProcess!: QueueOf<QueueNoSignalDemo, "processItem">;

  async enqueue(name: string) {
    this.log = [...this.log, { label: name, status: "running" }];
    try {
      await this.taskProcess(name);
    } catch (e) {
      if (e instanceof QueueClearedError) {
        this.log = this.log.map((entry) =>
          entry.label === name && entry.status === "running"
            ? { ...entry, status: "cancelled" }
            : entry,
        );
      }
    }
  }

  render() {
    const bg = (s: LogEntry["status"]) =>
      s === "done" ? "#f0fdf4" : s === "cancelled" ? "#fafafa" : "#ede9fe";
    const border = (s: LogEntry["status"]) =>
      s === "done" ? "#bbf7d0" : s === "cancelled" ? "#e5e7eb" : "#ddd6fe";
    const color = (s: LogEntry["status"]) =>
      s === "done" ? "#16a34a" : s === "cancelled" ? "#9ca3af" : "#5b21b6";
    const label = (e: LogEntry) =>
      e.status === "done"      ? `✓ done (${e.ms}ms)`
      : e.status === "cancelled" ? "↩ cancelled (pending only)"
      : "⏳ running…";

    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:340px;max-width:420px">
        <div>
          <h3 style="margin:0 0 2px;font-size:1rem">@Queue — without AbortSignal</h3>
          <p style="margin:0;font-size:.78rem;color:#6b7280">
            No <code>signal</code> param → <code>clear()</code> only cancels <em>pending</em> items.
            The running item's timer keeps ticking until it finishes.
          </p>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {["alpha", "beta", "gamma", "delta"].map((name) => (
            <button
              key={name}
              style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { void this.enqueue(name); }}
            >
              + {name}
            </button>
          ))}
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.taskProcess.clear(); }}
          >
            Clear
          </button>
        </div>

        <div style="display:flex;gap:20px;font-size:.82rem;color:#555">
          <span>Running: <strong style="color:#6d5bbd">{() => this.taskProcess.loading() ? "yes" : "no"}</strong></span>
          <span>Pending: <strong>{() => this.taskProcess.pending()}</strong></span>
        </div>

        <div style="display:flex;gap:6px;padding:8px 12px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a;font-size:.8rem;color:#92400e;align-items:flex-start">
          <span style="margin-top:1px">⚠</span>
          <span>
            Clear only cancels <em>pending</em> items. The currently running item completes before the queue stops.
            Add <code>signal: AbortSignal</code> as first param to abort it early.
          </span>
        </div>

        {() => this.log.length === 0
          ? <p style="margin:0;font-size:.82rem;color:#d1d5db">Queue items above, then try Clear while one is running.</p>
          : (
            <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto">
              {() => [...this.log].reverse().map((e, i) => (
                <li
                  key={`${e.label}-${i}`}
                  style={`display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:5px;font-size:.8rem;background:${bg(e.status)};border:1px solid ${border(e.status)}`}
                >
                  <span style="font-family:monospace;font-weight:500">{e.label}</span>
                  <span style={`color:${color(e.status)};font-size:.75rem`}>{label(e)}</span>
                </li>
              ))}
            </ul>
          )
        }
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

export const QueueNoSignalStory: Story = {
  name: "@Queue — without signal",
  render: () => <QueueNoSignalDemo />,
};
