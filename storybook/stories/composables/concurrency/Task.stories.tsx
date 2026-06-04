import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Task, TaskOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type RequestEntry = {
  id: number;
  userId: number;
  status: "loading" | "done" | "aborted" | "error";
  ms?: number;
};

@Component()
class TaskDemo extends StatefulComponent {
  @State() userId = 1;
  @State() log: RequestEntry[] = [];

  private seq = 0;
  private startTimes = new Map<number, number>();

  async loadUser(signal: AbortSignal, reqId: number, userId: number) {
    const start = Date.now();
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 600 + Math.random() * 600);
        signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
      if (userId % 5 === 0) throw new Error(`User ${userId} not found`);
      this.log = this.log.map((e) =>
        e.id === reqId ? { ...e, status: "done", ms: Date.now() - start } : e,
      );
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof DOMException && err.name === "AbortError") {
        this.log = this.log.map((e) =>
          e.id === reqId ? { ...e, status: "aborted", ms } : e,
        );
      } else {
        this.log = this.log.map((e) =>
          e.id === reqId ? { ...e, status: "error", ms } : e,
        );
      }
    }
  }

  @Task("loadUser")
  taskLoadUser!: TaskOf<TaskDemo, "loadUser">;

  load() {
    const id = ++this.seq;
    this.log = [{ id, userId: this.userId, status: "loading" as const }, ...this.log].slice(0, 8);
    void this.taskLoadUser(id, this.userId);
  }

  cancel() {
    this.taskLoadUser.cancelAll();
    this.log = this.log.map((e) =>
      e.status === "loading" ? { ...e, status: "aborted" } : e,
    );
  }

  render() {
    const statusColor = (s: RequestEntry["status"]) =>
      s === "done" ? "#16a34a" : s === "aborted" ? "#9ca3af" : s === "error" ? "#dc2626" : "#6d5bbd";
    const statusLabel = (e: RequestEntry) =>
      e.status === "done"   ? `✓ done (${e.ms}ms)`
      : e.status === "aborted" ? `↩ aborted${e.ms !== undefined ? ` (${e.ms}ms)` : ""}`
      : e.status === "error"   ? `✗ error (${e.ms}ms)`
      : "⏳ loading…";

    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:340px;max-width:420px">
        <div>
          <h3 style="margin:0 0 2px;font-size:1rem">@Task — last call wins, previous aborted</h3>
          <p style="margin:0;font-size:.78rem;color:#6b7280">
            Each new request aborts the previous one via <code>AbortSignal</code>. The log below shows every attempt.
          </p>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:.88rem">
            User ID
            <input
              type="number" min="1" max="20"
              style="width:54px;padding:4px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:.88rem"
              value={() => this.userId}
              onInput={(e: Event) => { this.userId = Number((e.target as HTMLInputElement).value); }}
            />
          </label>
          <button
            style="padding:6px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.88rem;font-weight:500"
            onClick={() => { this.load(); }}
          >
            Load
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.cancel(); }}
          >
            Cancel
          </button>
          {() => this.taskLoadUser.loading() && (
            <span style="font-size:.8rem;color:#9ca3af;animation:pulse 1s infinite">loading…</span>
          )}
        </div>

        {() => this.log.length === 0 ? (
          <p style="margin:0;font-size:.82rem;color:#d1d5db;padding:12px 0">Click Load to start — try rapidly clicking with different IDs.</p>
        ) : (
          <table style="border-collapse:collapse;font-size:.8rem;width:100%">
            <thead>
              <tr style="border-bottom:1px solid #e5e7eb">
                <th style="text-align:left;padding:4px 8px 4px 0;color:#9ca3af;font-weight:500">#</th>
                <th style="text-align:left;padding:4px 8px;color:#9ca3af;font-weight:500">user</th>
                <th style="text-align:left;padding:4px 0;color:#9ca3af;font-weight:500">result</th>
              </tr>
            </thead>
            <tbody>
              {() => this.log.map((e) => (
                <tr key={e.id} style="border-bottom:1px solid #f3f4f6">
                  <td style="padding:5px 8px 5px 0;color:#d1d5db;font-family:monospace">{e.id}</td>
                  <td style="padding:5px 8px;font-family:monospace">#{e.userId}</td>
                  <td style={`padding:5px 0;color:${statusColor(e.status)};font-weight:${e.status === "loading" ? "400" : "500"}`}>
                    {statusLabel(e)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p style="margin:0;font-size:.75rem;color:#d1d5db">
          ID divisible by 5 → error. All state via <code>taskLoadUser.loading()</code> / <code>.error()</code> / <code>.lastResult()</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Concurrency/Task",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TaskStory: Story = {
  name: "@Task — last call wins",
  render: () => <TaskDemo />,
};
