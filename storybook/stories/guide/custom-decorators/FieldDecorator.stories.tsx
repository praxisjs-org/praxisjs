import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";
import { Component, createFieldDecorator } from "@praxisjs/decorators";
import type { Signal } from "@praxisjs/shared";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type Slots = Record<symbol, unknown>;

function SessionValue(key: string) {
  return createFieldDecorator<object, string>({
    label: "@SessionValue()",
    setup(name) {
      const slot = Symbol(`sessionValue.${name}`);
      return {
        get(this: Slots) {
          return (this[slot] as Signal<string>)();
        },
        set(this: Slots, value) {
          (this[slot] as Signal<string>).set(value);
          sessionStorage.setItem(key, value);
        },
        init(instance, initialValue) {
          (instance as Slots)[slot] = signal(sessionStorage.getItem(key) ?? initialValue);
        },
      };
    },
  });
}

@Component()
class SessionValueDemo extends StatefulComponent {
  @SessionValue("sb:custom-query")
  query = "";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@SessionValue — custom field decorator</h3>
        <input
          style="padding:7px 10px;border:1px solid #ccc;border-radius:6px"
          placeholder="Type something…"
          value={() => this.query}
          onInput={(e: Event) => { this.query = (e.target as HTMLInputElement).value; }}
        />
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Stored: <strong style="color:#6d5bbd">{() => this.query || "—"}</strong>
        </p>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Reload the page — the value persists in <code>sessionStorage</code>.
          Built with <code>createFieldDecorator</code>'s <code>setup</code> form: one get/set
          pair shared by every instance, each instance's signal in a symbol slot.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/FieldDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FieldDecorator: Story = {
  name: "createFieldDecorator — @SessionValue",
  render: () => <SessionValueDemo />,
};
