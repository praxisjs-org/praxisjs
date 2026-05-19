import { StatefulComponent } from "@praxisjs/core";
import {
  Component,
  State,
  Resource,
  invalidateResource,
  type ResourceInstance,
} from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface DedupItem {
  n: number;
  at: string;
}

const ts = () => new Date().toLocaleTimeString("en", { hour12: false });

// Reset before each round so the card always shows "fetch #1" for that round.
let _roundFetches = 0;
let _onFetch: (() => void) | undefined;

const DEDUP_KEY = "dedup-story-key";

const fetchShared = (): Promise<DedupItem> => {
  _roundFetches++;
  _onFetch?.();
  return new Promise((res) =>
    setTimeout(() => res({ n: _roundFetches, at: ts() }), 900),
  );
};

// ─── Shared card (immediate: false — waits for invalidateResource) ────────────

@Component()
class DedupCard extends StatefulComponent {
  @Resource(() => fetchShared(), { key: DEDUP_KEY })
  item!: ResourceInstance<DedupItem>;

  render() {
    return (
      <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:.82rem;color:#374151">Component</span>
          {() => {
            const s = this.item.status();
            const bg =
              s === "pending" ? "#fef9c3" : s === "success" ? "#dcfce7" : "#f3f4f6";
            return (
              <span style={`padding:1px 7px;border-radius:99px;font-size:.7rem;font-weight:600;background:${bg}`}>
                {s}
              </span>
            );
          }}
        </div>
        <div style="font-size:.8rem;min-height:20px">
          {() =>
            this.item.data() ? (
              <span style="color:#374151">
                Fetch #{this.item.data()!.n} · {this.item.data()!.at}
              </span>
            ) : this.item.pending() ? (
              <span style="color:#9ca3af">Loading…</span>
            ) : (
              <span style="color:#d1d5db">idle</span>
            )
          }
        </div>
      </div>
    );
  }
}

// ─── Container ────────────────────────────────────────────────────────────────

@Component()
class DeduplicationDemo extends StatefulComponent {
  @State() requestCount = 0;
  @State() hasLoaded = false;

  onMount() {
    _onFetch = () => { this.requestCount++; };
  }

  onUnmount() {
    _onFetch = undefined;
  }

  reload() {
    _roundFetches = 0;
    this.requestCount = 0;
    invalidateResource(DEDUP_KEY);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:520px">
        <h3 style="margin:0;font-size:1rem">@Resource — deduplication</h3>

        <div style="display:flex;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px">
            <span style="font-size:.8rem;color:#6b7280">Actual requests:</span>
            <span style="font-size:1.1rem;font-weight:700;color:#374151;min-width:16px;text-align:center">
              {() => this.requestCount}
            </span>
            {() =>
              this.requestCount === 1 ? (
                <span style="font-size:.72rem;color:#16a34a;font-weight:600">✓ deduplicated</span>
              ) : null
            }
          </div>

          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.reload(); }}
          >
            ↺ Reload all
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <DedupCard />
          <DedupCard />
          <DedupCard />
        </div>

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>Three components, one request.</strong> On mount, all three fire
          simultaneously — the first starts the fetch and stores the in-flight promise,
          the others attach to it via <code>key: &quot;{DEDUP_KEY}&quot;</code>.
          Click "Reload all" to see the counter reset to 1 again on each round.
        </div>
      </div>
    );
  }
}

// ─── Story ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Essentials/Async Data/Deduplication",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Deduplication: Story = {
  name: "@Resource — deduplication",
  render: () => <DeduplicationDemo />,
};
