import { StatefulComponent } from "@praxisjs/core";
import { Component, Synced } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Styled } from "@praxisjs/css";

import { PageStyles, CardStyles, DemoStyles, FormStyles } from "../shared-styles";

@Head({ title: "@Synced — PraxisJS", description: "Cross-tab signal sync via BroadcastChannel." })
@Route("/synced")
@Component()
export default class SyncedPage extends StatefulComponent {
  @Synced("playground:count") count = 0;
  @Synced("playground:text")  text  = "";

  @Styled(PageStyles)  $page!: PageStyles;
  @Styled(CardStyles)  $card!: CardStyles;
  @Styled(DemoStyles)  $demo!: DemoStyles;
  @Styled(FormStyles)  $form!: FormStyles;

  render() {
    return (
      <div class={this.$page.$page}>
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>@Synced</h1>
          <p class={this.$page.$heroP}>
            State synced in real-time across browser tabs via{" "}
            <code>BroadcastChannel</code>. Open this page in another tab and
            interact below.
          </p>
        </div>

        <div class={this.$demo.$grid}>
          <div class={this.$card.$card}>
            <span class={this.$card.$countValue}>{() => this.count}</span>
            <p class={this.$card.$countLabel}>synced counter</p>
            <div class={this.$demo.$btnRow}>
              <button onClick={() => { this.count++; }}>+1</button>
              <button class="secondary" onClick={() => { this.count--; }}>−1</button>
              <button class="secondary" onClick={() => { this.count = 0; }}>Reset</button>
            </div>
          </div>

          <div class={this.$card.$card}>
            <p class={this.$card.$countLabel}>synced message</p>
            <p class={this.$demo.$syncedText}>{() => this.text || "—"}</p>
            <input
              class={this.$form.$input}
              placeholder="Type something…"
              value={() => this.text}
              onInput={(e: Event) => { this.text = (e.target as HTMLInputElement).value; }}
            />
          </div>
        </div>

        <div class={this.$demo.$infoBox}>
          <strong>How it works:</strong> each write broadcasts the new value
          over a named <code>BroadcastChannel</code>. Any other tab listening on
          the same channel applies the update instantly — no server, no polling.
        </div>
      </div>
    );
  }
}
