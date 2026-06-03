import { createCSSBuilder, type CSSBuilder, type CSSProperties } from "../builder/css-builder.js";

/** Base class for static CSS style definitions. Extend this when using only `$`-prefixed CSS class fields. */
export class Stylesheet {
  /**
   * Creates a typed CSS builder for a `$`-prefixed field.
   * Chain `.hover()`, `.focus()`, `.media()`, `.on()` etc. for nested rules.
   *
   * @example
   * class BtnStyles extends Stylesheet {
   *   $base = this.css({ display: 'inline-flex', padding: '8px 16px' })
   *     .hover({ opacity: 0.9 })
   *     .disabled({ opacity: 0.4, pointerEvents: 'none' })
   *     .media('max-width: 640px', { width: '100%' })
   * }
   */
  protected css(props: CSSProperties): CSSBuilder {
    return createCSSBuilder(props);
  }
}

// Nominal brand — makes ReactiveStylesheet structurally distinct from Stylesheet
// so the @Styled conditional return type resolves correctly.
declare const _reactive: unique symbol;

/**
 * Base class for CSS style definitions that include reactive parameters.
 * Extend this (instead of {@link Stylesheet}) when using {@link Param} decorators.
 *
 * Using `@Styled` with a `ReactiveStylesheet` subclass is constrained at the
 * TypeScript level to `StatefulComponent` fields.
 */
export class ReactiveStylesheet extends Stylesheet {
  declare protected readonly [_reactive]: true;
}
