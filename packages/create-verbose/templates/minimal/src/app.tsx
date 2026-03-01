import { BaseComponent } from "@verbose/core";
import { Component, State } from "@verbose/decorators";

@Component()
export class App extends BaseComponent {
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div class="app">
        <div class="hero">
          <img src="/logo.svg" class="logo-mark" alt="Verbose" />
          <h1>Verbose App</h1>
          <p class="tagline">A signal-driven frontend framework</p>
        </div>

        <div class="card">
          <span class="count-value">{() => this.count}</span>
          <p class="count-label">count</p>
          <button onClick={() => { this.increment(); }}>Increment</button>
          <p class="hint">Edit <code>src/app.tsx</code> and save to reload</p>
        </div>
      </div>
    );
  }
}
