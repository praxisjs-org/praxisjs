import { createMachine, type Machine, type MachineDefinition } from "./machine";

export function Transition(machineProp: string, event: string) {
  return function (
    value: (...args: unknown[]) => unknown,
    _context: ClassMethodDecoratorContext,
  ): (...args: unknown[]) => unknown {
    return function (this: Record<string, unknown>, ...args: unknown[]) {
      const machine = this[machineProp] as Machine<string, string> | undefined;
      if (!machine) {
        console.warn(`[Transition] "${machineProp}" is not a state machine.`);
        return;
      }
      if (machine.send(event)) return value.apply(this, args);
    };
  };
}

export function StateMachine<S extends string, E extends string>(
  definition: MachineDefinition<S, E>,
  propertyKey = "machine",
) {
  return function (value: abstract new (...args: unknown[]) => unknown, _context: ClassDecoratorContext): void {
    const machines = new WeakMap<object, Machine<S, E>>();
    Object.defineProperty((value as { prototype: object }).prototype, propertyKey, {
      get(this: object): Machine<S, E> {
        if (!machines.has(this)) machines.set(this, createMachine(definition));
        return machines.get(this) as Machine<S, E>;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
