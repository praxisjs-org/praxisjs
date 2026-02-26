import type { BaseComponent } from "@verbose/core";
import { type Children, flattenChildren, type VNode } from "@verbose/shared";

const slotsMap = new WeakMap<object, Map<string, Children[]>>();

export interface SlottedVNode extends VNode {
  slot?: string;
}

export function resolveSlots(
  children: Children | Children[] | undefined,
): Map<string, Children[]> {
  const slots = new Map<string, Children[]>();
  const defaultSlot: Children[] = [];
  slots.set("default", defaultSlot);

  if (!children) return slots;

  const arr: Children[] = flattenChildren(children);

  for (const child of arr as SlottedVNode[]) {
    const slotName = (child.props.slot as string | undefined) ?? child.slot;

    if (slotName) {
      if (!slots.has(slotName)) slots.set(slotName, []);
      (slots.get(slotName) as Children[]).push(child as Children);
    } else {
      defaultSlot.push(child as Children);
    }
  }

  return slots;
}

export function initSlots(
  instance: object,
  children: Children | Children[] | undefined,
): void {
  slotsMap.set(instance, resolveSlots(children));
}

export function getSlot(instance: object, name: string): Children[] {
  return slotsMap.get(instance)?.get(name) ?? [];
}

export function Slot(name?: string) {
  return function (target: object, propertyKey: string): void {
    const slotName =
      name ?? (propertyKey === "default" ? "default" : propertyKey);

    Object.defineProperty(target, propertyKey, {
      get(this: BaseComponent): Children[] {
        return getSlot(this, slotName);
      },

      set(_value: unknown): void {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[Slot] "${propertyKey}" is a slot and cannot be assigned directly. Slots are filled by the parent component.`,
          );
        }
      },

      enumerable: true,
      configurable: true,
    });
  };
}
