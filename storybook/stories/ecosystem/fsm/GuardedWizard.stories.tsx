import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { StateMachine, Transition } from "@praxisjs/fsm";
import type { Machine } from "@praxisjs/fsm";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type WizardState = "step1" | "step2" | "review" | "done";
type WizardEvent = "NEXT" | "BACK" | "SUBMIT" | "RESET";

const labelStyle =
  "display:block;font-size:.82rem;font-weight:600;margin-bottom:4px;color:#ccc";
const inputStyle =
  "width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:.9rem;outline:none";
const inputErrStyle =
  "width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid #f87171;background:#1e1e2e;color:#fff;font-size:.9rem;outline:none";
const btnStyle =
  "padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.9rem";
const errStyle = "font-size:.78rem;color:#f87171;margin-top:3px;min-height:16px";

@Component()
class GuardedWizard extends StatefulComponent {
  @State() name = "";
  @State() email = "";
  @State() blocked = false;

  @StateMachine<WizardState, WizardEvent, GuardedWizard>({
    initial: "step1",
    states: {
      step1: {
        on: {
          NEXT: { target: "step2", guard: (self) => self.name.trim().length > 0 },
        },
      },
      step2: {
        on: {
          NEXT: {
            target: "review",
            guard: (self) =>
              self.email.trim().length > 0 && self.email.includes("@"),
          },
          BACK: "step1",
        },
      },
      review: { on: { SUBMIT: "done", BACK: "step2" } },
      done: { on: { RESET: "step1" } },
    },
  })
  machine!: Machine<WizardState, WizardEvent>;

  @Transition("machine", "RESET")
  reset() {
    this.name = "";
    this.email = "";
    this.blocked = false;
  }

  tryNext() {
    this.blocked = !this.machine.send("NEXT");
  }

  tryBack() {
    this.machine.send("BACK");
    this.blocked = false;
  }

  render() {
    return (
      <div style="font-family:sans-serif;min-width:340px;max-width:440px">
        <h3 style="margin:0 0 4px;font-size:1rem">Guarded Wizard — @StateMachine</h3>
        <p style="margin:0 0 16px;font-size:.78rem;color:#aaa">
          Each step has a <code>guard</code> — Next is blocked until the field
          is valid.
        </p>

        {/* Step indicator */}
        <div style="display:flex;gap:6px;margin-bottom:20px">
          {(["step1", "step2", "review", "done"] as WizardState[]).map(
            (s, i) => (
              <div
                key={s}
                style={() => {
                  const steps: WizardState[] = ["step1", "step2", "review", "done"];
                  const active = steps.indexOf(this.machine.state());
                  return `flex:1;height:4px;border-radius:2px;background:${i <= active ? "#6d5bbd" : "#2e2e4e"}`;
                }}
              />
            ),
          )}
        </div>

        {/* Step 1 */}
        {() =>
          this.machine.is("step1") && (
            <div style="display:flex;flex-direction:column;gap:12px">
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  style={() => (this.blocked && !this.name.trim() ? inputErrStyle : inputStyle)}
                  placeholder="e.g. Ada Lovelace"
                  value={() => this.name}
                  onInput={(e: InputEvent) => {
                    this.name = (e.target as HTMLInputElement).value;
                    this.blocked = false;
                  }}
                />
                <p style={errStyle}>
                  {() => (this.blocked && !this.name.trim() ? "Name is required" : "")}
                </p>
              </div>
              <div style="display:flex;justify-content:flex-end">
                <button style={btnStyle} onClick={() => { this.tryNext(); }}>
                  Next →
                </button>
              </div>
            </div>
          )
        }

        {/* Step 2 */}
        {() =>
          this.machine.is("step2") && (
            <div style="display:flex;flex-direction:column;gap:12px">
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  style={() =>
                    this.blocked &&
                    (!this.email.trim() || !this.email.includes("@"))
                      ? inputErrStyle
                      : inputStyle
                  }
                  placeholder="e.g. ada@example.com"
                  value={() => this.email}
                  onInput={(e: InputEvent) => {
                    this.email = (e.target as HTMLInputElement).value;
                    this.blocked = false;
                  }}
                />
                <p style={errStyle}>
                  {() =>
                    this.blocked &&
                    (!this.email.trim() || !this.email.includes("@"))
                      ? "A valid email is required"
                      : ""
                  }
                </p>
              </div>
              <div style="display:flex;justify-content:space-between">
                <button style={btnStyle} onClick={() => { this.tryBack(); }}>← Back</button>
                <button style={btnStyle} onClick={() => { this.tryNext(); }}>Next →</button>
              </div>
            </div>
          )
        }

        {/* Review */}
        {() =>
          this.machine.is("review") && (
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="background:#1e1e2e;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px">
                <p style="margin:0;font-size:.85rem;color:#aaa">Review your details</p>
                <p style="margin:0;font-size:.9rem">
                  <span style="color:#aaa">Name: </span>
                  <strong>{() => this.name}</strong>
                </p>
                <p style="margin:0;font-size:.9rem">
                  <span style="color:#aaa">Email: </span>
                  <strong>{() => this.email}</strong>
                </p>
              </div>
              <div style="display:flex;justify-content:space-between">
                <button style={btnStyle} onClick={() => { this.tryBack(); }}>← Back</button>
                <button style={btnStyle} onClick={() => { this.machine.send("SUBMIT"); }}>Submit</button>
              </div>
            </div>
          )
        }

        {/* Done */}
        {() =>
          this.machine.is("done") && (
            <div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center">
              <div style="font-size:2rem">✓</div>
              <p style="margin:0;font-size:.9rem;color:#aaa">
                Submitted as <strong style="color:#fff">{() => this.name}</strong>
              </p>
              <button style={btnStyle} onClick={() => { this.reset(); }}>
                Start over
              </button>
            </div>
          )
        }

        <p style="margin:16px 0 0;font-size:.72rem;color:#555;border-top:1px solid #2e2e4e;padding-top:10px">
          State: <code style="color:#a78bfa">{() => this.machine.state()}</code>
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/FSM/GuardedWizard",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const GuardedWizardStory: Story = {
  name: "@StateMachine — guarded wizard",
  render: () => <GuardedWizard />,
};
