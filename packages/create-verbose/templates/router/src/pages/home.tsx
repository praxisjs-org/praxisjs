import { BaseComponent } from "@verbose/core";
import { Component, State } from "@verbose/decorators";
import { Route } from "@verbose/router";

@Route("/")
@Component()
export class Home extends BaseComponent {
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>Hello, Verbose</h1>
          <p>A signal-driven frontend framework built with TypeScript.</p>
        </div>

        <div class="card">
          <span class="count-value">{() => this.count}</span>
          <p class="count-label">count</p>
          <button onClick={() => { this.increment(); }}>Increment</button>
        </div>
      </div>
    );
  }
}
