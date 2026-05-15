import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, State } from "@praxisjs/decorators";
import { KeyCombo } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class KeyComboDemo extends StatefulComponent {
  @Compose(KeyCombo, "ctrl+k")
  search!: KeyCombo;

  @Compose(KeyCombo, "ctrl+s")
  save!: KeyCombo;

  @Compose(KeyCombo, "ctrl+z")
  undo!: KeyCombo;

  @State() log: string[] = [];

  onMount() {
    const check = () => {
      if (this.search.pressed) this.log = ["⌘K — Search opened", ...this.log.slice(0, 4)];
      if (this.save.pressed) this.log = ["⌘S — Saved!", ...this.log.slice(0, 4)];
      if (this.undo.pressed) this.log = ["⌘Z — Undo", ...this.log.slice(0, 4)];
    };
    this._interval = setInterval(check, 50);
  }

  onUnmount() { clearInterval(this._interval); }
  private _interval?: ReturnType<typeof setInterval>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">KeyCombo — keyboard shortcuts</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {[
            { label: "Ctrl+K", active: () => this.search.pressed },
            { label: "Ctrl+S", active: () => this.save.pressed },
            { label: "Ctrl+Z", active: () => this.undo.pressed },
          ].map((k) => (
            <span
              key={k.label}
              style={() => `padding:5px 12px;border-radius:5px;font-size:.82rem;font-family:monospace;font-weight:600;transition:all .1s;background:${k.active() ? "#6d5bbd" : "#f1f5f9"};color:${k.active() ? "#fff" : "#6b7280"}`}
            >
              {k.label}
            </span>
          ))}
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;min-height:60px">
          {() => this.log.length === 0
            ? <li style="font-size:.82rem;color:#d1d5db">Press a shortcut…</li>
            : this.log.map((e, i) => (
              <li style={`padding:4px 10px;border-radius:3px;font-size:.8rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>{e}</li>
            ))
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Compose(KeyCombo, 'ctrl+k')</code> — <code>pressed: boolean</code> is true
          while the combo is held. Supports <code>ctrl</code>, <code>shift</code>, <code>alt</code>, <code>meta</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/KeyCombo",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const KeyComboStory: Story = {
  name: "KeyCombo — keyboard shortcuts",
  render: () => <KeyComboDemo />,
};
