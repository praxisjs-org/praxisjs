import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import {
  createThemeInstance,
  theme,
  ThemeInstance,
  type ThemedConfig,
} from "./theme-instance.js";

// ─── @Themed ─────────────────────────────────────────────────────────────────

class ThemedBehavior extends ClassBehavior {
  constructor(
    private readonly DefaultTheme: new () => unknown,
    private readonly config: Partial<ThemedConfig>,
  ) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    createThemeInstance(this.DefaultTheme, this.config);
    return {};
  }

  initialize(
    _Enhanced: new (...args: unknown[]) => unknown,
    _original: new (...args: unknown[]) => unknown,
  ): void {
    createThemeInstance(this.DefaultTheme, this.config);
  }
}

/**
 * Class decorator that installs the design token system on the root component.
 *
 * - `skeleton` — `TokenSheet` subclass that declares token names. Its static
 *   properties (`AppTokens.colorPrimary`) return CSS var references.
 * - `DefaultTheme` — concrete class (extends skeleton) that provides the
 *   initial CSS custom property values injected on `:root`.
 * - `config.persist`  — save the active theme to `localStorage` and restore it
 *   on the next page load.
 * - `config.syncTabs` — broadcast theme changes to other browser tabs via
 *   `BroadcastChannel`.
 *
 * Must appear above `@Component()` in the decorator stack.
 *
 * @example
 * @Themed(AppTokens, LightTheme, { persist: true, syncTabs: true })
 * @Component()
 * class App extends StatefulComponent { ... }
 */
export function Themed(
  _skeleton: abstract new (...args: unknown[]) => unknown,
  DefaultTheme: new () => unknown,
  config?: Partial<ThemedConfig>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return createClassDecorator(
    new ThemedBehavior(DefaultTheme, config ?? {}),
  ) as unknown as (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cls: new (...args: any[]) => any,
    ctx: ClassDecoratorContext,
  ) => void;
}

// ─── @Theme ───────────────────────────────────────────────────────────────────

/**
 * Field decorator that injects the active {@link ThemeInstance} into a
 * component field. Use `.switch(ThemeClass)` to change the theme.
 *
 * Equivalent to the programmatic {@link theme} function — choose whichever
 * fits the component's style.
 *
 * @example
 * @Component()
 * class Header extends StatefulComponent {
 *   @Theme() theme!: ThemeInstance
 *
 *   render() {
 *     return <button onClick={() => this.theme.switch(DarkTheme)}>Dark</button>
 *   }
 * }
 */
export function Theme() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(): ThemeInstance { return theme(); },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

export { theme, ThemeInstance, type ThemedConfig };
