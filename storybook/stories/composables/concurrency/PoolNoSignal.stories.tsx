import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Pool, PoolOf } from "@praxisjs/concurrent";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * @Pool without AbortSignal — no "signal" first param.
 *
 * cancelAll() instantly resolves all pending items as undefined and removes
 * them from the queue, but the already-running operations keep executing
 * until they finish naturally. Their results are simply ignored.
 * Add "signal: AbortSignal" as first param to abort active ops too.
 */

type FileEntry = {
  name: string;
  status: "queued" | "uploading" | "done" | "dropped" | "error";
};

@Component()
class PoolNoSignalDemo extends StatefulComponent {
  @State() files: FileEntry[] = [];
  @State() ghostUploads = 0;

  async uploadFile(name: string) {
    this.ghostUploads++;
    await new Promise<void>((r) => setTimeout(r, 1200 + Math.random() * 1200));
    this.ghostUploads--;
    this.files = this.files.map((f) =>
      f.name === name && f.status === "uploading"
        ? { ...f, status: Math.random() > 0.15 ? "done" : "error" }
        : f,
    );
  }

  @Pool("uploadFile", 2)
  taskUpload!: PoolOf<PoolNoSignalDemo, "uploadFile">;

  enqueue(count: number) {
    const batch = Array.from({ length: count }, (_, i) => ({
      name: `file-${(Date.now() % 10000).toString().padStart(4, "0")}-${i + 1}.bin`,
      status: "queued" as const,
    }));
    this.files = [...this.files, ...batch];
    batch.forEach((f) => {
      void this.taskUpload(f.name).then((result) => {
        if (result === undefined) {
          this.files = this.files.map((x) =>
            x.name === f.name && x.status === "queued" ? { ...x, status: "dropped" } : x,
          );
        }
      });
    });
  }

  cancelAll() {
    this.taskUpload.cancelAll();
    this.files = this.files.map((f) =>
      f.status === "queued" ? { ...f, status: "dropped" } : f,
    );
  }

  render() {
    const bg = (s: FileEntry["status"]) => ({
      queued: "#f9fafb", uploading: "#ede9fe", done: "#f0fdf4", dropped: "#fafafa", error: "#fef2f2",
    }[s]);
    const border = (s: FileEntry["status"]) => ({
      queued: "#e5e7eb", uploading: "#ddd6fe", done: "#bbf7d0", dropped: "#e5e7eb", error: "#fca5a5",
    }[s]);
    const color = (s: FileEntry["status"]) => ({
      queued: "#9ca3af", uploading: "#5b21b6", done: "#16a34a", dropped: "#9ca3af", error: "#dc2626",
    }[s]);
    const icon = (s: FileEntry["status"]) => ({
      queued: "○", uploading: "⏳", done: "✓", dropped: "↩", error: "✗",
    }[s]);

    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:340px;max-width:420px">
        <div>
          <h3 style="margin:0 0 2px;font-size:1rem">@Pool(2) — without AbortSignal</h3>
          <p style="margin:0;font-size:.78rem;color:#6b7280">
            No <code>signal</code> param → <code>cancelAll()</code> drops <em>queued</em> items instantly
            but active uploads keep running until they finish.
          </p>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button
            style="padding:6px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.88rem;font-weight:500"
            onClick={() => { this.enqueue(5); }}
          >
            Queue 5 files
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.cancelAll(); }}
          >
            Cancel all
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.files = []; }}
          >
            Reset
          </button>
        </div>

        <div style="display:flex;gap:20px;font-size:.82rem;color:#555">
          <span>Active: <strong style="color:#6d5bbd">{() => this.taskUpload.active()}</strong></span>
          <span>Queued: <strong>{() => this.taskUpload.pending()}</strong></span>
        </div>

        {() => this.ghostUploads > 0 && (
          <div style="display:flex;gap:6px;padding:8px 12px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a;font-size:.8rem;color:#92400e;align-items:center">
            <span>⚠</span>
            <span>
              <strong>{this.ghostUploads}</strong> upload{this.ghostUploads > 1 ? "s" : ""} still running in the background (timer not cleared).
            </span>
          </div>
        )}

        {() => this.files.length === 0
          ? <p style="margin:0;font-size:.82rem;color:#d1d5db">Queue files to see pool in action.</p>
          : (
            <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;max-height:220px;overflow-y:auto">
              {() => this.files.map((f) => (
                <li
                  key={f.name}
                  style={`display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border-radius:5px;font-size:.79rem;background:${bg(f.status)};border:1px solid ${border(f.status)}`}
                >
                  <span style="font-family:monospace">{f.name}</span>
                  <span style={`font-weight:600;color:${color(f.status)}`}>{icon(f.status)} {f.status}</span>
                </li>
              ))}
            </ul>
          )
        }

        <p style="margin:0;font-size:.75rem;color:#d1d5db">
          Add <code>signal: AbortSignal</code> as first param to abort active uploads immediately.
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

export const PoolNoSignalStory: Story = {
  name: "@Pool — without signal",
  render: () => <PoolNoSignalDemo />,
};
