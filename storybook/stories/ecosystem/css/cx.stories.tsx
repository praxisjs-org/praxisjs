import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Stylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

class TagStyles extends Stylesheet {
  $base = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: sans-serif;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    background: #f3f4f6;
    color: #374151;
  `;
  $active = `
    background: #ede9fe;
    color: #6d5bbd;
    border-color: #c4b5fd;
  `;
  $disabled = `
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  `;
  $large = `
    padding: 6px 14px;
    font-size: 0.875rem;
  `;
}

class ContainerStyles extends Stylesheet {
  $root = `
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
    font-family: sans-serif;
    max-width: 480px;
  `;
  $row = `display: flex; gap: 8px; flex-wrap: wrap; align-items: center;`;
  $label = `font-size: 0.78rem; color: #6b7280; min-width: 100px;`;
  $hint = `font-size: 0.78rem; color: #9ca3af; font-style: italic;`;
}

@Component()
class CxDemo extends StatefulComponent {
  @State() activeA = false;
  @State() activeB = true;
  @State() activeC = false;

  @Styled(TagStyles)   $tag!: TagStyles;
  @Styled(ContainerStyles) $c!: ContainerStyles;

  render() {
    return (
      <div class={this.$c.$root}>
        <div>
          <div class={this.$c.$row} style="margin-bottom: 8px;">
            <span class={this.$c.$label}>Conditionals</span>
            <span
              class={() => cx(this.$tag.$base, { [this.$tag.$active]: this.activeA })}
              onClick={() => { this.activeA = !this.activeA; }}
            >
              {() => this.activeA ? "✓ Active" : "Inactive"}
            </span>
            <span
              class={() => cx(this.$tag.$base, { [this.$tag.$active]: this.activeB })}
              onClick={() => { this.activeB = !this.activeB; }}
            >
              {() => this.activeB ? "✓ Active" : "Inactive"}
            </span>
            <span
              class={() => cx(this.$tag.$base, this.$tag.$disabled)}
            >
              Disabled
            </span>
          </div>
          <p class={this.$c.$hint}>
            cx(base, {"{ active: bool }"}) — conditionally applies the active class
          </p>
        </div>

        <div>
          <div class={this.$c.$row} style="margin-bottom: 8px;">
            <span class={this.$c.$label}>Size variant</span>
            <span class={cx(this.$tag.$base)}>Default</span>
            <span class={cx(this.$tag.$base, this.$tag.$large)}>Large</span>
            <span class={() => cx(this.$tag.$base, this.$tag.$large, { [this.$tag.$active]: this.activeC })}
              onClick={() => { this.activeC = !this.activeC; }}
            >
              {() => this.activeC ? "✓ Large active" : "Large toggle"}
            </span>
          </div>
          <p class={this.$c.$hint}>
            cx(base, large, {"{ active: bool }"}) — stack multiple classes and conditionals
          </p>
        </div>

        <div>
          <div class={this.$c.$row} style="margin-bottom: 8px;">
            <span class={this.$c.$label}>Falsy values</span>
            <span class={cx(this.$tag.$base, null, undefined, false, "")}>
              Falsy filtered
            </span>
            <span class={cx(this.$tag.$base, ["extra", false, null])}>
              Array support
            </span>
          </div>
          <p class={this.$c.$hint}>
            cx filters out null, undefined, false, and empty strings automatically
          </p>
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/cx",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const CxStory: Story = {
  name: "cx() — class composition",
  render: () => <CxDemo />,
};
