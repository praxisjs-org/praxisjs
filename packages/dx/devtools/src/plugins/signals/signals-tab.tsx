import { EmptyState } from "@shared/empty-state";
import { SearchInput } from "@shared/search-input";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";


import { SignalDetail } from "./components/signal-detail";
import { SignalRow } from "./components/signal-row";

import type { Registry } from "@core/registry";
import type { SignalEntry } from "@core/types";

@Component()
export class SignalsTab extends StatefulComponent {
  @State() signals: SignalEntry[] = [];
  @State() search = "";
  @State() selectedId: string | null = null;
  @Prop() registry!: Registry;

  private _handlers: Array<() => void> = [];

  onMount() {
    this.signals = this.registry.getSignals();

    this._handlers = [
      this.registry.bus.on("signal:registered", () => {
        this.signals = this.registry.getSignals();
      }),
      this.registry.bus.on("signal:changed", () => {
        this.signals = this.registry.getSignals();
      }),
    ];
  }

  onUnmount() {
    this._handlers.forEach((off) => { off(); });
  }

  render() {
    return (
      <div class="flex h-full overflow-hidden">
        <div class="flex-1 flex flex-col overflow-hidden min-w-0">
          <div class="px-3 py-2 border-b border-border bg-bg shrink-0">
            <SearchInput
              placeholder="Search signals…"
              onInput={(v) => {
                this.search = v;
              }}
            />
          </div>

          <div class="grid grid-cols-[1.2fr_0.8fr_1fr_auto] items-center px-3 h-7 text-[9px] text-subtle font-bold tracking-[0.12em] uppercase border-b border-border bg-section gap-2 shrink-0">
            <span>Signal</span>
            <span>Component</span>
            <span>Value</span>
            <span>Age</span>
          </div>

          <div class="flex-1 overflow-y-auto">
            {() => {
              const q = this.search.toLowerCase();
              const filtered =
                q === ""
                  ? this.signals
                  : this.signals.filter(
                      (s) =>
                        s.label.toLowerCase().includes(q) ||
                        s.componentName.toLowerCase().includes(q),
                    );

              if (filtered.length === 0) {
                return (
                  <EmptyState
                    message={
                      this.signals.length === 0
                        ? "No signals tracked. Add @Debug() on top of @State() properties."
                        : "No signals match your search."
                    }
                  />
                );
              }

              return filtered.map((s) => (
                <SignalRow
                  key={s.id}
                  entry={s}
                  selected={this.selectedId === s.id}
                  onClick={() => {
                    this.selectedId =
                      this.selectedId === s.id ? null : s.id;
                  }}
                />
              ));
            }}
          </div>
        </div>

        {() => {
          const id = this.selectedId;
          const entry = id
            ? (this.signals.find((s) => s.id === id) ?? null)
            : null;
          return entry ? <SignalDetail entry={entry} /> : null;
        }}
      </div>
    );
  }
}
