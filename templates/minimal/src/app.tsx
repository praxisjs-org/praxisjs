import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";

@Component()
export class App extends StatefulComponent {
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div class="app">
        <div class="hero">
          <img src="/logo.svg" class="logo-mark" alt="PraxisJS" />
          <span class="eyebrow">Signal-driven framework</span>
          <h1>PraxisJS App</h1>
          <p class="tagline">Fine-grained reactivity, zero virtual DOM overhead.</p>
        </div>

        <div class="card">
          <span class="count-value">{() => this.count}</span>
          <p class="count-label">count</p>
          <button
            class="button"
            onClick={() => {
              this.increment();
            }}
          >
            Increment
          </button>
          <p class="hint">
            Edit <code class="code">src/app.tsx</code> and save to reload
          </p>
        </div>

        <p class="footer">Built with PraxisJS</p>
      </div>
    );
  }
}
