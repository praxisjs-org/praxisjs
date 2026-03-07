import logo from "@assets/logo.svg";
import unoStyles from "@assets/uno.generated.css?inline";
import { Registry } from "@core/registry";
import { ComponentsPlugin } from "@plugins/components";
import { SignalsPlugin } from "@plugins/signals";
import { TimelinePlugin } from "@plugins/timeline";
import unoReset from "@unocss/reset/tailwind-v4.css?inline";

import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";
import { render } from "@praxisjs/runtime";

import { Panel } from "./panel";

import type { DevtoolsPlugin } from "@plugins/types";

const DEFAULT_PLUGINS: DevtoolsPlugin[] = [
  SignalsPlugin,
  ComponentsPlugin,
  TimelinePlugin,
];

export interface DevToolsOptions {
  plugins?: DevtoolsPlugin[];
}

@Component()
class DevToolsApp extends StatefulComponent {
  @State() open = false;
  @Prop() plugins: DevtoolsPlugin[] = [];
  @Prop() registry: Registry | undefined;

  render() {
    return (
      <div>
        {() =>
          this.open ? (
            <Panel
              plugins={this.plugins}
              registry={this.registry}
              onClose={() => {
                this.open = false;
              }}
            />
          ) : (
            <button
              onClick={() => {
                this.open = true;
              }}
              class="fixed bottom-5 right-5 z-[2147483647] flex items-center gap-1 pl-[10px] pr-[14px] h-[32px] rounded-xl font-sans font-semibold text-[12px] text-accent bg-header border border-border cursor-pointer select-none shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-all duration-200 hover:border-accent hover:bg-soft hover:shadow-[0_8px_32px_rgba(56,189,248,0.1)]"
            >
              <img class="h-[13px] w-[13px]" src={logo} />
              <span class="text-[10px] font-bold text-accent tracking-widest uppercase">
                devtools
              </span>
            </button>
          )
        }
      </div>
    );
  }
}

export const DevTools = {
  plugins: [...DEFAULT_PLUGINS] as DevtoolsPlugin[],
  host: null as HTMLElement | null,
  cleanup: null as (() => void) | null,

  init(options: DevToolsOptions = {}) {
    if (this.host) return;

    if (options.plugins) {
      this.plugins = options.plugins;
    }

    this.plugins.forEach((p) => p.setup?.(Registry.instance));

    const host = document.createElement("div");
    host.id = "praxisjs-devtools";
    document.body.appendChild(host);
    this.host = host;

    const shadow = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = unoReset + unoStyles;
    shadow.appendChild(styleEl);

    const container = document.createElement("div");
    shadow.appendChild(container);

    this.cleanup = render(
      () => <DevToolsApp plugins={this.plugins} registry={Registry.instance} />,
      container,
    );
  },

  registerPlugin(plugin: DevtoolsPlugin) {
    if (this.plugins.find((p) => p.id === plugin.id)) return;
    plugin.setup?.(Registry.instance);
    this.plugins.push(plugin);
    this.remount();
  },

  get registry() {
    return Registry.instance;
  },

  remount() {
    if (!this.host) return;

    const shadow = this.host.shadowRoot as ShadowRoot;
    const container = shadow.querySelector("div:last-child") as HTMLElement;

    this.cleanup?.();
    this.cleanup = render(
      () => <DevToolsApp plugins={this.plugins} registry={Registry.instance} />,
      container,
    );
  },
};
