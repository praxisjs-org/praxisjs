import type { StatefulComponent } from "@praxisjs/core";
import { effect, signal, type RootComponent } from "@praxisjs/core/internal";
import { createFieldDecorator } from "@praxisjs/decorators";

import { getParamNames } from "./param.js";
import { isCSSBuilder } from "../builder/css-builder.js";
import { hashCSS } from "../internal/hash.js";
import { injectStyle, releaseStyle } from "../internal/registry.js";

import type { ReactiveStylesheet, Stylesheet } from "../base/stylesheet.js";

// ─── Class data cache ─────────────────────────────────────────────────────────

interface StyleClassData {
  classMap: Readonly<Record<string, string>>;
  rawCSS: string;
  registryKey: string;
  paramDefaults: Readonly<Record<string, string | number>>;
}

const styleClassCache = new Map<new () => Stylesheet, StyleClassData>();

function getStyleClassData(StyleClass: new () => Stylesheet): StyleClassData {
  const cached = styleClassCache.get(StyleClass);
  if (cached) return cached;

  // Constructing the template fires @Param() addInitializers, populating PARAM_META.
  const template = new StyleClass() as unknown as Record<string, unknown>;
  const paramNames = getParamNames(StyleClass);

  const classMap: Record<string, string> = {};
  const blocks: string[] = [];
  const paramDefaults: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(template)) {
    if (key.startsWith("$")) {
      // Accept plain strings or fluent CSSBuilder values.
      const css = typeof value === "string" ? value : isCSSBuilder(value) ? String(value) : null;
      if (css !== null) {
        const safeName = key.slice(1).replace(/[^\w-]/g, "-");
        const className = `prx-${safeName}-${hashCSS(css)}`;
        classMap[key] = className;
        blocks.push(`.${className} { ${css.trim()} }`);
      }
    } else if (paramNames.has(key) && (typeof value === "string" || typeof value === "number")) {
      paramDefaults[key] = value;
    }
  }

  const data: StyleClassData = {
    classMap: Object.freeze(classMap),
    rawCSS: blocks.join("\n"),
    registryKey: blocks.length ? hashCSS(blocks.join("\n")) : "",
    paramDefaults: Object.freeze(paramDefaults),
  };
  styleClassCache.set(StyleClass, data);
  return data;
}

// ─── @Styled field decorator ──────────────────────────────────────────────────

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
  const data = getStyleClassData(StyleClass);

  // Eagerly inject CSS at decoration time (module load) so it is in the DOM
  // before any component mounts — avoids layout-measurement timing issues.
  // The per-instance onMount/onUnmount still manage the ref count on top of
  // this base reference, which intentionally stays for the page lifetime.
  if (data.rawCSS) injectStyle(data.registryKey, data.rawCSS);

  return createFieldDecorator<object>({
    bind(instance) {
      type ParamSig = ReturnType<typeof signal<string | number>>;
      const paramSignals: Record<string, ParamSig> = {};
      const hasParams = Object.keys(data.paramDefaults).length > 0;

      const stylesheetObj: Record<string, unknown> = hasParams
        ? { ...data.classMap }
        : (data.classMap as Record<string, unknown>);

      for (const [paramName, defaultVal] of Object.entries(data.paramDefaults)) {
        const sig = signal(defaultVal);
        paramSignals[paramName] = sig;
        Object.defineProperty(stylesheetObj, paramName, {
          get() { return sig(); },
          set(v: string | number) { sig.set(v); },
          enumerable: true,
          configurable: true,
        });
      }

      let stopFns: Array<() => void> = [];

      return {
        descriptor: { value: stylesheetObj, writable: false },

        onMount() {
          // Increment ref-count for this instance (base ref injected at decoration time).
          if (data.rawCSS) injectStyle(data.registryKey, data.rawCSS);

          if (hasParams) {
            const el = (instance as unknown as RootComponent)._anchor?.parentElement;
            if (el) {
              for (const [paramName, sig] of Object.entries(paramSignals)) {
                stopFns.push(effect(() => {
                  el.style.setProperty(`--${paramName}`, String(sig()));
                }));
              }
            }
          }
        },

        onUnmount() {
          if (data.rawCSS) releaseStyle(data.registryKey);
          for (const stop of stopFns) stop();
          stopFns = [];

          if (hasParams) {
            const el = (instance as unknown as RootComponent)._anchor?.parentElement;
            if (el) {
              for (const paramName of Object.keys(paramSignals)) {
                el.style.removeProperty(`--${paramName}`);
              }
            }
          }
        },
      };
    },
  });
}
