import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Injectable, Inject, container } from "@praxisjs/di";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Services ─────────────────────────────────────────────────────────────────

@Injectable()
class LoggerService {
  private entries: string[] = [];

  log(msg: string) {
    this.entries = [...this.entries, `[${new Date().toLocaleTimeString()}] ${msg}`];
  }

  getEntries() { return this.entries; }
}

@Injectable()
class UserService {
  @Inject(LoggerService) private logger!: LoggerService;
  private _users = [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" },
    { id: 3, name: "Carol", role: "user" },
  ];

  getAll() {
    this.logger.log("UserService.getAll()");
    return this._users;
  }

  promote(id: number) {
    this._users = this._users.map((u) =>
      u.id === id ? { ...u, role: u.role === "admin" ? "user" : "admin" } : u,
    );
    this.logger.log(`UserService.promote(${id})`);
  }
}

// ─── Components ──────────────────────────────────────────────────────────────

@Component()
class UserList extends StatefulComponent {
  @Inject(UserService) private userService!: UserService;
  @State() users = this.userService.getAll();

  refresh() {
    this.users = this.userService.getAll();
  }

  promote(id: number) {
    this.userService.promote(id);
    this.refresh();
  }

  render() {
    return (
      <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">
        {() => this.users.map((u) => (
          <li style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:.88rem">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:600">{u.name}</span>
              <span style={`padding:2px 7px;border-radius:99px;font-size:.72rem;font-weight:700;background:${u.role === "admin" ? "#ede9fe" : "#f1f5f9"};color:${u.role === "admin" ? "#5b21b6" : "#64748b"}`}>
                {u.role}
              </span>
            </div>
            <button
              style="padding:3px 10px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.78rem"
              onClick={() => { this.promote(u.id); }}
            >
              Toggle role
            </button>
          </li>
        ))}
      </ul>
    );
  }
}

@Component()
class LogPanel extends StatefulComponent {
  @Inject(LoggerService) private logger!: LoggerService;
  @State() entries: string[] = [];

  onMount() {
    setInterval(() => { this.entries = [...this.logger.getEntries()]; }, 200);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:4px">
        <p style="margin:0;font-size:.78rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">Logger (shared singleton)</p>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;max-height:100px;overflow-y:auto">
          {() => this.entries.length === 0
            ? <li style="font-size:.78rem;color:#d1d5db">No log entries yet</li>
            : [...this.entries].reverse().map((entry, i) => (
              <li style={`padding:3px 8px;border-radius:3px;font-size:.78rem;font-family:monospace;background:${i === 0 ? "#f0fdf4" : "#f9fafb"};color:${i === 0 ? "#166534" : "#374151"}`}>
                {entry}
              </li>
            ))
          }
        </ul>
      </div>
    );
  }
}

@Component()
class DIDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:340px">
        <h3 style="margin:0;font-size:1rem">@Injectable / @Inject — singleton DI</h3>
        <p style="margin:0;font-size:.82rem;color:#6b7280">
          <code>UserList</code> and <code>LogPanel</code> both inject from the global container.
          <code>LoggerService</code> is the same singleton instance — actions in UserList appear in LogPanel.
        </p>
        <UserList />
        <LogPanel />
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Default scope is <code>singleton</code> — one instance per container, shared across all consumers.
          Use <code>scope: 'transient'</code> for a fresh instance on every resolve.
        </p>
      </div>
    );
  }
}

// Re-register services fresh each render to avoid stale singletons across HMR
container.register(LoggerService);
container.register(UserService);

const meta: Meta = {
  title: "Ecosystem/DI",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <DIDemo />,
};
