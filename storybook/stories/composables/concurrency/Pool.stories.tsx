import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Pool, PoolOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class PoolDemo extends StatefulComponent {
  @State() files: { name: string; status: "queued" | "uploading" | "done" | "error" }[] = [];

  async uploadFile(name: string) {
    this.files = this.files.map((f) =>
      f.name === name ? { ...f, status: "uploading" } : f,
    );
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));
    if (Math.random() > 0.2) {
      this.files = this.files.map((f) =>
        f.name === name ? { ...f, status: "done" } : f,
      );
    } else {
      this.files = this.files.map((f) =>
        f.name === name ? { ...f, status: "error" } : f,
      );
    }
  }

  @Pool("uploadFile", 2)
  taskUpload!: PoolOf<PoolDemo, "uploadFile">;

  enqueue(count: number) {
    const newFiles = Array.from({ length: count }, (_, i) => ({
      name: `file-${Date.now() % 10000}-${i + 1}.bin`,
      status: "queued" as const,
    }));
    this.files = [...this.files, ...newFiles];
    newFiles.forEach((f) => { void this.taskUpload(f.name); });
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@Pool(2) — max 2 concurrent uploads</h3>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.enqueue(4); }}
          >
            Queue 4 files
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.files = []; }}
          >
            Clear
          </button>
          <span style="font-size:.82rem;color:#555">
            Running: <strong style="color:#6d5bbd">{() => this.taskUpload.active()}</strong>
            {" / "}
            Queued: <strong>{() => this.taskUpload.pending()}</strong>
          </span>
        </div>

        {() => this.files.length === 0
          ? <p style="margin:0;font-size:.82rem;color:#d1d5db">Queue files to see pool in action</p>
          : (
            <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto">
              {() => this.files.map((f) => (
                <li
                  key={f.name}
                  style={`display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:5px;font-size:.82rem;background:${f.status === "done" ? "#f0fdf4" : f.status === "error" ? "#fef2f2" : f.status === "uploading" ? "#ede9fe" : "#f9fafb"};border:1px solid ${f.status === "done" ? "#bbf7d0" : f.status === "error" ? "#fca5a5" : f.status === "uploading" ? "#ddd6fe" : "#e5e7eb"}`}
                >
                  <span style="font-family:monospace">{f.name}</span>
                  <span style={`font-size:.75rem;font-weight:600;color:${f.status === "done" ? "#16a34a" : f.status === "error" ? "#dc2626" : f.status === "uploading" ? "#5b21b6" : "#9ca3af"}`}>
                    {f.status}
                  </span>
                </li>
              ))}
            </ul>
          )
        }

        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Pool('uploadFile', 2)</code> — at most 2 uploads run concurrently.
          Extras wait in queue. <code>active()</code> = running now, <code>pending()</code> = waiting.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Concurrency/Pool",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PoolStory: Story = {
  name: "@Pool — concurrent limit",
  render: () => <PoolDemo />,
};
