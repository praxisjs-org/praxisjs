import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Route } from "@praxisjs/router";

@Route("/")
@Component()
export class Home extends StatefulComponent {
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>Hello, PraxisJS</h1>
          <p>A signal-driven frontend framework built with TypeScript.</p>
        </div>

        <div class="card">
          <span class="count-value">{() => this.count}</span>
          <p class="count-label">count</p>
          <button
            onClick={() => {
              this.increment();
            }}
          >
            Increment
          </button>
        </div>
      </div>
    );
  }
}
