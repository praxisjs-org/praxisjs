import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Prop, Slot } from "@praxisjs/decorators";
import type { Children } from "@praxisjs/shared";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class Panel extends StatefulComponent {
  @Slot() default!: Children;
  @Slot("header") header?: Children;
  @Slot("footer") footer?: Children;

  @State() collapsed = false;

  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:260px">
        {this.header && (
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb">
            <div style="font-weight:700;font-size:.92rem">{this.header}</div>
            <button
              style="all:unset;cursor:pointer;font-size:.8rem;color:#9ca3af;padding:2px 6px;border-radius:4px;border:1px solid #e5e7eb;background:#fff"
              onClick={() => {
                this.collapsed = !this.collapsed;
              }}
            >
              {() => (this.collapsed ? "Expand" : "Collapse")}
            </button>
          </div>
        )}
        {() =>
          !this.collapsed && <div style="padding:14px">{this.default}</div>
        }
        {this.footer && (
          <div style="padding:8px 14px;background:#fafafa;border-top:1px solid #e5e7eb;font-size:.78rem;color:#9ca3af">
            {this.footer}
          </div>
        )}
      </div>
    );
  }
}

@Component()
class SlotDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">
          @Slot — named content distribution
        </h3>
        <Panel>
          <span slot="header">Signal Inspector</span>
          <p style="margin:0;font-size:.88rem;color:#555">
            This content goes into the <strong>default</strong> slot. The panel
            header and footer are distributed via named slots.
          </p>
          <span slot="footer">Last updated: just now</span>
        </Panel>
        <Panel>
          <span slot="header">Minimal Panel</span>
          No footer slot — the footer section is omitted automatically.
        </Panel>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Slot()</code> captures default children.{" "}
          <code>@Slot('name')</code> captures children with{" "}
          <code>slot="name"</code>. Missing slots render nothing.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Events/Slot",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const SlotStory: Story = {
  name: "@Slot — named content distribution",
  render: () => <SlotDemo />,
};
