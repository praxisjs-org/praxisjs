import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  Link,
  Params,
  type RouterInstance,
} from "@praxisjs/router";
import type { RouteParams } from "@praxisjs/router";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class HomePage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#374151">Home</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Navigate using named links or the buttons below.
        </p>
      </div>
    );
  }
}

@Component()
class UserPage extends StatefulComponent {
  @Params() params!: RouteParams;

  render() {
    return (
      <div style="padding:20px;font-family:sans-serif;display:flex;flex-direction:column;gap:8px">
        <h2 style="margin:0;font-size:1.1rem;color:#374151">
          User Profile — <span style="color:#6d5bbd">{() => `#${this.params().id}`}</span>
        </h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">
          Route: <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">/users/:id</code>
          &nbsp;· name: <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">"user"</code>
        </p>
      </div>
    );
  }
}

@Component()
class PostPage extends StatefulComponent {
  @Params() params!: RouteParams;

  render() {
    return (
      <div style="padding:20px;font-family:sans-serif;display:flex;flex-direction:column;gap:8px">
        <h2 style="margin:0;font-size:1.1rem;color:#374151">
          Post — <span style="color:#0891b2">{() => this.params().slug}</span>
        </h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">
          Route: <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">/posts/:slug</code>
          &nbsp;· name: <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">"post"</code>
        </p>
      </div>
    );
  }
}

// ─── Nav bar (Link with named targets) ───────────────────────────────────────

@Component()
class NavBar extends StatefulComponent {
  @Router() router!: RouterInstance;

  render() {
    return (
      <nav style="display:flex;gap:6px;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;align-items:center;flex-wrap:wrap">
        {/* Link with a plain string — classic path */}
        <Link
          to="/"
          activeClass="nav-active"
          style="padding:5px 12px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151"
        >
          Home
        </Link>

        {/* Link with a named target object */}
        <Link
          to={{ name: "user", params: { id: "1" } }}
          activeClass="nav-active"
          style="padding:5px 12px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151"
        >
          User #1
        </Link>
        <Link
          to={{ name: "post", params: { slug: "hello-world" } }}
          activeClass="nav-active"
          style="padding:5px 12px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151"
        >
          Post: hello-world
        </Link>

        <div style="flex:1" />

        {/* Programmatic navigation by name */}
        <button
          style="padding:4px 10px;border-radius:5px;font-size:.78rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => { void this.router.push({ name: "user", params: { id: "42" } }); }}
        >
          push user #42
        </button>
        <button
          style="padding:4px 10px;border-radius:5px;font-size:.78rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => { void this.router.push({ name: "post", params: { slug: "praxisjs-v2" } }); }}
        >
          push post: praxisjs-v2
        </button>
      </nav>
    );
  }
}

// ─── Route resolution panel ───────────────────────────────────────────────────

@Component()
class ResolvePanel extends StatefulComponent {
  @Router() router!: RouterInstance;

  render() {
    return (
      <div style="padding:8px 14px;background:#f5f3ff;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:.78rem;color:#5b21b6">
        resolvePath({" "}
        <span style="color:#7c3aed">&#123; name: "user", params: &#123; id: "99" &#125; &#125;</span>
        {" "}) →{" "}
        <strong>{() => {
          try { return this.router.resolvePath({ name: "user", params: { id: "99" } }); }
          catch { return "error"; }
        }}</strong>
      </div>
    );
  }
}

// ─── Root app ─────────────────────────────────────────────────────────────────

@Router([
  { path: "/", component: HomePage },
  { path: "/users/:id", name: "user", component: UserPage },
  { path: "/posts/:slug", name: "post", component: PostPage },
])
@Component()
class NamedRoutesApp extends StatefulComponent {
  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:380px">
        <NavBar />
        <ResolvePanel />
        <div style="min-height:130px">
          <RouterView />
        </div>
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Router/Named Routes",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "Named routes — push({ name }), Link to={{ name }}, resolvePath",
  render: () => <NamedRoutesApp />,
};
