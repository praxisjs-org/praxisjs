import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Styled } from "@praxisjs/css";

import { PageStyles, FeatureStyles } from "../shared-styles";

@Head({ title: "About — PraxisJS", description: "Built with PraxisJS — a signal-driven frontend framework for TypeScript." })
@Route("/about")
@Component()
export default class About extends StatefulComponent {
  @Styled(PageStyles)    $page!: PageStyles;
  @Styled(FeatureStyles) $feat!: FeatureStyles;

  render() {
    return (
      <div class={this.$page.$page}>
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>About</h1>
          <p class={this.$page.$heroP}>
            Built with <strong>PraxisJS</strong> — a signal-driven frontend
            framework for TypeScript.
          </p>
        </div>

        <div class={this.$feat.$grid}>
          <div class={this.$feat.$card}>
            <span class={this.$feat.$icon}>⚡</span>
            <h3 class={this.$feat.$title}>Signals</h3>
            <p class={this.$feat.$desc}>Fine-grained reactivity with zero virtual DOM overhead.</p>
          </div>
          <div class={this.$feat.$card}>
            <span class={this.$feat.$icon}>🎯</span>
            <h3 class={this.$feat.$title}>Decorators</h3>
            <p class={this.$feat.$desc}>
              Declare components and state with expressive TypeScript decorators.
            </p>
          </div>
          <div class={this.$feat.$card}>
            <span class={this.$feat.$icon}>🔗</span>
            <h3 class={this.$feat.$title}>Router</h3>
            <p class={this.$feat.$desc}>Client-side routing with zero configuration needed.</p>
          </div>
        </div>
      </div>
    );
  }
}
