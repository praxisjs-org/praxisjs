import { EmptyState } from "@shared/empty-state";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";


import { TimelineRow } from "./components/timeline-row";
import { FILTERS, type Filter } from "./constants";

import type { Registry } from "@core/registry";
import type { TimelineEntry } from "@core/types";

@Component()
export class TimelineTab extends StatefulComponent {
  @State() entries: TimelineEntry[] = [];
  @State() filter: Filter = "all";
  @State() paused = false;
  @Prop() registry!: Registry;

  private _handlers: Array<() => void> = [];

  onMount() {
    this.entries = this.registry.getTimeline();

    this._handlers = [
      this.registry.bus.on("timeline:push", () => {
        if (!this.paused) this.entries = this.registry.getTimeline();
      }),
    ];
  }

  onUnmount() {
    this._handlers.forEach((off) => { off(); });
  }

  render() {
    return (
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center gap-[3px] px-2 py-2 border-b border-border bg-bg shrink-0 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                this.filter = f.value;
              }}
              class={() =>
                this.filter === f.value
                  ? "text-[11px] px-2 py-[3px] rounded cursor-pointer font-sans bg-soft text-accent font-semibold"
                  : "text-[11px] px-2 py-[3px] rounded cursor-pointer font-sans text-muted hover:text-text hover:bg-section transition-colors duration-150"
              }
            >
              {f.label}
            </button>
          ))}

          <div class="flex-1" />

          <button
            onClick={() => {
              if (this.paused) this.entries = this.registry.getTimeline();
              this.paused = !this.paused;
            }}
            class={() =>
              `text-[11px] px-2 py-[3px] rounded cursor-pointer font-sans border border-border transition-colors duration-150 ${
                this.paused
                  ? "text-warn border-warn"
                  : "text-muted hover:text-text"
              }`
            }
          >
            {() => (this.paused ? "Resume" : "Pause")}
          </button>

          <button
            onClick={() => {
              this.entries = [];
            }}
            class="text-[11px] px-2 py-[3px] rounded cursor-pointer font-sans border border-border text-muted hover:text-text transition-colors duration-150"
          >
            Clear
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          {() => {
            const f = this.filter;
            const filtered =
              f === "all"
                ? this.entries
                : this.entries.filter(
                    (e) =>
                      e.type === f ||
                      (f === "component:mount" &&
                        e.type === "component:unmount"),
                  );

            if (filtered.length === 0) {
              return (
                <EmptyState message="No events yet. Interact with your app to see the timeline." />
              );
            }

            return [...filtered]
              .reverse()
              .map((e) => <TimelineRow key={e.id} entry={e} />);
          }}
        </div>
      </div>
    );
  }
}
