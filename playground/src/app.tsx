import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { RouterConfig, RouterView, Link, Lazy } from "@praxisjs/router";

import { Home } from "./pages/home";
import About from "./pages/about";
import SyncedPage from "./pages/synced";
import DeepStatePage from "./pages/deep-state";
import PerformancePage from "./pages/performance";

@RouterConfig([Home, About, SyncedPage, DeepStatePage, PerformancePage])
@Component()
export class App extends StatefulComponent {
  render() {
    return (
      <div class="app">
        <nav class="nav">
          <div class="nav-brand">
            <img src="/logo.svg" class="nav-logo" alt="PraxisJS" />
            <span class="nav-name">PraxisJS</span>
          </div>
          <div class="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/synced">@Synced</Link>
            <Link to="/deep-state">@DeepState</Link>
            <Link to="/performance">Performance</Link>
          </div>
        </nav>
        <main class="main">
          <RouterView />
        </main>
      </div>
    );
  }
}
