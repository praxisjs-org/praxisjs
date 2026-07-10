import { ColorScheme } from "@praxisjs/composables";
import { Task, type TaskOf } from "@praxisjs/concurrent";
import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Inject } from "@praxisjs/di";
import { Route } from "@praxisjs/router";
import { Store } from "@praxisjs/store";
import { Trace } from "@praxisjs/devtools";

import { ApiService } from "../services/api";
import { CounterStore } from "../store";

@Trace()
@Route("/")
@Component()
export class Home extends StatefulComponent {
  @Store(CounterStore) private store!: CounterStore;

  @Inject(ApiService) private api!: ApiService;

  @Compose(ColorScheme)
  private scheme!: ColorScheme;

  async fetchMessage() {
    return this.api.fetchMessage();
  }

  @Task("fetchMessage")
  fetchMessageTask!: TaskOf<Home, "fetchMessage">;

  onMount() {
    void this.fetchMessageTask();
  }

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <span class="eyebrow">Full feature set</span>
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
                <button class="button" onClick={() => this.store.increment()}>+</button>
                <button class="button" onClick={() => this.store.decrement()}>−</button>
                <button class="button secondary" onClick={() => this.store.reset()}>
                  Reset
                </button>
              </div>
              <p class="card-hint">Global count shared across every component.</p>
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
                {() => (this.scheme.isDark ? "Dark" : "Light")}
              </span>
              <p class="card-hint">Detects the OS color scheme reactively — no manual toggle needed.</p>
            </div>
          </div>

          <div class="card card-wide">
            <div class="card-header">
              <h2>Concurrent</h2>
              <div class="badge-row">
                <span class="badge">@praxisjs/concurrent</span>
                <span class="badge">@praxisjs/di</span>
              </div>
            </div>
            <div class="card-body">
              <p class="stat-label">API response (via DI)</p>
              <span class="stat-value">
                {() =>
                  this.fetchMessageTask.loading()
                    ? "Loading..."
                    : (this.fetchMessageTask.lastResult() ?? "—")
                }
              </span>
              <p class="card-hint">Loading and error state handled automatically by @Task.</p>
              <button class="button" onClick={() => { void this.fetchMessageTask(); }}>Refetch</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
