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

export function StateMachine<S extends string, E extends string>(
  definition: MachineDefinition<S, E>,
) {
  const machines = new WeakMap<object, Machine<S, E>>();

  return function <T extends object>(
    _value: undefined,
    context: ClassFieldDecoratorContext<T, Machine<S, E>>,
  ): void {
    context.addInitializer(function (this: object) {
      const name = context.name;
      Object.defineProperty(this, name, {
        get(): Machine<S, E> {
          const self = this as object;
          if (!machines.has(self)) machines.set(self, createMachine(definition));
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
