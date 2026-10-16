import {
  createMethodDecorator,
  addClaimableInitializer,
  assertFieldContext,
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
  return function <U extends object>(
    _value: undefined,
    context: ClassFieldDecoratorContext<U, Machine<S, E>>,
  ): void {
    assertFieldContext(context);
    const name = context.name;
    // Each instance's machine lives under this symbol, created on first read; the accessor itself
    // is shared by every instance.
    const slot = Symbol(`praxis.fsm.${String(name)}`);
    const descriptor: PropertyDescriptor = {
      get(this: Record<symbol, Machine<S, E> | undefined>): Machine<S, E> {
        let machine = this[slot];
        if (machine === undefined) {
          const def = typeof definition === "function" ? definition.call(this) : definition;
          machine = createMachine(def, this as unknown as T);
          this[slot] = machine;
        }
        return machine;
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      set(): void {},
      enumerable: true,
      configurable: true,
    };
    addClaimableInitializer(context, function () {
      // Reserving the slot up front keeps every instance of the class on the same shape.
      (this as Record<symbol, unknown>)[slot] = undefined;
      Object.defineProperty(this, name, descriptor);
    });
  };
}
