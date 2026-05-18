import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Injectable, inject } from "@praxisjs/di";
import {
  Router,
  RouterView,
  Link,
  type RouterInstance,
} from "@praxisjs/router";
import { Storable, ReactiveStore, store } from "@praxisjs/store";
import type { RouteLocation } from "@praxisjs/router";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Auth service ─────────────────────────────────────────────────────────────

@Injectable()
class AuthService {
  private _loggedIn = false;

  get loggedIn() { return this._loggedIn; }
  login()  { this._loggedIn = true; }
  logout() { this._loggedIn = false; }
}

// ─── Session store ────────────────────────────────────────────────────────────

@Storable()
class SessionStore extends ReactiveStore {
  role: "guest" | "admin" = "guest";
  setRole(role: "guest" | "admin") { this.role = role; }
}

// ─── Guard event (updated on each navigation attempt) ─────────────────────────

let lastGuardEvent = "";

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class PublicPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#374151">Public</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">No guard — anyone can navigate here.</p>
      </div>
    );
  }
}

@Component()
class DashboardPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#16a34a">Dashboard</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Guard used <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">inject(AuthService)</code> and allowed navigation.
        </p>
      </div>
    );
  }
}

@Component()
class AdminPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#7c3aed">Admin</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Guard used <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">store(SessionStore)</code> and confirmed admin role.
        </p>
      </div>
    );
  }
}

@Component()
class LoginPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#dc2626">Login</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Redirected — guard returned <code style="background:#f3f4f6;padding:1px 5px;border-radius:4px">'/login'</code>.
        </p>
      </div>
    );
  }
}

// ─── Control panel ────────────────────────────────────────────────────────────

@Component()
class ControlPanel extends StatefulComponent {
  @Router() router!: RouterInstance;
  @State() guardLog = "";
  @State() loggedIn = false;
  @State() role: "guest" | "admin" = "guest";

  get auth() { return inject(AuthService); }
  get session() { return store(SessionStore); }

  toggleAuth() {
    if (this.auth.loggedIn) {
      this.auth.logout();
      this.loggedIn = false;
      void this.router.push("/public");
    } else {
      this.auth.login();
      this.loggedIn = true;
      void this.router.push("/dashboard").then(() => { this.guardLog = lastGuardEvent; });
    }
  }

  toggleRole() {
    const next: "guest" | "admin" = this.role === "admin" ? "guest" : "admin";
    this.session.setRole(next);
    this.role = next;
    if (next === "admin") {
      void this.router.push("/admin").then(() => { this.guardLog = lastGuardEvent; });
    } else {
      void this.router.push("/public");
    }
  }

  navigate(path: string) {
    void this.router.push(path).then(() => { this.guardLog = lastGuardEvent; });
  }

  render() {
    return (
      <div style="font-family:sans-serif">
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">
          <span style="font-size:.78rem;color:#6b7280">
            AuthService:{" "}
            <strong style={() => `color:${this.loggedIn ? "#16a34a" : "#dc2626"}`}>
              {() => (this.loggedIn ? "logged in" : "guest")}
            </strong>
          </span>
          <span style="font-size:.78rem;color:#6b7280">
            SessionStore.role:{" "}
            <strong style={() => `color:${this.role === "admin" ? "#7c3aed" : "#6b7280"}`}>
              {() => this.role}
            </strong>
          </span>
          <div style="flex:1" />
          <button
            style="padding:3px 10px;border-radius:5px;font-size:.78rem;border:1px solid #d1d5db;background:#fff;cursor:pointer"
            onClick={() => { this.toggleAuth(); }}
          >
            {() => (this.loggedIn ? "Log out" : "Log in")}
          </button>
          <button
            style="padding:3px 10px;border-radius:5px;font-size:.78rem;border:1px solid #d1d5db;background:#fff;cursor:pointer"
            onClick={() => { this.toggleRole(); }}
          >
            {() => (this.role === "admin" ? "Demote to guest" : "Promote to admin")}
          </button>
        </div>

        <nav style="display:flex;gap:4px;padding:8px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;align-items:center">
          <Link to="/public" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">
            Public
          </Link>
          <button
            style="padding:5px 11px;border-radius:5px;font-size:.83rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
            onClick={() => { this.navigate("/dashboard"); }}
          >
            Dashboard <span style="font-size:.75rem;color:#9ca3af">(inject)</span>
          </button>
          <button
            style="padding:5px 11px;border-radius:5px;font-size:.83rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
            onClick={() => { this.navigate("/admin"); }}
          >
            Admin <span style="font-size:.75rem;color:#9ca3af">(store)</span>
          </button>
        </nav>

        <div style="padding:6px 14px;background:#fffbeb;border-bottom:1px solid #fde68a;min-height:28px">
          <span style="font-size:.78rem;color:#92400e">
            Guard result: <strong>{() => this.guardLog || "— navigate to a guarded route —"}</strong>
          </span>
        </div>
      </div>
    );
  }
}

// ─── Root app ─────────────────────────────────────────────────────────────────

@Router([
  { path: "/public", component: PublicPage },
  {
    path: "/dashboard",
    component: DashboardPage,
    beforeEnter: async (_to: RouteLocation, _from: RouteLocation | null) => {
      const auth = inject(AuthService);
      if (!auth.loggedIn) {
        lastGuardEvent = "inject(AuthService).loggedIn = false → redirect /login";
        return "/login";
      }
      lastGuardEvent = "inject(AuthService).loggedIn = true → allowed";
      return true;
    },
  },
  {
    path: "/admin",
    component: AdminPage,
    beforeEnter: async (_to: RouteLocation, _from: RouteLocation | null) => {
      const session = store(SessionStore);
      if (session.role !== "admin") {
        lastGuardEvent = `store(SessionStore).role = '${session.role}' → redirect /login`;
        return "/login";
      }
      lastGuardEvent = `store(SessionStore).role = 'admin' → allowed`;
      return true;
    },
  },
  { path: "/login", component: LoginPage },
])
@Component()
class GuardApp extends StatefulComponent {
  @Router() router!: RouterInstance;

  onMount() {
    void this.router.push("/public");
  }

  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:380px">
        <ControlPanel />
        <div style="min-height:130px">
          <RouterView />
        </div>
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Router/Navigation Guard",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "beforeEnter — inject() & store()",
  render: () => <GuardApp />,
};
