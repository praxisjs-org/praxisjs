import logo from "@assets/logo.svg";
import {
  EllipsisVerticalIcon,
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PanelTopIcon,
  XIcon,
} from "@icons";
import { IconButton } from "@shared/icon-button";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Emit, Prop, State } from "@praxisjs/decorators";
import type { ComponentElement } from "@praxisjs/shared";

import type { Registry } from "@core/registry";
import type { DevtoolsPlugin } from "@plugins/types";

type Dock = "bottom" | "top" | "left" | "right";

const MIN_HEIGHT = 180;
const DEFAULT_HEIGHT = 300;
const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 380;

const DOCK_ICONS: Record<Dock, ComponentElement> = {
  bottom: PanelBottomIcon,
  top: PanelTopIcon,
  left: PanelLeftIcon,
  right: PanelRightIcon,
};

@Component()
export class Panel extends StatefulComponent {
  @State() activeTab = "";
  @State() dock: Dock = "bottom";
  @State() dockMenuOpen = false;
  @State() bottomSize = DEFAULT_HEIGHT;
  @State() vertSize = DEFAULT_WIDTH;

  @Prop() plugins: DevtoolsPlugin[] = [];
  @Prop() registry: Registry | undefined;

  @Emit("onClose")
  handleClose() {
    return;
  }
  declare onClose: (() => void) | undefined;

  onMount() {
    if (this.plugins.length > 0) this.activeTab = this.plugins[0].id;
  }

  handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const d = this.dock;
    const startSize =
      d === "bottom" || d === "top" ? this.bottomSize : this.vertSize;

    const onMove = (ev: MouseEvent) => {
      const d = this.dock;
      if (d === "bottom") {
        this.bottomSize = Math.max(
          MIN_HEIGHT,
          Math.min(
            window.innerHeight * 0.85,
            startSize + (startY - ev.clientY),
          ),
        );
      } else if (d === "top") {
        this.bottomSize = Math.max(
          MIN_HEIGHT,
          Math.min(
            window.innerHeight * 0.85,
            startSize + (ev.clientY - startY),
          ),
        );
      } else if (d === "left") {
        this.vertSize = Math.max(
          MIN_WIDTH,
          Math.min(window.innerWidth * 0.6, startSize + (ev.clientX - startX)),
        );
      } else {
        this.vertSize = Math.max(
          MIN_WIDTH,
          Math.min(window.innerWidth * 0.6, startSize + (startX - ev.clientX)),
        );
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  render() {
    // const { plugins, registry, onClose } = this.p;
    return (
      <div
        class={() => {
          const d = this.dock;
          if (d === "top")
            return "flex flex-col-reverse fixed top-0 left-0 w-full z-[2147483647]";
          if (d === "left")
            return "flex flex-row-reverse fixed left-0 top-0 h-screen z-[2147483647]";
          if (d === "right")
            return "flex fixed right-0 top-0 h-screen z-[2147483647]";
          return "flex flex-col fixed bottom-0 left-0 w-full z-[2147483647]";
        }}
      >
        <div
          class={() => {
            const d = this.dock;
            if (d === "bottom" || d === "top")
              return "h-1 cursor-[ns-resize] bg-transparent hover:bg-accent transition-colors duration-200";
            return "w-1 cursor-[ew-resize] bg-transparent hover:bg-accent transition-colors duration-200";
          }}
          onMouseDown={(e: MouseEvent) => {
            this.handleMouseDown(e);
          }}
        />
        <div
          class={() => {
            const d = this.dock;
            if (d === "top")
              return "w-full h-full bg-bg border-b border-border";
            if (d === "left")
              return "w-full h-full bg-bg border-r border-border";
            if (d === "right")
              return "w-full h-full bg-bg border-l border-border";
            return "w-full h-full bg-bg border-t border-border";
          }}
          style={() => {
            const d = this.dock;
            return d === "bottom" || d === "top"
              ? { height: `${this.bottomSize.toString()}px` }
              : { width: `${this.vertSize.toString()}px` };
          }}
        >
          <div class="flex flex-col flex-1 w-full h-full overflow-hidden">
            <div class="flex h-10 items-stretch border-b border-border bg-header shrink-0 px-2 gap-[2px]">
              <div class="flex items-center gap-[6px] pr-3 mr-[2px] border-r border-border shrink-0">
                <img class="h-[13px] w-[13px]" src={logo} />
                <span class="text-[10px] font-bold text-accent tracking-widest uppercase">
                  praxisjs
                </span>
              </div>

              <div class="flex items-stretch flex-1">
                {() =>
                  this.plugins.map((p) => (
                    <button
                      key={p.id}
                      class={() =>
                        this.activeTab === p.id
                          ? "relative flex items-center px-3 text-[11px] font-semibold text-accent cursor-pointer"
                          : "flex items-center px-3 text-[11px] text-muted cursor-pointer hover:text-text transition-colors duration-150"
                      }
                      onClick={() => {
                        this.activeTab = p.id;
                      }}
                    >
                      {p.label}
                      {() =>
                        this.activeTab === p.id ? (
                          <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                        ) : null
                      }
                    </button>
                  ))
                }
              </div>

              <div class="flex items-center gap-[2px] shrink-0">
                <div class="relative">
                  <IconButton
                    title="Dock position"
                    icon={EllipsisVerticalIcon}
                    active={() => this.dockMenuOpen}
                    onClick={() => {
                      this.dockMenuOpen = !this.dockMenuOpen;
                    }}
                  />
                  {() =>
                    this.dockMenuOpen ? (
                      <div class="absolute right-0 top-full mt-1 flex gap-[2px] bg-bg border border-border rounded-md shadow-lg p-1 z-10">
                        {(["bottom", "top", "left", "right"] as Dock[]).map(
                          (v) => (
                            <IconButton
                              key={v}
                              title={`Dock ${v}`}
                              active={() => this.dock === v}
                              icon={DOCK_ICONS[v]}
                              onClick={() => {
                                this.dock = v;
                                this.dockMenuOpen = false;
                              }}
                            />
                          ),
                        )}
                      </div>
                    ) : null
                  }
                </div>

                <div class="w-px h-3 bg-border mx-1" />

                <IconButton
                  title="Close"
                  icon={XIcon}
                  onClick={() => {
                    this.handleClose();
                  }}
                />
              </div>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col">
              {() => {
                const plugin = this.plugins.find(
                  (p) => p.id === this.activeTab,
                );
                const Active = plugin?.component;
                return Active ? <Active registry={this.registry} /> : null;
              }}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
