import { EmptyState } from "@shared/empty-state";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";
import { For } from "@praxisjs/runtime";

import type { ProfileSnapshot } from "@core/profiler";
import type { Registry } from "@core/registry";

const BUTTON =
  "text-[11px] px-2 py-[3px] rounded cursor-pointer font-sans border border-border text-muted hover:text-text transition-colors duration-150";

function ms(value: number): string {
  return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
}

@Component()
export class PerformanceTab extends StatefulComponent {
  @State() snapshot: ProfileSnapshot | null = null;
  @Prop() registry!: Registry;

  private _off: (() => void) | null = null;

  onMount() {
    const { profiler } = this.registry;
    this.refresh();
    this._off = profiler.bus.on("profile:changed", () => { this.refresh(); });
  }

  onUnmount() {
    this._off?.();
  }

  // The panel's own updates are kept out of the recording.
  refresh() {
    const { profiler } = this.registry;
    profiler.muted(() => { this.snapshot = profiler.snapshot(); });
  }

  render() {
    const { profiler } = this.registry;
    return (
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center gap-[6px] px-2 py-2 border-b border-border bg-bg shrink-0">
          <button
            class={() => `${BUTTON} ${this.snapshot?.recording ? "text-warn border-warn" : ""}`}
            onClick={() => {
              if (profiler.isRecording) profiler.stop();
              else profiler.start();
            }}
          >
            {() => (this.snapshot?.recording ? "Stop" : "Record")}
          </button>
          <button class={BUTTON} onClick={() => { profiler.reset(); }}>
            Reset
          </button>
          <div class="flex-1" />
          <span class="text-[10px] text-subtle font-mono">
            {() => (this.snapshot ? `${(this.snapshot.duration / 1000).toFixed(1)} s` : "")}
          </span>
        </div>

        <div class="grid grid-cols-4 gap-px bg-border border-b border-border shrink-0">
          {() => {
            const s = this.snapshot;
            const cells: Array<[string, string]> = s
              ? [
                  ["Writes", String(s.writes)],
                  ["Effect runs", String(s.effectRuns)],
                  ["Effect time", ms(s.effectMs)],
                  ["Computed runs", `${String(s.computeRuns)} · ${ms(s.computeMs)}`],
                ]
              : [];
            return cells.map(([label, value]) => (
              <div class="bg-bg px-3 py-2">
                <div class="text-[9px] text-subtle font-bold tracking-[0.12em] uppercase">{label}</div>
                <div class="text-[13px] text-text font-mono">{value}</div>
              </div>
            ));
          }}
        </div>

        <div class="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr] items-center px-3 h-7 text-[9px] text-subtle font-bold tracking-[0.12em] uppercase border-b border-border bg-section gap-2 shrink-0">
          <span>Component</span>
          <span>Runs</span>
          <span>Time</span>
          <span>Slowest</span>
        </div>

        <div class="flex-1 overflow-y-auto">
          <For
            each={() => this.snapshot?.owners ?? []}
            by="name"
            fallback={
              <EmptyState message="Press Record, use your app, then Stop. Bindings and effects are grouped by the component that created them." />
            }
          >
            {(owner) => (
              <div class="grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr] items-center px-3 h-7 text-[11px] border-b border-border gap-2 font-mono">
                <span class="text-accent truncate">{() => owner().name}</span>
                <span class="text-text">{() => String(owner().effectRuns)}</span>
                <span class="text-text">{() => ms(owner().effectMs)}</span>
                <span class="text-muted">{() => ms(owner().maxMs)}</span>
              </div>
            )}
          </For>
        </div>
      </div>
    );
  }
}
