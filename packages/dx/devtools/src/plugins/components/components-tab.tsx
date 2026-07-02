import { EmptyState } from "@shared/empty-state";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";


import { ComponentDetail } from "./components/component-detail";
import { ComponentRow } from "./components/component-row";

import type { Registry } from "@core/registry";
import type { ComponentEntry } from "@core/types";

@Component()
export class ComponentsTab extends StatefulComponent {
  @State() components: ComponentEntry[] = [];
  @State() selectedId: string | null = null;
  @Prop() registry!: Registry;

  private _handlers: Array<() => void> = [];

  onMount() {
    this.components = this.registry.getComponents();

    const refresh = () => {
      this.components = this.registry.getComponents();
    };

    this._handlers = [
      "component:registered",
      "component:render",
      "component:unmount",
      "lifecycle",
      "signal:registered",
      "signal:changed",
    ].map((ev) => this.registry.bus.on(ev, refresh));
  }

  onUnmount() {
    this._handlers.forEach((off) => { off(); });
  }

  render() {
    const { registry } = this;
    return (
      <div class="flex h-full overflow-hidden">
        <div class="flex-1 flex flex-col overflow-hidden min-w-0">
          <div class="flex items-center px-3 h-7 text-[9px] text-subtle font-bold tracking-[0.12em] uppercase border-b border-border bg-section gap-2 shrink-0">
            <span class="flex-1">Component</span>
            <span>Renders</span>
            <span class="w-12 text-right">Last</span>
          </div>

          <div class="flex-1 overflow-y-auto">
            {() =>
              this.components.length === 0 ? (
                <EmptyState message="No components tracked. Add @Trace() to component classes." />
              ) : (
                this.components.map((c) => (
                  <ComponentRow
                    key={c.id}
                    entry={c}
                    selected={() => this.selectedId === c.id}
                    onClick={() => {
                      this.selectedId =
                        this.selectedId === c.id ? null : c.id;
                    }}
                  />
                ))
              )
            }
          </div>
        </div>

        {() => {
          const id = this.selectedId;
          const entry = id
            ? (this.components.find((c) => c.id === id) ?? null)
            : null;
          const sigs = id ? registry.getSignalsByComponent(id) : [];
          return entry ? (
            <ComponentDetail entry={entry} signals={sigs} />
          ) : null;
        }}
      </div>
    );
  }
}
