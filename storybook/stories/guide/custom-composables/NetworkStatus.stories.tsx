import { StatefulComponent, Composable } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { signal } from "@praxisjs/core/internal";
import type { Meta, StoryObj } from "@praxisjs/storybook";

class NetworkStatus extends Composable {
  declare online: boolean;

  setup() {
    const online = signal(navigator.onLine);

    const onOnline = () => online.set(true);
    const onOffline = () => online.set(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    this._cleanup = () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };

    return { online };
  }

  private _cleanup = () => {};

  onUnmount() { this._cleanup(); }
}

@Component()
class NetworkStatusDemo extends StatefulComponent {
  @Compose(NetworkStatus)
  network!: NetworkStatus;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">NetworkStatus composable</h3>
        <div style={() => `padding:14px;border-radius:10px;text-align:center;transition:all .3s;background:${this.network.online ? "#f0fdf4" : "#fef2f2"};border:1px solid ${this.network.online ? "#bbf7d0" : "#fca5a5"}`}>
          <p style={() => `margin:0;font-size:1.5rem`}>
            {() => this.network.online ? "🟢" : "🔴"}
          </p>
          <p style={() => `margin:6px 0 0;font-size:.95rem;font-weight:700;color:${this.network.online ? "#166534" : "#b91c1c"}`}>
            {() => this.network.online ? "Online" : "Offline"}
          </p>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Disconnect your network to see this update.
          The composable registers <code>online</code>/<code>offline</code> listeners and
          exposes <code>online: boolean</code> as a reactive signal.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Composables/NetworkStatus",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const NetworkStatusStory: Story = {
  name: "NetworkStatus — online/offline signal",
  render: () => <NetworkStatusDemo />,
};
