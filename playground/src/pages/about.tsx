import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";

@Head({ title: "About — PraxisJS", description: "Built with PraxisJS — a signal-driven frontend framework for TypeScript." })
@Route("/about")
@Component()
export default class About extends StatefulComponent {
  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>About</h1>
          <p>
            Built with <strong>PraxisJS</strong> — a signal-driven frontend
            framework for TypeScript.
          </p>
        </div>

        <div class="features">
          <div class="feature-card">
            <span class="feature-icon">⚡</span>
            <h3>Signals</h3>
            <p>Fine-grained reactivity with zero virtual DOM overhead.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎯</span>
            <h3>Decorators</h3>
            <p>
              Declare components and state with expressive TypeScript
              decorators.
            </p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🔗</span>
            <h3>Router</h3>
            <p>Client-side routing with zero configuration needed.</p>
          </div>
        </div>
      </div>
    );
  }
}
