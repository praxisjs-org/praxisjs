import type { RootComponent } from "@praxisjs/core/internal";
import {
  createMethodDecorator,
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
} from "@praxisjs/decorators";

import { createMachine, type Machine, type MachineDefinition } from "./machine";

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

class StateMachineBehavior<
  S extends string,
  E extends string,
> extends ClassBehavior {
  constructor(
    private readonly definition: MachineDefinition<S, E>,
    private readonly propertyKey: string,
  ) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown): void {
    const machines = new WeakMap<object, Machine<S, E>>();
    const { definition, propertyKey } = this;
    Object.defineProperty(
      (Enhanced as { prototype: object }).prototype,
      propertyKey,
      {
        get(this: object): Machine<S, E> {
          if (!machines.has(this))
            machines.set(this, createMachine(definition));
          return machines.get(this) as Machine<S, E>;
        },
        enumerable: true,
        configurable: true,
      },
    );
  }
}

export function StateMachine<S extends string, E extends string>(
  definition: MachineDefinition<S, E>,
  propertyKey = "machine",
) {
  const decorator = createClassDecorator(
    new StateMachineBehavior(definition, propertyKey),
  );
  // FSM decorators work on any class, not just RootComponent

  return decorator as unknown as (
    value: abstract new (...args: unknown[]) => unknown,
    context: ClassDecoratorContext,
  ) => abstract new (...args: unknown[]) => unknown;
}
