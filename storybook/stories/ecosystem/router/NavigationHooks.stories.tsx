import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  Link,
  type RouterInstance,
} from "@praxisjs/router";
import type { RouteLocationInternal } from "@praxisjs/router/internal";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Event log entry ──────────────────────────────────────────────────────────

interface LogEntry {
  kind: "afterEnter" | "afterEach";
  to: string;
  from: string | null;
  time: string;
}

// Shared log — populated by hooks, read by the log panel
const eventLog: LogEntry[] = [];
let onLogUpdate: (() => void) | null = null;

function addEntry(kind: LogEntry["kind"], to: RouteLocationInternal, from: RouteLocationInternal | null) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
  eventLog.unshift({ kind, to: to.path, from: from?.path ?? null, time });
  if (eventLog.length > 20) eventLog.length = 20;
  onLogUpdate?.();
}

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class HomePage extends StatefulComponent {
  render() {
    return (
      <div style="padding:18px 20px;font-family:sans-serif">
        <h2 style="margin:0 0 6px;font-size:1.05rem;color:#374151">Home</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">No per-route <code>afterEnter</code>.</p>
      </div>
    );
  }
}

@Component()
class DashboardPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:18px 20px;font-family:sans-serif">
        <h2 style="margin:0 0 6px;font-size:1.05rem;color:#16a34a">Dashboard</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">
          Has <code>afterEnter</code> — fires before the global <code>afterEach</code>.
        </p>
      </div>
    );
  }
}

@Component()
class AnalyticsPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:18px 20px;font-family:sans-serif">
        <h2 style="margin:0 0 6px;font-size:1.05rem;color:#0891b2">Analytics</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">
          Has <code>afterEnter</code> — fires before the global <code>afterEach</code>.
        </p>
      </div>
    );
  }
}

// ─── Navigation log panel ─────────────────────────────────────────────────────

@Component()
class LogPanel extends StatefulComponent {
  @State() _tick = 0;

  onMount() {
    onLogUpdate = () => { this._tick++; };
  }

  onUnmount() {
    onLogUpdate = null;
  }

  render() {
    return (
      <div style="padding:10px 14px;border-top:1px solid #e5e7eb;font-family:monospace;font-size:.76rem;background:#0f172a;min-height:160px;max-height:220px;overflow-y:auto">
        <div style="color:#64748b;margin-bottom:6px;font-family:sans-serif;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase">
          Event Log {() => `(${eventLog.length} entries)`}
        </div>
        {() => {
          void this._tick; // reactive dependency
          if (eventLog.length === 0) {
            return (
              <div style="color:#475569;font-style:italic">
                Navigate to see hooks fire…
              </div>
            );
          }
          return eventLog.map((e, i) => (
            <div key={i} style="display:flex;gap:10px;align-items:baseline;margin-bottom:4px">
              <span style="color:#475569;flex-shrink:0">{e.time}</span>
              <span
                style={`flex-shrink:0;padding:1px 6px;border-radius:3px;font-size:.72rem;font-family:sans-serif;font-weight:600;${
                  e.kind === "afterEnter"
                    ? "background:#14532d;color:#86efac"
                    : "background:#1e3a5f;color:#93c5fd"
                }`}
              >
                {e.kind}
              </span>
              <span style="color:#e2e8f0">
                {e.to}
              </span>
              {e.from !== null && (
                <span style="color:#475569">← {e.from}</span>
              )}
            </div>
          ));
        }}
      </div>
    );
  }
}

// ─── Nav bar ──────────────────────────────────────────────────────────────────

@Component()
class NavBar extends StatefulComponent {
  render() {
    return (
      <nav style="display:flex;gap:4px;padding:8px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;align-items:center">
        <Link to="/" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Home</Link>
        <Link to="/dashboard" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Dashboard</Link>
        <Link to="/analytics" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Analytics</Link>
      </nav>
    );
  }
}

// ─── Root app ─────────────────────────────────────────────────────────────────

@Router([
  { path: "/", component: HomePage },
  {
    path: "/dashboard",
    component: DashboardPage,
    afterEnter(to, from) {
      addEntry("afterEnter", to, from);
    },
  },
  {
    path: "/analytics",
    component: AnalyticsPage,
    afterEnter(to, from) {
      addEntry("afterEnter", to, from);
    },
  },
])
@Component()
class HooksApp extends StatefulComponent {
  @Router() router!: RouterInstance;

  onMount() {
    // Global afterEach: fires after afterEnter for every navigation
    this.router.afterEach((to, from) => {
      addEntry("afterEach", to, from);
    });
  }

  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:380px">
        <div style="padding:8px 14px;background:#eff6ff;border-bottom:1px solid #e5e7eb;font-size:.78rem;color:#1d4ed8">
          <strong>afterEnter</strong> (per-route) fires before <strong>afterEach</strong> (global) — navigate to see the order.
        </div>
        <NavBar />
        <div style="min-height:100px">
          <RouterView />
        </div>
        <LogPanel />
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Router/Navigation Hooks",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "afterEnter + afterEach — navigation event log",
  render: () => <HooksApp />,
};
