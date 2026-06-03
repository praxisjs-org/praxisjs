import { createFieldDecorator } from "@praxisjs/decorators";

import type { ReactiveStylesheet } from "../base/stylesheet.js";

const PARAM_META = new WeakMap<object, Set<string>>();

export function getParamNames(ctor: object): Set<string> {
  return PARAM_META.get(ctor) ?? new Set();
}

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
  return createFieldDecorator<ReactiveStylesheet>({
    bind(instance, name) {
      const ctor = (instance as object).constructor as object;
      let meta = PARAM_META.get(ctor);
      if (!meta) { meta = new Set(); PARAM_META.set(ctor, meta); }
      meta.add(name);
      return {};
    },
  });
}
