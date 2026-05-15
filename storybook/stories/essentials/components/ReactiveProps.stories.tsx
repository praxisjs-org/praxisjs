import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface BadgeProps { value: number }

@Component()
class Badge extends StatelessComponent<BadgeProps> {
  render() {
    return (
      <span style="display:inline-block;padding:3px 10px;background:#6d5bbd;color:#fff;border-radius:99px;font-size:.85rem;font-weight:700;font-variant-numeric:tabular-nums">
        {this.props.value}
      </span>
    );
  }
}

@Component()
class ReactivePropsDemo extends StatefulComponent {
  @State() count = 0;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif">
        <h3 style="margin:0;font-size:1rem">Reactive props — parent → child</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <button
            style="padding:6px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.count++; }}
          >
            +1
          </button>
          <span style="font-size:.9rem;color:#555">
            Static: <Badge value={this.count} />
          </span>
          <span style="font-size:.9rem;color:#555">
            Reactive: <Badge value={() => this.count} />
          </span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <strong>Static</strong> — snapshot at render time, never updates.{" "}
          <strong>Reactive</strong> — passes <code>{`() => this.count`}</code>, Badge stays in sync.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Components/ReactiveProps",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ReactiveProps: Story = {
  name: "Reactive props — parent → child",
  render: () => <ReactivePropsDemo />,
};
