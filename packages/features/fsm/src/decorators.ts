import { createMachine, type Machine, type MachineDefinition } from "./machine";

export function Transition(machineProp: string, event: string) {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    return {
      configurable: true,
      enumerable: false,
      get(this: Record<string, unknown>) {
        const bound = (...args: unknown[]) => {
          const machine = this[machineProp] as
            | Machine<string, string>
            | undefined;
          if (!machine) {
            console.warn(
              `[Transition] "${machineProp}" is not a state machine.`,
            );
            return;
          }
          if (machine.send(event)) return original.apply(this, args);
        };
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}

export function StateMachine<S extends string, E extends string>(
  definition: MachineDefinition<S, E>,
  propertyKey = "machine",
) {
  return function (target: { prototype: object }): void {
    const machines = new WeakMap<object, Machine<S, E>>();
    Object.defineProperty(target.prototype, propertyKey, {
      get(this: object): Machine<S, E> {
        if (!machines.has(this)) machines.set(this, createMachine(definition));
        return machines.get(this) as Machine<S, E>;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
