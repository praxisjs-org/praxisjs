import { StatefulComponent } from "@praxisjs/core";
import {
  Component,
  Computed,
  State,
  Watch,
  WatchVals,
} from "@praxisjs/decorators";
import { Route } from "@praxisjs/router";

@Route("/")
@Component()
export class Home extends StatefulComponent {
  @State() count = 0;
  @State() count2 = 10;

  increment() {
    this.count++;
    this.count2 += 2;
  }

  incrementSingle() {
    this.count++;
  }

  @Watch("count", "count2")
  onCountChange(values: WatchVals<this, "count" | "count2">) {
    console.log("Count changed:", values.count);
    console.log("Count2 changed:", values.count2);
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
          <button
            onClick={() => {
              this.incrementSingle();
            }}
          >
            Increment Single
          </button>
        </div>
      </div>
    );
  }
}
