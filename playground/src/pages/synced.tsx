import { StatefulComponent } from "@praxisjs/core";
import { Component, Synced } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";

@Head({ title: "@Synced — PraxisJS", description: "Cross-tab signal sync via BroadcastChannel." })
@Route("/synced")
@Component()
export default class SyncedPage extends StatefulComponent {
  @Synced("playground:count") count = 0;
  @Synced("playground:text") text = "";

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>@Synced</h1>
          <p>
            State synced in real-time across browser tabs via{" "}
            <code>BroadcastChannel</code>. Open this page in another tab and
            interact below.
          </p>
        </div>

        <div class="demo-grid">
          <div class="card">
            <span class="count-value">{() => this.count}</span>
            <p class="count-label">synced counter</p>
            <div class="btn-row">
              <button onClick={() => { this.count++; }}>+1</button>
              <button class="secondary" onClick={() => { this.count--; }}>−1</button>
              <button class="secondary" onClick={() => { this.count = 0; }}>Reset</button>
            </div>
          </div>

          <div class="card">
            <p class="count-label">synced message</p>
            <p class="synced-text">{() => this.text || "—"}</p>
            <input
              class="text-input"
              placeholder="Type something…"
              value={() => this.text}
              onInput={(e: Event) => { this.text = (e.target as HTMLInputElement).value; }}
            />
          </div>
        </div>

        <div class="info-box">
          <strong>How it works:</strong> each write broadcasts the new value
          over a named <code>BroadcastChannel</code>. Any other tab listening on
          the same channel applies the update instantly — no server, no polling.
        </div>
      </div>
    );
  }
}
