import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Lazy, State, getter, Ref } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { VirtualList, type VirtualItem } from "@praxisjs/composables";
import { Route } from "@praxisjs/router";
import { cx, Styled } from "@praxisjs/css";

import {
  PageStyles, CardStyles, DemoStyles, FormStyles,
  SectionStyles, BarChartStyles, VirtStyles,
} from "../shared-styles";

// ─── @Lazy demo component ─────────────────────────────────────────────────────

@Lazy(120)
@Component()
class HeavyChart extends StatefulComponent {
  @State() bars = Array.from({ length: 20 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: Math.round(30 + Math.random() * 70),
  }));

  @Styled(BarChartStyles) $bc!: BarChartStyles;

  randomize() {
    this.bars = this.bars.map((b) => ({ ...b, value: Math.round(30 + Math.random() * 70) }));
  }

  render() {
    return (
      <div style="background:var(--color-bg-elv);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:36px 40px;display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-md)">
        <div class={this.$bc.$badge}>✓ Rendered lazily</div>
        <p style="font-size:.78rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:8px">
          This component was deferred until it entered the viewport.
        </p>
        <div class={this.$bc.$chart}>
          {() => this.bars.map((b) => (
            <div class={this.$bc.$row} key={b.label}>
              <span class={this.$bc.$name}>{b.label}</span>
              <div class={this.$bc.$track}>
                <div class={this.$bc.$fill} style={() => `width:${b.value}%`} />
              </div>
              <span class={this.$bc.$val}>{() => b.value}%</span>
            </div>
          ))}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
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

@Head({ title: "Performance — PraxisJS", description: "@Lazy, VirtualList, and performance patterns." })
@Route("/performance")
@Component()
export default class PerformancePage extends StatefulComponent {
  @State() filterText = "";

  @Ref<HTMLDivElement>()
  containerRef!: Ref<HTMLDivElement>;

  get filteredRows(): Row[] {
    const q = this.filterText.toLowerCase();
    return q ? ROWS.filter((r) => r.name.toLowerCase().includes(q) || r.email.includes(q)) : ROWS;
  }

  @Compose(VirtualList, "containerRef", getter("filteredRows"), 48, 5)
  virtual!: VirtualList<Row>;

  @Styled(PageStyles)     $page!: PageStyles;
  @Styled(CardStyles)     $card!: CardStyles;
  @Styled(DemoStyles)     $demo!: DemoStyles;
  @Styled(FormStyles)     $form!: FormStyles;
  @Styled(SectionStyles)  $sec!: SectionStyles;
  @Styled(BarChartStyles) $bc!: BarChartStyles;
  @Styled(VirtStyles)     $virt!: VirtStyles;

  statusClass(status: Row["status"]): string {
    return cx(this.$virt.$status, {
      [this.$virt.$statusActive]:   status === "active",
      [this.$virt.$statusInactive]: status === "inactive",
      [this.$virt.$statusPending]:  status === "pending",
    });
  }

  render() {
    return (
      <div class={this.$page.$page}>
        {/* @Lazy section */}
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>Performance</h1>
          <p class={this.$page.$heroP}>
            <code>@Lazy</code> defers rendering until the component enters the
            viewport. <code>VirtualList</code> renders only the visible rows of
            a large list.
          </p>
        </div>

        <div class={this.$sec.$title}>
          <h2 class={this.$sec.$titleH2}>@Lazy — viewport-deferred rendering</h2>
          <p class={this.$sec.$desc}>
            Scroll down past the spacer — the chart only renders once it enters the viewport.
          </p>
        </div>

        <div class={this.$bc.$lazySpacer}><span>↓ Keep scrolling ↓</span></div>

        <HeavyChart />

        <hr class={this.$sec.$divider} />

        {/* VirtualList section */}
        <div class={this.$sec.$title}>
          <h2 class={this.$sec.$titleH2}>VirtualList composable — 50 000 rows</h2>
          <p class={this.$sec.$desc}>
            Only visible rows (+ 5 buffer) are in the DOM. Scroll freely —
            node count stays constant.
          </p>
        </div>

        <div class={this.$card.$cardWide} style="padding:0;overflow:hidden">
          <div class={this.$virt.$toolbar}>
            <input
              class={this.$form.$input}
              placeholder="Filter by name or email…"
              value={() => this.filterText}
              onInput={(e: Event) => { this.filterText = (e.target as HTMLInputElement).value; }}
            />
            <span class={this.$virt.$count}>
              {() => this.filteredRows.length.toLocaleString()} rows
            </span>
          </div>

          <div class={this.$virt.$header}>
            <span class={this.$virt.$id}>ID</span>
            <span class={this.$virt.$name}>Name</span>
            <span class={this.$virt.$email}>Email</span>
            <span class={this.$virt.$status}>Status</span>
            <span class={this.$virt.$score}>Score</span>
          </div>

          <div
            ref={this.containerRef}
            class={this.$virt.$container}
          >
            <div style={() => `height:${this.virtual.totalHeight}px;position:relative`}>
              <div style={() => `height:${this.virtual.offsetTop}px`} />
              {() => (this.virtual.visibleItems as VirtualItem<Row>[]).map(({ item }) => (
                <div class={this.$virt.$row} key={item.id}>
                  <span class={this.$virt.$id}>{item.id}</span>
                  <span class={this.$virt.$name}>{item.name}</span>
                  <span class={this.$virt.$email}>{item.email}</span>
                  <span class={this.statusClass(item.status)}>{item.status}</span>
                  <span class={this.$virt.$score}>{item.score}</span>
                </div>
              ))}
              <div style={() => `height:${this.virtual.offsetBottom}px`} />
            </div>
          </div>
        </div>

        <div class={this.$demo.$infoBox} style="margin-top:24px">
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
