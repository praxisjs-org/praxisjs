import { StatefulComponent } from "@praxisjs/core";
import { Component, createFieldDecorator } from "@praxisjs/decorators";
import { signal } from "@praxisjs/core/internal";
import type { Meta, StoryObj } from "@praxisjs/storybook";

function SessionValue(key: string) {
  return createFieldDecorator({
    bind(_instance, _name, initialValue) {
      const stored = sessionStorage.getItem(key);
      const _value = signal(stored ?? (initialValue as string) ?? "");

      return {
        descriptor: {
          get() { return _value(); },
          set(v: string) {
            _value.set(v);
            sessionStorage.setItem(key, v);
          },
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
          Built with <code>createFieldDecorator</code>: returns a signal-backed descriptor.
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
