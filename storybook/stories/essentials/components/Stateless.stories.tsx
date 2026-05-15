import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface CardProps {
  title: string;
  description?: string;
  badge?: string;
}

@Component()
class Card extends StatelessComponent<CardProps> {
  render() {
    return (
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;min-width:220px;font-family:sans-serif">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <h4 style="margin:0;font-size:.95rem;font-weight:700">{this.props.title}</h4>
          {this.props.badge && (
            <span style="padding:2px 8px;background:#ede9fe;color:#6d5bbd;border-radius:99px;font-size:.72rem;font-weight:700">
              {this.props.badge}
            </span>
          )}
        </div>
        {this.props.description && (
          <p style="margin:0;font-size:.85rem;color:#666">{this.props.description}</p>
        )}
        {this.props.children}
      </div>
    );
  }
}

@Component()
class StatelessDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif">
        <h3 style="margin:0;font-size:1rem">StatelessComponent</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <Card title="Core" description="Fine-grained signals." badge="stable" />
          <Card title="Store" description="Singleton state management." badge="beta" />
          <Card title="Router">
            <p style="margin:4px 0 0;font-size:.82rem;color:#888">Children passed via <code>this.props.children</code>.</p>
          </Card>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          No <code>@State</code> or <code>@Watch</code> — purely presentational, driven by props.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Components/StatelessComponent",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Stateless: Story = {
  name: "StatelessComponent",
  render: () => <StatelessDemo />,
};
