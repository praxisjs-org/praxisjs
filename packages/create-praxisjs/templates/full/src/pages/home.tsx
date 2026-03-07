import { useColorScheme } from "@praxisjs/composables";
import { task } from "@praxisjs/concurrent";
import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Inject } from "@praxisjs/di";
import { Route } from "@praxisjs/router";

import { ApiService } from "../services/api";
import { useCounterStore } from "../store";
import { Trace } from "@praxisjs/devtools";

@Trace()
@Route("/")
@Component()
export class Home extends StatefulComponent {
  private readonly store = useCounterStore();

  @Inject(ApiService) api!: ApiService;

  private readonly scheme = useColorScheme();

  private readonly fetchMessage = task(async () => {
    return this.api.fetchMessage();
  });

  onMount() {
    this.fetchMessage();
  }

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>Hello, PraxisJS</h1>
          <p>Explore the full feature set of the framework.</p>
        </div>

        <div class="cards">
          <div class="card">
            <div class="card-header">
              <h2>Store</h2>
              <span class="badge">@praxisjs/store</span>
            </div>
            <div class="card-body">
              <span class="count-value">{() => this.store.count}</span>
              <p class="count-label">count</p>
              <div class="btn-group">
                <button
                  onClick={() => {
                    this.store.increment();
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => {
                    this.store.decrement();
                  }}
                >
                  −
                </button>
                <button
                  class="secondary"
                  onClick={() => {
                    this.store.reset();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Composables</h2>
              <span class="badge">@praxisjs/composables</span>
            </div>
            <div class="card-body">
              <p class="stat-label">Color scheme</p>
              <span class="stat-value">
                {() => (this.scheme.isDark() ? "Dark" : "Light")}
              </span>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Concurrent + DI</h2>
              <span class="badge">@praxisjs/concurrent</span>
            </div>
            <div class="card-body">
              <p class="stat-label">API response</p>
              <span class="stat-value">
                {() =>
                  this.fetchMessage.loading()
                    ? "Loading..."
                    : (this.fetchMessage.lastResult() ?? "—")
                }
              </span>
              <button onClick={() => this.fetchMessage()}>Refetch</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
