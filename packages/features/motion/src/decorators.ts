import { addClaimableInitializer, assertFieldContext } from "@praxisjs/decorators";

import { spring, type SpringOptions } from "./spring";
import { tween, type TweenOptions } from "./tween";

interface Animation {
  value(): number;
  target: { set(value: number): void };
  stop(): void;
}

type Host = Record<PropertyKey, unknown> & { onUnmount?: () => void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnimatedFieldDecorator = (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;

const ANIMATIONS = Symbol("praxis.motion.animations");
const PREV_UNMOUNT = Symbol("praxis.motion.unmount");

// Installed once per instance, whatever the number of animated fields: an animation still running
// when the component goes away would keep its frame loop alive.
function stopAnimationsOnUnmount(this: Host): void {
  (this[PREV_UNMOUNT] as (() => void) | undefined)?.call(this);
  for (const animation of this[ANIMATIONS] as Animation[]) animation.stop();
}

function register(host: Host, animation: Animation): void {
  const list = host[ANIMATIONS] as Animation[] | undefined;
  if (list) {
    list.push(animation);
    return;
  }
  host[ANIMATIONS] = [animation];
  host[PREV_UNMOUNT] = host.onUnmount;
  host.onUnmount = stopAnimationsOnUnmount;
}

function animatedField(create: (initial: number) => Animation): AnimatedFieldDecorator {
  return function (_value, context) {
    assertFieldContext(context);
    const name = context.name;
    // Each instance's animation lives under this symbol; the accessor is shared by every instance.
    const slot = Symbol(`praxis.motion.${String(name)}`);
    const descriptor: PropertyDescriptor = {
      get(this: Host): number {
        return (this[slot] as Animation | undefined)?.value() ?? 0;
      },
      set(this: Host, value: number): void {
        (this[slot] as Animation | undefined)?.target.set(value);
      },
      enumerable: true,
      configurable: true,
    };
    addClaimableInitializer(context, function (initial) {
      const host = this as Host;
      const animation = create(typeof initial === "number" ? initial : 0);
      host[slot] = animation;
      Object.defineProperty(host, name, descriptor);
      register(host, animation);
    });
  };
}

export function Tween(options: TweenOptions = {}): AnimatedFieldDecorator {
  return animatedField((initial) => tween(initial, initial, options));
}

export function Spring(options: SpringOptions = {}): AnimatedFieldDecorator {
  return animatedField((initial) => spring(initial, options));
}
