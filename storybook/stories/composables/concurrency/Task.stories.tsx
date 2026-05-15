import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Task, TaskOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class TaskDemo extends StatefulComponent {
  @State() userId = 1;
  @State() user: { name: string; email: string } | null = null;

  async loadUser(id: number) {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
    if (id % 5 === 0) throw new Error(`User ${id} not found`);
    this.user = { name: `User #${id}`, email: `user${id}@example.com` };
  }

  @Task("loadUser")
  taskLoadUser!: TaskOf<TaskDemo, "loadUser">;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Task — concurrent calls, last one wins</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:.9rem">
            User ID
            <input
              type="number" min="1" max="20"
              style="width:60px;padding:5px 8px;border:1px solid #ccc;border-radius:5px"
              value={() => this.userId}
              onInput={(e: Event) => { this.userId = Number((e.target as HTMLInputElement).value); }}
            />
          </label>
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { void this.taskLoadUser(this.userId); }}
          >
            Load
          </button>
          {() => this.taskLoadUser.loading() && (
            <span style="font-size:.82rem;color:#9ca3af">Loading…</span>
          )}
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
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Click Load rapidly with different IDs — only the last result updates the UI.
          ID divisible by 5 throws an error. <code>taskLoadUser.loading()</code> and <code>.error()</code> are reactive.
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
