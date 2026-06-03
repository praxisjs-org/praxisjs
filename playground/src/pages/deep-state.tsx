import { StatefulComponent } from "@praxisjs/core";
import { Component, DeepState } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Styled } from "@praxisjs/css";

import { PageStyles, CardStyles, DemoStyles, FormStyles, TagStyles } from "../shared-styles";

interface Config {
  theme: { mode: "light" | "dark"; accent: string };
  fontSize: number;
  notifications: boolean;
}

@Head({ title: "@DeepState — PraxisJS", description: "Deep reactive object state with @DeepState." })
@Route("/deep-state")
@Component()
export default class DeepStatePage extends StatefulComponent {
  @DeepState() config: Config = {
    theme: { mode: "light", accent: "#6d5bbd" },
    fontSize: 16,
    notifications: true,
  };
  @DeepState() tags: string[] = ["praxisjs", "signals"];

  @Styled(PageStyles)  $page!: PageStyles;
  @Styled(CardStyles)  $card!: CardStyles;
  @Styled(DemoStyles)  $demo!: DemoStyles;
  @Styled(FormStyles)  $form!: FormStyles;
  @Styled(TagStyles)   $tags!: TagStyles;

  render() {
    return (
      <div class={this.$page.$page}>
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>@DeepState</h1>
          <p class={this.$page.$heroP}>
            Nested mutations are reactive — no new references needed. Mutate
            objects and arrays directly.
          </p>
        </div>

        <div class={this.$demo.$grid}>
          <div class={this.$card.$cardWide}>
            <p class={this.$card.$countLabel}>config object</p>
            <pre class={this.$form.$codePreview}>{() => JSON.stringify(this.config, null, 2)}</pre>
            <div class={this.$demo.$controls}>
              <button onClick={() => { this.config.theme.mode = this.config.theme.mode === "light" ? "dark" : "light"; }}>
                Toggle theme.mode
              </button>
              <button class="secondary" onClick={() => { this.config.fontSize++; }}>fontSize++</button>
              <button class="secondary" onClick={() => { this.config.notifications = !this.config.notifications; }}>
                Toggle notifications
              </button>
            </div>
          </div>

          <div class={this.$card.$cardWide}>
            <p class={this.$card.$countLabel}>tags array</p>
            <div class={this.$tags.$list}>
              {() => this.tags.map((tag, i) => (
                <span class={this.$tags.$tag}>
                  {tag}
                  <button class="tag-remove" onClick={() => { this.tags.splice(i, 1); }}>×</button>
                </span>
              ))}
            </div>
            <button class="secondary" onClick={() => { this.tags.push(`tag-${this.tags.length + 1}`); }}>
              push new tag
            </button>
          </div>
        </div>

        <div class={this.$demo.$infoBox}>
          <strong>How it works:</strong> a deep <code>Proxy</code> intercepts
          any write at any depth and increments a version signal. Effects that
          read the field re-run automatically — no{" "}
          <code>this.config = &#123;...this.config&#125;</code> required.
        </div>
      </div>
    );
  }
}
