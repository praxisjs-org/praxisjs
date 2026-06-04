import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Storable, Store, store, ReactiveStore } from "@praxisjs/store";
import type { StorePlugin } from "@praxisjs/store";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Undo depth tracker (reactive) ───────────────────────────────────────────
// A separate store so components can reactively read undo availability.

@Storable()
class UndoTracker extends ReactiveStore {
  @State() depth = 0;

  push() { this.depth += 1; }
  pop() { if (this.depth > 0) this.depth -= 1; }
}

// ─── Plugin factory ───────────────────────────────────────────────────────────
// Returns a new plugin per store so the history closure is isolated.
// Uses `extend()` to graft `$undo` and `$undoDepth` onto the store instance.

function createUndoPlugin(): StorePlugin {
  let storeRef: Record<string, unknown> | null = null;
  const history: Record<string, unknown>[] = [];
  let pending: Record<string, unknown> | null = null;

  return {
    name: "undo",

    onInit({ store: s, extend }) {
      storeRef = s;

      extend({
        $undo() {
          const prev = history.pop();
          store(UndoTracker).pop();
          if (prev && storeRef) Object.assign(storeRef, prev);
        },
      });
    },

    // Snapshot the full store state before each action call
    onAction() {
      if (storeRef) pending = { ...storeRef };
    },

    // Commit the snapshot only if the action actually ran
    onActionDone() {
      if (pending) {
        history.push(pending);
        store(UndoTracker).push();
        pending = null;
      }
    },
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ExpenseEntry { label: string; amount: number }

@Storable({ plugins: [createUndoPlugin()] })
class ExpenseStore extends ReactiveStore {
  @State() balance = 500;
  @State() entries: ExpenseEntry[] = [];

  spend(label: string, amount: number) {
    this.balance = Math.max(0, this.balance - amount);
    this.entries = [...this.entries, { label, amount }];
  }

  addFunds(amount: number) {
    this.balance += amount;
    this.entries = [...this.entries, { label: "Deposit", amount: -amount }];
  }

  clear() {
    this.balance = 500;
    this.entries = [];
  }
}

// ─── Type helper for the extended store ───────────────────────────────────────

interface ExtendedExpenseStore extends ExpenseStore {
  $undo(): void;
}

// ─── Components ───────────────────────────────────────────────────────────────

@Component()
class ExpenseActions extends StatefulComponent {
  @Store(ExpenseStore) expenses!: ExpenseStore;
  @Store(UndoTracker) undo!: UndoTracker;

  get extended() { return this.expenses as ExtendedExpenseStore; }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:.82rem;color:#6b7280">Balance:</span>
          <span style="font-size:1.8rem;font-weight:700">
            ${() => this.expenses.balance}
          </span>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button
            style="padding:6px 12px;border-radius:6px;border:none;background:#f97316;color:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.extended.spend("Coffee", 5); }}
          >
            Coffee −$5
          </button>
          <button
            style="padding:6px 12px;border-radius:6px;border:none;background:#f97316;color:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.extended.spend("Lunch", 18); }}
          >
            Lunch −$18
          </button>
          <button
            style="padding:6px 12px;border-radius:6px;border:none;background:#22c55e;color:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.extended.addFunds(100); }}
          >
            Deposit +$100
          </button>
          <button
            style="padding:6px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem;color:#555"
            onClick={() => { this.extended.clear(); }}
          >
            Clear
          </button>
        </div>

        <div style="display:flex;align-items:center;gap:10px">
          <button
            style={() =>
              `padding:6px 14px;border-radius:6px;border:none;font-size:.85rem;cursor:${
                this.undo.depth > 0 ? "pointer" : "default"
              };background:${
                this.undo.depth > 0 ? "#6d5bbd" : "#e5e7eb"
              };color:${
                this.undo.depth > 0 ? "#fff" : "#adb5bd"
              }`
            }
            onClick={() => { if (this.undo.depth > 0) this.extended.$undo(); }}
          >
            ↩ Undo
          </button>
          {() => this.undo.depth > 0 && (
            <span style="font-size:.78rem;color:#9ca3af">
              {this.undo.depth} step{this.undo.depth !== 1 ? "s" : ""} available
            </span>
          )}
        </div>
      </div>
    );
  }
}

@Component()
class ExpenseLog extends StatefulComponent {
  @Store(ExpenseStore) expenses!: ExpenseStore;

  render() {
    return (
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;min-height:80px">
        <p style="margin:0 0 8px;font-size:.78rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em">
          Expense log
        </p>
        {() => this.expenses.entries.length === 0
          ? <p style="margin:0;font-size:.83rem;color:#d1d5db">No entries yet</p>
          : [...this.expenses.entries].reverse().map((e) => (
            <div style="display:flex;justify-content:space-between;font-size:.83rem;padding:3px 0;border-bottom:1px solid #f3f4f6">
              <span>{e.label}</span>
              <span style={`font-weight:600;color:${e.amount >= 0 ? "#f97316" : "#22c55e"}`}>
                {e.amount >= 0 ? "-" : "+"}${Math.abs(e.amount)}
              </span>
            </div>
          ))
        }
      </div>
    );
  }
}

@Component()
class ExtendDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:360px">
        <div>
          <h3 style="margin:0 0 4px;font-size:.95rem">
            <code>extend()</code> — adding <code>$undo</code> via plugin
          </h3>
          <p style="margin:0;font-size:.82rem;color:#6b7280">
            The <code>createUndoPlugin()</code> uses <code>extend({"{ $undo }"} )</code> inside <code>onInit</code>
            to graft an undo method onto <code>ExpenseStore</code> without touching the class.
            <code>onAction</code> snapshots state before each call; <code>onActionDone</code> commits it.
          </p>
        </div>
        <ExpenseActions />
        <ExpenseLog />
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Store/Extend Plugin",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <ExtendDemo />,
};
