import { createFieldDecorator, type FieldBinding } from "@praxisjs/decorators";

import { spring, type SpringOptions } from "./spring";
import { tween, type TweenOptions, type Tween } from "./tween";

type SpringInstance = ReturnType<typeof spring>;

export function Tween(options: TweenOptions = {}) {
  const tweens = new WeakMap<object, Tween>();

  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object): number {
            return tweens.get(this)?.value() ?? 0;
          },
          set(this: object, value: number): void {
            if (!tweens.has(this)) tweens.set(this, tween(value, value, options));
            tweens.get(this)?.target.set(value);
          },
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

export function Spring(options: SpringOptions = {}) {
  const springs = new WeakMap<object, SpringInstance>();

  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object): number {
            return springs.get(this)?.value() ?? 0;
          },
          set(this: object, value: number): void {
            if (!springs.has(this)) springs.set(this, spring(value, options));
            springs.get(this)?.target.set(value);
          },
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}
