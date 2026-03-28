import { createFieldDecorator } from "../create-field-decorator";

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
  return createFieldDecorator({
    bind(instance, propName, _initialValue) {
      const slotName = name ?? (propName === "default" ? "default" : propName);
      return {
        descriptor: {
          get: () => getSlot(instance, slotName),
          set: (_value: unknown) => {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `[Slot] "${propName}" is a slot and cannot be assigned directly. Slots are filled by the parent component.`,
              );
            }
          },
        },
      };
    },
  });
}
