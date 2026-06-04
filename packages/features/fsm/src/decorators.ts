import {
  createMethodDecorator,
} from "@praxisjs/decorators";

import { createMachine, type Machine, type MachineDefinition  } from "./machine";

export function Transition(machineProp: string, event: string) {
  const decorator = createMethodDecorator({
    wrap(original, instance) {
      return (...args: unknown[]) => {
        const machine = (instance as Record<string, unknown>)[machineProp] as
          | Machine<string, string>
          | undefined;
        if (!machine) {
          console.warn(`[Transition] "${machineProp}" is not a state machine.`);
          return;
        }
        if (machine.send(event))
          return original.apply(instance, args) as unknown;
      };
    },
  });
  // FSM decorators work on any class, not just StatefulComponent
  return decorator as unknown as (
    value: (...args: unknown[]) => unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: ClassMethodDecoratorContext<any>,
  ) => void;
}

export function StateMachine<
  S extends string,
  E extends string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends object = any,
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definition: MachineDefinition<S, E, T> | ((this: any) => MachineDefinition<S, E, T>),
) {
  const machines = new WeakMap<object, Machine<S, E>>();

  return function <U extends object>(
    _value: undefined,
    context: ClassFieldDecoratorContext<U, Machine<S, E>>,
  ): void {
    context.addInitializer(function (this: object) {
      const name = context.name;
      Object.defineProperty(this, name, {
        get(): Machine<S, E> {
          const self = this as T;
          if (!machines.has(self)) {
            const def =
              typeof definition === "function"
                ? definition.call(self)
                : definition;
            machines.set(self, createMachine(def, self));
          }
          return machines.get(self) as Machine<S, E>;
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set(): void {},
        enumerable: true,
        configurable: true,
      });
    });
  };
}
