import { addParamName } from "../internal/sheet.js";

import type { ReactiveStylesheet } from "../base/stylesheet.js";

/**
 * Marks a field in a {@link ReactiveStylesheet} subclass as a reactive CSS custom property.
 * The field name becomes `--fieldName` on the component's container element.
 * Setting the field updates the CSS var reactively — zero re-renders.
 *
 * Only valid inside a `ReactiveStylesheet` subclass. TypeScript enforces this at
 * compile time via the `createFieldDecorator<ReactiveStylesheet>` constraint.
 *
 * @example
 * class CardStyles extends ReactiveStylesheet {
 *   @Param() color  = '#3b82f6'   // → --color on the element
 *   @Param() radius = '8px'       // → --radius on the element
 *
 *   $root = `border-radius: var(--radius); background: var(--color);`
 * }
 *
 * // In the component:
 * this.$card.color = '#ef4444'  // updates --color reactively
 */
export function Param() {
  // Only records the field name: a stylesheet is instantiated once per class, as the template
  // `@Styled` compiles, and every component instance then gets its own signals from there.
  return function <This extends ReactiveStylesheet, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void {
    const name = context.name as string;
    context.addInitializer(function (this: This) {
      addParamName(this.constructor, name);
    });
  };
}
