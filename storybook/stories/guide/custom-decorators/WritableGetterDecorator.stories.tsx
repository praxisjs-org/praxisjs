import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";
import { Component, State, createWritableGetterDecorator } from "@praxisjs/decorators";
import type { Signal } from "@praxisjs/shared";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type Slots = Record<symbol, unknown>;

function Overridable() {
  return createWritableGetterDecorator({
    label: "@Overridable()",
    setup(original, context) {
      const pinned = Symbol(`pinned.${String(context.name)}`);
      return {
        get(this: Slots) {
          const value = (this[pinned] as Signal<unknown>)();
          return value === undefined ? original.call(this) : value;
        },
        set(this: Slots, value) {
          (this[pinned] as Signal<unknown>).set(value);
        },
        init(instance) {
          (instance as Slots)[pinned] = signal(undefined);
        },
      };
    },
  });
}

@Component()
class OverridableDemo extends StatefulComponent {
  @State() page = "Home";

  @Overridable()
  get title(): string | undefined { return this.page; }
  set title(_value: string | undefined) { /* replaced by @Overridable() */ }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Overridable — writable getter decorator</h3>
        <div style="display:flex;gap:8px">
          {["Home", "About", "Blog"].map((page) => (
            <button
              style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { this.page = page; }}
            >
              {page}
            </button>
          ))}
        </div>
        <div style="padding:10px 14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;font-size:1.1rem;font-weight:600;color:#6d5bbd">
          {() => this.title}
        </div>
        <div style="display:flex;gap:8px">
          <button
            style="flex:1;padding:6px;border-radius:5px;border:1px solid #6d5bbd;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.title = "Pinned title"; }}
          >
            Pin title
          </button>
          <button
            style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.title = undefined; }}
          >
            Reset
          </button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Built with <code>createWritableGetterDecorator</code>'s <code>setup</code> form: the
          getter follows <code>page</code> until a value is assigned, and goes back to it when
          <code>undefined</code> is assigned.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/WritableGetterDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WritableGetterDecorator: Story = {
  name: "createWritableGetterDecorator — @Overridable",
  render: () => <OverridableDemo />,
};
