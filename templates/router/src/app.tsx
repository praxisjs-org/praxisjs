import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Router, RouterView, Link, Lazy } from "@praxisjs/router";

import { Home } from "./pages/home";

@Router([
  { path: "/", component: Home },
  { path: "/about", component: Lazy(() => import("./pages/about")) },
])
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
          </div>
        </nav>
        <main class="main">
          <RouterView />
        </main>
        <p class="footer">Built with PraxisJS</p>
      </div>
    );
  }
}
