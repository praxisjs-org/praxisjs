import { tween, type TweenOptions, type Tween } from "./tween";

export function Animate(options: TweenOptions = {}) {
  return function (_value: undefined, context: ClassFieldDecoratorContext): void {
    const tweens = new WeakMap<object, Tween>();

    context.addInitializer(function (this: unknown) {
      Object.defineProperty(this, context.name, {
        get(this: object): number {
          return tweens.get(this)?.value() ?? 0;
        },
        set(this: object, value: number): void {
          if (!tweens.has(this)) tweens.set(this, tween(value, value, options));
          tweens.get(this)?.target.set(value);
        },
        enumerable: true,
        configurable: true,
      });
    });
  };
}
