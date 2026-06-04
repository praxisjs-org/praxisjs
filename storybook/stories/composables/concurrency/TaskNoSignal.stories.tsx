import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Task, TaskOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * @Task without AbortSignal — the method has no "signal" first param.
 *
 * cancelAll() resets loading and discards the in-flight result, but the
 * underlying async operation keeps running to completion in the background.
 * Use this when your API doesn't support cancellation.
 */

@Component()
class TaskNoSignalDemo extends StatefulComponent {
  @State() userId = 1;
  @State() user: { name: string; email: string } | null = null;
  @State() background = 0;

  async loadUser(id: number) {
    this.background++;
    await new Promise<void>((r) => setTimeout(r, 700 + Math.random() * 600));
    this.background--;
    if (id % 5 === 0) throw new Error(`User ${id} not found`);
    this.user = { name: `User #${id}`, email: `user${id}@example.com` };
  }

  @Task("loadUser")
  taskLoadUser!: TaskOf<TaskNoSignalDemo, "loadUser">;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:340px;max-width:420px">
        <div>
          <h3 style="margin:0 0 2px;font-size:1rem">@Task — without AbortSignal</h3>
          <p style="margin:0;font-size:.78rem;color:#6b7280">
            No <code>signal</code> param → the underlying operation keeps running in the background even after
            <code>cancelAll()</code>. Only the state update is suppressed.
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
            onClick={() => { void this.taskLoadUser(this.userId); }}
          >
            Load
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.taskLoadUser.cancelAll(); }}
          >
            Cancel
          </button>
          {() => this.taskLoadUser.loading() && (
            <span style="font-size:.8rem;color:#9ca3af">loading…</span>
          )}
        </div>

        <div style="display:flex;gap:6px;padding:8px 12px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a;font-size:.8rem;color:#92400e;align-items:center">
          <span>⚠</span>
          <span>
            Background ops still running: <strong>{() => this.background}</strong>.
            Cancel only suppresses the result — the timer keeps ticking.
          </span>
        </div>

        {() => this.taskLoadUser.error() && (
          <div style="padding:8px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:.85rem">
            {(this.taskLoadUser.error() as Error).message}
          </div>
        )}
        {() => this.user && !this.taskLoadUser.loading() && !this.taskLoadUser.error() && (
          <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:4px">
            <p style="margin:0;font-weight:700;font-size:.95rem">{this.user.name}</p>
            <p style="margin:0;font-size:.85rem;color:#6b7280">{this.user.email}</p>
          </div>
        )}

        <p style="margin:0;font-size:.75rem;color:#d1d5db">
          ID divisible by 5 → error. Add <code>signal: AbortSignal</code> as first param to get real cancellation.
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

export const TaskNoSignalStory: Story = {
  name: "@Task — without signal",
  render: () => <TaskNoSignalDemo />,
};
