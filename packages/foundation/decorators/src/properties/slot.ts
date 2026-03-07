import type { StatefulComponent } from "@praxisjs/core";

const slotsMap = new WeakMap<object, Map<string, unknown[]>>();

function resolveSlots(children: unknown): Map<string, unknown[]> {
  const slots = new Map<string, unknown[]>();
  const defaultSlot: unknown[] = [];
  slots.set("default", defaultSlot);

  if (children == null) return slots;

  const arr = Array.isArray(children)
    ? (children as unknown[]).flat(Infinity)
    : [children];

  for (const child of arr) {
    // Named slots via `slot` attribute on DOM elements
    if (child instanceof Element) {
      const slotName = child.getAttribute("slot");
      if (slotName) {
        child.removeAttribute("slot");
        if (!slots.has(slotName)) slots.set(slotName, []);
        (slots.get(slotName) as unknown[]).push(child);
        continue;
      }
    }
    if (child != null) defaultSlot.push(child);
  }

  return slots;
}

export function initSlots(instance: object, children: unknown): void {
  slotsMap.set(instance, resolveSlots(children));
}

export function getSlot(instance: object, name: string): unknown[] {
  return slotsMap.get(instance)?.get(name) ?? [];
}

export function Slot(name?: string) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent;
      const propKey = context.name as string;
      const slotName = name ?? (propKey === "default" ? "default" : propKey);

      Reflect.deleteProperty(instance, propKey);

      Object.defineProperty(instance, propKey, {
        get(this: StatefulComponent): unknown[] {
          return getSlot(this, slotName);
        },

        set(_value: unknown): void {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[Slot] "${propKey}" is a slot and cannot be assigned directly. Slots are filled by the parent component.`,
            );
          }
        },

        enumerable: true,
        configurable: true,
      });
    });
  };
}
