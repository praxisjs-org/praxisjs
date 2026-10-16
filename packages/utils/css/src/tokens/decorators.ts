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
  isActiveTheme,
  theme,
  ThemeInstance,
  type ThemedConfig,
} from "./theme-instance.js";

// ─── @Themed ─────────────────────────────────────────────────────────────────

const NO_ENHANCEMENT: ClassEnhancement = Object.freeze({});

class ThemedBehavior extends ClassBehavior {
  #instance: ThemeInstance | null = null;

  constructor(
    private readonly DefaultTheme: new () => unknown,
    private readonly config: Partial<ThemedConfig>,
  ) {
    super();
  }

  // Makes this class's theme the active one again, e.g. after another @Themed class replaced it
  // or it was destroyed. While it is still active it is kept, so a theme the user switched to
  // survives the component being instantiated again.
  create(_instance: RootComponent): ClassEnhancement {
    if (!isActiveTheme(this.#instance)) this.#activate();
    return NO_ENHANCEMENT;
  }

  initialize(
    _Enhanced: new (...args: unknown[]) => unknown,
    _original: new (...args: unknown[]) => unknown,
  ): void {
    this.#activate();
  }

  #activate(): void {
    this.#instance = createThemeInstance(this.DefaultTheme, this.config);
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
