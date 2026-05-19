import { StatefulComponent } from "@praxisjs/core";
import { Component, Resource, type ResourceInstance } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface FocusItem {
  n: number;
  at: string;
}

const ts = () => new Date().toLocaleTimeString("en", { hour12: false });

let focusN = 0;
const fetchOnFocus = (): Promise<FocusItem> =>
  new Promise((res) =>
    setTimeout(() => res({ n: ++focusN, at: ts() }), 600),
  );

// ─── Demo component ───────────────────────────────────────────────────────────

@Component()
class RefetchOnFocusDemo extends StatefulComponent {
  @Resource(() => fetchOnFocus(), { refetchOnFocus: true })
  item!: ResourceInstance<FocusItem>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:420px">
        <h3 style="margin:0;font-size:1rem">@Resource — refetchOnFocus</h3>

        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:2rem;font-weight:700;color:#374151;line-height:1;font-variant-numeric:tabular-nums">
              {() => this.item.data()?.n ?? "—"}
            </span>
            <div>
              <p style="margin:0;font-size:.78rem;color:#9ca3af">fetch count</p>
              {() =>
                this.item.data() ? (
                  <p style="margin:0;font-size:.78rem;color:#6b7280">
                    last at {this.item.data()!.at}
                  </p>
                ) : null
              }
            </div>
            {() =>
              this.item.pending() ? (
                <span style="margin-left:auto;padding:2px 8px;border-radius:99px;font-size:.72rem;font-weight:600;background:#fef9c3;color:#854d0e">
                  Fetching…
                </span>
              ) : null
            }
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">
          <p style="margin:0;font-size:.82rem;color:#374151;font-weight:600">
            Simulate tab focus
          </p>
          <p style="margin:0;font-size:.8rem;color:#6b7280">
            The resource refetches automatically on{" "}
            <code>document.visibilitychange</code> when the tab becomes visible.
            Click to simulate returning to the tab:
          </p>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem;align-self:start"
            onClick={() => {
              Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => "visible",
              });
              document.dispatchEvent(new Event("visibilitychange"));
            }}
          >
            ↩ Simulate returning to tab
          </button>
        </div>

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>How it works:</strong> with <code>refetchOnFocus: true</code>, the
          resource listens for <code>visibilitychange</code> events. When the document
          becomes visible again (user switches back to the tab), a new fetch is
          triggered automatically — keeping data fresh without polling.
        </div>
      </div>
    );
  }
}

// ─── Story ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Essentials/Async Data/RefetchOnFocus",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const RefetchOnFocus: Story = {
  name: "@Resource — refetchOnFocus",
  render: () => <RefetchOnFocusDemo />,
};
