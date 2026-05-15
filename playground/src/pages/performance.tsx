import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Lazy, State, getter } from "@praxisjs/decorators";
import { VirtualList, type VirtualItem } from "@praxisjs/composables";
import { Route } from "@praxisjs/router";

// ─── @Lazy demo component ─────────────────────────────────────────────────────

@Lazy(120)
@Component()
class HeavyChart extends StatefulComponent {
  @State() bars = Array.from({ length: 20 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: Math.round(30 + Math.random() * 70),
  }));

  randomize() {
    this.bars = this.bars.map((b) => ({
      ...b,
      value: Math.round(30 + Math.random() * 70),
    }));
  }

  render() {
    return (
      <div class="card lazy-card">
        <div class="lazy-badge">✓ Rendered lazily</div>
        <p class="count-label" style="margin-bottom:16px">
          This component was deferred until it entered the viewport.
        </p>
        <div class="bar-chart">
          {() =>
            this.bars.map((b) => (
              <div class="bar-row" key={b.label}>
                <span class="bar-name">{b.label}</span>
                <div class="bar-track">
                  <div class="bar-fill" style={() => `width:${b.value}%`} />
                </div>
                <span class="bar-val">{() => b.value}%</span>
              </div>
            ))
          }
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button onClick={() => { this.randomize(); }}>Randomize</button>
        </div>
      </div>
    );
  }
}

// ─── @VirtualList composable demo ────────────────────────────────────────────

interface Row {
  id: number;
  name: string;
  email: string;
  score: number;
  status: "active" | "inactive" | "pending";
}

const STATUSES: Row["status"][] = ["active", "inactive", "pending"];

const ROWS: Row[] = Array.from({ length: 50_000 }, (_, i) => ({
  id: i + 1,
  name: `User #${String(i + 1).padStart(5, "0")}`,
  email: `user${i + 1}@example.com`,
  score: Math.round(Math.random() * 100),
  status: STATUSES[i % 3],
}));

// ─── Page ─────────────────────────────────────────────────────────────────────

@Route("/performance")
@Component()
export default class PerformancePage extends StatefulComponent {
  @State() filterText = "";

  containerRef = { current: null as HTMLDivElement | null };

  get filteredRows(): Row[] {
    const q = this.filterText.toLowerCase();
    return q
      ? ROWS.filter((r) => r.name.toLowerCase().includes(q) || r.email.includes(q))
      : ROWS;
  }

  @Compose(VirtualList, "containerRef", getter("filteredRows"), 48, 5)
  virtual!: VirtualList<Row>;

  render() {
    return (
      <div class="page">

        {/* ── @Lazy ─────────────────────────────────────────── */}
        <div class="page-hero">
          <h1>Performance</h1>
          <p>
            <code>@Lazy</code> defers rendering until the component enters the
            viewport. <code>VirtualList</code> renders only the visible rows of
            a large list.
          </p>
        </div>

        <div class="section-title">
          <h2>@Lazy — viewport-deferred rendering</h2>
          <p class="section-desc">
            Scroll down past the spacer — the chart only renders once it enters
            the viewport.
          </p>
        </div>

        <div class="lazy-spacer"><span>↓ Keep scrolling ↓</span></div>

        <HeavyChart />

        <div class="section-divider" />

        {/* ── VirtualList ───────────────────────────────────── */}
        <div class="section-title">
          <h2>VirtualList composable — 50 000 rows</h2>
          <p class="section-desc">
            Only visible rows (+ 5 buffer) are in the DOM. Scroll freely —
            node count stays constant.
          </p>
        </div>

        <div class="card wide" style="padding:0;overflow:hidden">
          <div class="virt-toolbar">
            <input
              class="text-input"
              placeholder="Filter by name or email…"
              value={() => this.filterText}
              onInput={(e: Event) => {
                this.filterText = (e.target as HTMLInputElement).value;
              }}
            />
            <span class="virt-count">
              {() => this.filteredRows.length.toLocaleString()} rows
            </span>
          </div>

          <div class="virt-header">
            <span class="virt-id">ID</span>
            <span class="virt-name">Name</span>
            <span class="virt-email">Email</span>
            <span class="virt-status">Status</span>
            <span class="virt-score">Score</span>
          </div>

          <div
            ref={(el: HTMLDivElement) => { this.containerRef.current = el; }}
            class="virt-container"
          >
            <div style={() => `height:${this.virtual.totalHeight}px;position:relative`}>
              <div style={() => `height:${this.virtual.offsetTop}px`} />
              {() => (this.virtual.visibleItems as VirtualItem<Row>[]).map(({ item }) => (
                <div class="virt-row" key={item.id}>
                  <span class="virt-id">{item.id}</span>
                  <span class="virt-name">{item.name}</span>
                  <span class="virt-email">{item.email}</span>
                  <span class={`virt-status virt-status--${item.status}`}>
                    {item.status}
                  </span>
                  <span class="virt-score">{item.score}</span>
                </div>
              ))}
              <div style={() => `height:${this.virtual.offsetBottom}px`} />
            </div>
          </div>
        </div>

        <div class="info-box" style="margin-top:24px">
          <strong>How VirtualList works:</strong> the composable tracks scroll
          position and exposes <code>visibleItems</code>, <code>totalHeight</code>,{" "}
          <code>offsetTop</code> and <code>offsetBottom</code> as reactive
          signals. The component renders the visible slice using normal JSX —
          no custom <code>renderItem</code> convention needed.
        </div>
      </div>
    );
  }
}
