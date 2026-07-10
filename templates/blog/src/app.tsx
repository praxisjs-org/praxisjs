import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Router, RouterView, Link } from "@praxisjs/router";
import { Lazy } from "@praxisjs/router";

import { Home } from "./pages/home";

@Router([
  { path: "/", component: Home },
  { path: "/blog", component: Lazy(() => import("./pages/blog")) },
  { path: "/blog/:slug", component: Lazy(() => import("./pages/post")) },
])
@Component()
export class App extends StatefulComponent {
  render() {
    return (
      <div class="app">
        <nav class="nav">
          <div class="nav-brand">
            <img src="/logo.svg" class="nav-logo" alt="PraxisJS" />
            <span class="nav-name">My Blog</span>
          </div>
          <div class="nav-links">
            <Link to="/" activeClass="nav-link-active">Home</Link>
            <Link to="/blog" activeClass="nav-link-active">Blog</Link>
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
