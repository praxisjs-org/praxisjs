import { StatefulComponent } from "@praxisjs/core";
import { Component, Resource, type ResourceInstance } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface FetchedItem {
  n: number;
  at: string;
}

const ts = () => new Date().toLocaleTimeString("en", { hour12: false });

// ─── Without key ─────────────────────────────────────────────────────────────

let noKeyN = 0;
const fetchNoKey = (): Promise<FetchedItem> =>
  new Promise((res) => setTimeout(() => res({ n: ++noKeyN, at: ts() }), 1200));

@Component()
class SWRNoKeyCard extends StatefulComponent {
  @Resource(() => fetchNoKey())
  item!: ResourceInstance<FetchedItem>;

  render() {
    return (
      <div style="padding:14px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-weight:600;font-size:.85rem;color:#374151">
            Without <code>key</code>
          </span>
          {() => {
            const s = this.item.status();
            const bg = s === "pending" ? "#fef9c3" : s === "success" ? "#dcfce7" : "#f3f4f6";
            return (
              <span style={`padding:2px 8px;border-radius:99px;font-size:.72rem;font-weight:600;background:${bg}`}>
                {s}
              </span>
            );
          }}
        </div>

        <div style="min-height:38px;font-size:.85rem">
          {() =>
            this.item.data() ? (
              <span style="color:#374151">
                Fetch #{this.item.data()!.n} · {this.item.data()!.at}
              </span>
            ) : (
              <span style="color:#9ca3af;font-style:italic">No data — blank during refetch</span>
            )
          }
        </div>

        <button
          style="padding:5px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.8rem;align-self:start"
          onClick={() => { this.item.refetch(); }}
          disabled={() => this.item.pending()}
        >
          Refetch
        </button>
      </div>
    );
  }
}

// ─── With key (SWR) ──────────────────────────────────────────────────────────

let swrN = 0;
const fetchSWR = (): Promise<FetchedItem> =>
  new Promise((res) => setTimeout(() => res({ n: ++swrN, at: ts() }), 1200));

@Component()
class SWRKeyCard extends StatefulComponent {
  @Resource(() => fetchSWR(), { key: "swr-story-demo" })
  item!: ResourceInstance<FetchedItem>;

  render() {
    return (
      <div style="padding:14px;border:1px solid #bae6fd;border-radius:8px;background:#f0f9ff;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-weight:600;font-size:.85rem;color:#374151">
            With <code>key</code> (SWR)
          </span>
          {() => {
            const isPendingWithData = this.item.pending() && this.item.data() !== null;
            if (isPendingWithData) {
              return (
                <span style="padding:2px 8px;border-radius:99px;font-size:.72rem;font-weight:600;background:#fef9c3;color:#854d0e">
                  Stale · Refreshing…
                </span>
              );
            }
            const s = this.item.status();
            const bg = s === "pending" ? "#fef9c3" : s === "success" ? "#dcfce7" : "#f3f4f6";
            return (
              <span style={`padding:2px 8px;border-radius:99px;font-size:.72rem;font-weight:600;background:${bg}`}>
                {s}
              </span>
            );
          }}
        </div>

        <div style="min-height:38px;font-size:.85rem">
          {() =>
            this.item.data() ? (
              <span style="color:#374151">
                Fetch #{this.item.data()!.n} · {this.item.data()!.at}
              </span>
            ) : (
              <span style="color:#9ca3af;font-style:italic">Fetching…</span>
            )
          }
        </div>

        <button
          style="padding:5px 12px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.8rem;align-self:start"
          onClick={() => { this.item.refetch(); }}
          disabled={() => this.item.pending()}
        >
          Refetch
        </button>
      </div>
    );
  }
}

// ─── Container ───────────────────────────────────────────────────────────────

@Component()
class SWRCompareDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:560px">
        <h3 style="margin:0;font-size:1rem">@Resource — stale-while-revalidate</h3>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <SWRNoKeyCard />
          <SWRKeyCard />
        </div>

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>Click both Refetch buttons.</strong> The left card data goes blank for 1.2 s
          (no key). The right card shows the stale value with a "Refreshing" badge — the UI
          is never blank because <code>key</code> enables SWR caching.
        </div>
      </div>
    );
  }
}

// ─── Story ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Essentials/Async Data/StaleWhileRevalidate",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StaleWhileRevalidate: Story = {
  name: "@Resource — stale-while-revalidate",
  render: () => <SWRCompareDemo />,
};
