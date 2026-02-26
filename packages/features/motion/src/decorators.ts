import { tween, type TweenOptions, type Tween } from "./tween";

export function Animate(options: TweenOptions = {}) {
  return function (target: object, propertyKey: string): void {
    const tweens = new WeakMap<object, Tween>();
    const original = Object.getOwnPropertyDescriptor(target, propertyKey);

    Object.defineProperty(target, propertyKey, {
      get(this: object): number {
        return tweens.get(this)?.value() ?? 0;
      },
      set(this: object, value: number): void {
        if (!tweens.has(this)) tweens.set(this, tween(value, value, options));
        tweens.get(this)?.target.set(value);
        original?.set?.call(this, value);
      },
      enumerable: true,
      configurable: true,
    });
  };
}
