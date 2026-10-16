import type { StatefulComponent } from "@praxisjs/core";
import {
  createEffect,
  disposeEffect,
  getComponentAnchor,
  readSignal,
  SignalNode,
  writeSignal,
  type EffectNode,
} from "@praxisjs/core/internal";
import { assertFieldContext } from "@praxisjs/decorators";

import { HookedField, type LifecycleHost } from "../internal/lifecycle.js";
import { injectStyle } from "../internal/registry.js";
import { compileSheet, type CompiledSheet } from "../internal/sheet.js";

import type { ReactiveStylesheet, Stylesheet } from "../base/stylesheet.js";

type ParamValue = string | number;

const PARAMS = Symbol("praxis.styled.params");

interface ParamSheet {
  readonly [PARAMS]: Array<SignalNode<ParamValue>>;
}

// One class per stylesheet: the class names and the @Param() accessors live on its prototype,
// so an instance is a single slot holding its signal nodes.
function createParamSheetClass(sheet: CompiledSheet): new (nodes: Array<SignalNode<ParamValue>>) => ParamSheet {
  class Sheet implements ParamSheet {
    readonly [PARAMS]: Array<SignalNode<ParamValue>>;

    constructor(nodes: Array<SignalNode<ParamValue>>) {
      this[PARAMS] = nodes;
    }
  }
  const proto = Sheet.prototype;
  for (const key in sheet.classMap) {
    Object.defineProperty(proto, key, { value: sheet.classMap[key], writable: true, enumerable: true, configurable: true });
  }
  sheet.params.forEach((param, i) => {
    Object.defineProperty(proto, param, {
      enumerable: true,
      configurable: true,
      get(this: ParamSheet) {
        return readSignal(this[PARAMS][i]);
      },
      set(this: ParamSheet, value: ParamValue) {
        writeSignal(this[PARAMS][i], value);
      },
    });
  });
  return Sheet;
}

class ParamField extends HookedField {
  readonly nodes: Array<SignalNode<ParamValue>>;
  readonly sheet: ParamSheet;
  effects: EffectNode[] | undefined = undefined;
  el: HTMLElement | undefined = undefined;

  constructor(instance: LifecycleHost, Sheet: new (nodes: Array<SignalNode<ParamValue>>) => ParamSheet, defaults: readonly ParamValue[]) {
    super(instance);
    const nodes = new Array<SignalNode<ParamValue>>(defaults.length);
    for (let i = 0; i < defaults.length; i++) nodes[i] = new SignalNode(defaults[i]);
    this.nodes = nodes;
    this.sheet = new Sheet(nodes);
  }
}

/**
 * Scoped CSS field decorator. Receives a {@link Stylesheet} or
 * {@link ReactiveStylesheet} subclass and builds a stylesheet object with:
 *
 * - `$xxx` fields → scoped class name strings (static, cached per class)
 * - `@Param() xxx` fields → reactive CSS custom property setters
 *   (requires {@link ReactiveStylesheet} and a `StatefulComponent` field)
 *
 * **TypeScript enforcement:**
 * - `@Styled(ReactiveStylesheetSubclass)` can only be applied to fields of
 *   classes that extend `StatefulComponent`.
 * - `@Styled(StylesheetSubclass)` (no `@Param()`) can be applied to any component.
 *
 * @example — static CSS (any component)
 * class IconStyles extends Stylesheet {
 *   $root = `display: inline-flex; align-items: center;`
 * }
 *
 * class Icon extends StatelessComponent {
 *   @Styled(IconStyles) $s!: IconStyles
 * }
 *
 * @example — reactive CSS vars (StatefulComponent only)
 * class CardStyles extends ReactiveStylesheet {
 *   @Param() color = '#3b82f6'
 *   $root = `border: 2px solid var(--color);`
 * }
 *
 * @Component()
 * class Card extends StatefulComponent {
 *   @Styled(CardStyles) $card!: CardStyles
 * }
 */
export function Styled<T extends Stylesheet>(
  StyleClass: new () => T,
): [T] extends [ReactiveStylesheet]
  ? (value: undefined, context: ClassFieldDecoratorContext<StatefulComponent, T>) => void
  : (value: undefined, context: ClassFieldDecoratorContext<object, T>) => void {
  const sheet = compileSheet(StyleClass);
  const { css, key } = sheet;

  // Eagerly inject CSS at decoration time (module load) so it is in the DOM
  // before any component mounts — avoids layout-measurement timing issues.
  if (css) injectStyle(key, css);

  // Both paths return the field's value from its initializer, which is much cheaper than redefining
  // the field with Object.defineProperty on every new instance. Each instance also re-checks the
  // stylesheet (cheap when present): it is collected again during a server render, and put back
  // if its <style> was removed.
  if (sheet.params.length === 0) {
    // The same frozen class map for every instance: no per-instance object, signals or hooks.
    const { classMap } = sheet;
    return ((_value: undefined, context: ClassFieldDecoratorContext) => {
      assertFieldContext(context);
      return () => {
        if (css) injectStyle(key, css);
        return classMap;
      };
    }) as never;
  }

  const Sheet = createParamSheetClass(sheet);
  const { defaults } = sheet;
  const vars = sheet.params.map((param) => `--${param}`);

  return ((_value: undefined, context: ClassFieldDecoratorContext) => {
    assertFieldContext(context);
    const name = context.name;
    const slot = Symbol(`praxis.styled.${String(name)}`);
    type Host = LifecycleHost & Record<typeof slot, ParamField>;

    function onMount(this: Host): void {
      const field = this[slot];
      field.prevMount?.call(this);
      const el = getComponentAnchor(this)?.parentElement;
      if (!el) return;
      const effects: EffectNode[] = [];
      for (let i = 0; i < vars.length; i++) {
        const node = field.nodes[i];
        const prop = vars[i];
        effects.push(createEffect(() => {
          el.style.setProperty(prop, String(readSignal(node)));
        }));
      }
      field.el = el;
      field.effects = effects;
    }

    function onUnmount(this: Host): void {
      const field = this[slot];
      field.prevUnmount?.call(this);
      const { effects, el } = field;
      if (effects) {
        for (const effect of effects) disposeEffect(effect);
        field.effects = undefined;
      }
      // The element the vars were set on, even if the anchor has been detached by now.
      if (el) {
        for (const prop of vars) el.style.removeProperty(prop);
        field.el = undefined;
      }
    }

    return function (this: Host): ParamSheet {
      if (css) injectStyle(key, css);
      const field = new ParamField(this, Sheet, defaults);
      this[slot] = field;
      this.onMount = onMount;
      this.onUnmount = onUnmount;
      return field.sheet;
    };
  }) as never;
}
