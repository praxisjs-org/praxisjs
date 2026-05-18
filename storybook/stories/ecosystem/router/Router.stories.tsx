import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  Link,
  Params,
  Query,
  type RouterInstance,
} from "@praxisjs/router";
import type { Computed } from "@praxisjs/shared";
import type { RouteParams, RouteQuery } from "@praxisjs/router";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class HomePage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 10px;font-size:1.1rem;color:#374151">Home</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Welcome! Navigate using the links above.
        </p>
      </div>
    );
  }
}

@Component()
class AboutPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 10px;font-size:1.1rem;color:#374151">About</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          PraxisJS — signal-driven frontend framework.
        </p>
      </div>
    );
  }
}

@Component()
class UserPage extends StatefulComponent {
  @Params() params!: Computed<RouteParams>;
  @Query() query!: Computed<RouteQuery>;

  render() {
    return (
      <div style="padding:20px;font-family:sans-serif;display:flex;flex-direction:column;gap:8px">
        <h2 style="margin:0;font-size:1.1rem;color:#374151">
          User <span style="color:#6d5bbd">{() => this.params().id}</span>
        </h2>
        {() =>
          this.query().tab && (
            <p style="margin:0;font-size:.85rem;color:#6b7280">
              Tab: <strong>{this.query().tab}</strong>
            </p>
          )
        }
        <p style="margin:0;font-size:.82rem;color:#9ca3af">
          Try navigating to <code>/users/42?tab=settings</code> via the buttons
          below.
        </p>
      </div>
    );
  }
}

@Component()
class NotFoundPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif;color:#dc2626">
        <h2 style="margin:0 0 6px;font-size:1.1rem">404 — Not Found</h2>
        <p style="margin:0;font-size:.85rem">No route matched this path.</p>
      </div>
    );
  }
}

// ─── Nav bar ──────────────────────────────────────────────────────────────────

@Component()
class NavBar extends StatefulComponent {
  @Router() router!: RouterInstance;

  render() {
    return (
      <nav style="display:flex;gap:4px;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;align-items:center;flex-wrap:wrap">
        <Link to="/" activeClass="nav-active" style="padding:5px 12px;border-radius:5px;font-size:.85rem;text-decoration:none;color:#374151">Home</Link>
        <Link to="/about" activeClass="nav-active" style="padding:5px 12px;border-radius:5px;font-size:.85rem;text-decoration:none;color:#374151">About</Link>
        <Link to="/404" activeClass="nav-active" style="padding:5px 12px;border-radius:5px;font-size:.85rem;text-decoration:none;color:#dc2626">404</Link>
        <button
          style="padding:5px 12px;border-radius:5px;font-size:.85rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => {
            void this.router.push("/users/42");
          }}
        >
          User #42
        </button>
        <button
          style="padding:5px 12px;border-radius:5px;font-size:.85rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => {
            void this.router.push("/users/99", { tab: "settings" });
          }}
        >
          User #99 ?tab=settings
        </button>
        <div style="flex:1" />
        {() =>
          this.router.loading() && (
            <span style="font-size:.78rem;color:#9ca3af">Loading…</span>
          )
        }
      </nav>
    );
  }
}

// ─── Root app with router ─────────────────────────────────────────────────────

@Router([
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/users/:id", component: UserPage },
  { path: "**", component: NotFoundPage },
])
@Component()
class RouterApp extends StatefulComponent {
  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:340px">
        <NavBar />
        <div style="min-height:120px">
          <RouterView />
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/Router/Navigation",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "Router — navigation, params, query",
  render: () => <RouterApp />,
};
