import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Storable, Store, ReactiveStore } from "@praxisjs/store";
import type { StorePlugin } from "@praxisjs/store";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── In-memory "storage" (simulates localStorage) ────────────────────────────

const fakeStorage: Record<string, Record<string, unknown>> = {
  // Pre-seeded so the story shows restoration on first load
  BudgetStore: { balance: 250 },
};

// ─── Persistence plugin ───────────────────────────────────────────────────────

const persistPlugin: StorePlugin = {
  name: "persist",
  onInit({ store: s, storeName }) {
    const saved = fakeStorage[storeName];
    if (saved) {
      for (const [k, v] of Object.entries(saved)) {
        (s as Record<string, unknown>)[k] = v;
      }
    }
  },
  onMutation({ storeName, key, value }) {
    fakeStorage[storeName] ??= {};
    fakeStorage[storeName][key] = value;
  },
};

// ─── Store — plugin declared here ─────────────────────────────────────────────

@Storable({ plugins: [persistPlugin] })
class BudgetStore extends ReactiveStore {
  @State() balance = 0;

  deposit(amount: number) { this.balance += amount; }
  withdraw(amount: number) { this.balance = Math.max(0, this.balance - amount); }
  reset() { this.balance = 0; }
}

// ─── Storage view store ───────────────────────────────────────────────────────

@Storable()
class StorageViewStore extends ReactiveStore {
  @State() snapshot: Record<string, unknown> = {};

  refresh() {
    this.snapshot = { ...fakeStorage.BudgetStore };
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

@Component()
class BudgetControls extends StatefulComponent {
  @Store(BudgetStore) budget!: BudgetStore;
  @Store(StorageViewStore) view!: StorageViewStore;

  act(fn: () => void) {
    fn();
    this.view.refresh();
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:.82rem;color:#6b7280">Balance:</span>
          <span style="font-size:1.6rem;font-weight:700;color:#22c55e">
            ${() => this.budget.balance}
          </span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#22c55e;color:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.act(() => { this.budget.deposit(50); }); }}
          >
            + Deposit $50
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#f97316;color:#fff;cursor:pointer;font-size:.88rem"
            onClick={() => { this.act(() => { this.budget.withdraw(30); }); }}
          >
            − Withdraw $30
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.88rem;color:#555"
            onClick={() => { this.act(() => { this.budget.reset(); }); }}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }
}

@Component()
class StorageView extends StatefulComponent {
  @Store(StorageViewStore) view!: StorageViewStore;

  onMount() {
    this.view.refresh();
  }

  render() {
    return (
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
        <p style="margin:0 0 6px;font-size:.78rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">
          Saved to storage
        </p>
        <pre style="margin:0;font-size:.82rem;color:#374151;font-family:monospace">
          {() => JSON.stringify(this.view.snapshot, null, 2)}
        </pre>
        <p style="margin:8px 0 0;font-size:.78rem;color:#9ca3af">
          On next app load, <code>onInit</code> restores this state into the store automatically.
        </p>
      </div>
    );
  }
}

@Component()
class PersistPluginDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:360px">
        <div>
          <h3 style="margin:0 0 4px;font-size:.95rem">Persistence plugin</h3>
          <p style="margin:0;font-size:.82rem;color:#6b7280">
            <code>persistPlugin</code> is declared in <code>@Storable({"{ plugins: [persistPlugin] }"})</code>
            on <code>BudgetStore</code>. The store was pre-seeded with balance $250 — <code>onInit</code>
            restored it on first access. Every mutation is saved below.
          </p>
        </div>
        <BudgetControls />
        <StorageView />
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Store/Persistence Plugin",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <PersistPluginDemo />,
};
