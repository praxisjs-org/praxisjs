import { BaseComponent } from "@verbose/core";
import { Component } from "@verbose/decorators";
import { RouterView, Link } from "@verbose/router";

@Component()
export class App extends BaseComponent {
  render() {
    return (
      <div class="app">
        <nav class="nav">
          <div class="nav-brand">
            <img src="/logo.svg" class="nav-logo" alt="Verbose" />
            <span class="nav-name">Verbose</span>
          </div>
          <div class="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </div>
        </nav>
        <main class="main">
          <RouterView />
        </main>
      </div>
    );
  }
}
