import { StatefulComponent } from "@praxisjs/core";
import { Component, Synced } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class SyncedDemo extends StatefulComponent {
  @Synced("sb:sync-count") count = 0;
  @Synced("sb:sync-message") message = "";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Synced — real-time cross-tab sync</h3>

        <div style="padding:10px 14px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;font-size:.85rem;color:#713f12">
          Open this story in a second browser tab to see live sync in action.
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <p style="margin:0;font-size:.85rem;font-weight:600;color:#555">Counter</p>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:2.5rem;font-weight:800;font-variant-numeric:tabular-nums;min-width:3ch;text-align:center;color:#6d5bbd">
              {() => this.count}
            </span>
            <div style="display:flex;gap:6px">
              <button
                style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
                onClick={() => { this.count++; }}
              >+1</button>
              <button
                style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
                onClick={() => { this.count--; }}
              >−1</button>
              <button
                style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#888"
                onClick={() => { this.count = 0; }}
              >Reset</button>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <p style="margin:0;font-size:.85rem;font-weight:600;color:#555">Shared message</p>
          <input
            style="padding:7px 10px;border:1px solid #ccc;border-radius:6px;font-family:inherit"
            placeholder="Type something…"
            value={() => this.message}
            onInput={(e: Event) => { this.message = (e.target as HTMLInputElement).value; }}
          />
          <p style="margin:0;font-size:1rem;font-weight:600;color:#6d5bbd;min-height:1.5rem">
            {() => this.message || "—"}
          </p>
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          Uses <code>BroadcastChannel</code> — no server, no WebSocket, instant sync between tabs on the same origin.
          Combine with <code>@Persisted</code> for both persistence and live sync.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Synced",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <SyncedDemo />,
};
