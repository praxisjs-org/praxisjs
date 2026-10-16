import { type FieldDecorator, type FieldHost, sharedField } from "../field";

// On the instance rather than in a WeakMap: every slot field read goes through here.
const SLOTS: unique symbol = Symbol("praxis.slots");

interface SlotHost {
  [SLOTS]?: Map<string, unknown[]>;
}

function resolveSlots(children: unknown): Map<string, unknown[]> {
  const slots = new Map<string, unknown[]>();
  const defaultSlot: unknown[] = [];
  slots.set("default", defaultSlot);

  if (children == null) return slots;

  const arr = Array.isArray(children)
    ? (children as unknown[]).flat(Infinity)
    : [children];

  for (const child of arr) {
    if (child instanceof Element) {
      const slotName = child.getAttribute("slot");
      if (slotName) {
        child.removeAttribute("slot");
        let named = slots.get(slotName);
        if (!named) slots.set(slotName, (named = []));
        named.push(child);
        continue;
      }
    }
    if (child != null) defaultSlot.push(child);
  }

  return slots;
}

export function initSlots(instance: object, children: unknown): void {
  (instance as SlotHost)[SLOTS] = resolveSlots(children);
}

export function getSlot(instance: object, name: string): unknown[] {
  return (instance as SlotHost)[SLOTS]?.get(name) ?? [];
}

export function Slot(name?: string): FieldDecorator {
  return sharedField((propName) => {
    const slotName = name ?? propName;
    return {
      descriptor: {
        get(this: FieldHost) {
          return getSlot(this, slotName);
        },
        set(_value: unknown) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[Slot] "${propName}" is a slot and cannot be assigned directly. Slots are filled by the parent component.`,
            );
          }
        },
      },
    };
  });
}
