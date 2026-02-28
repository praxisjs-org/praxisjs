import type { BaseComponent } from "@verbose/core";
import {
  type Children,
  type ChildrenInternal,
  flattenChildren,
  type VNode,
} from "@verbose/shared";

const slotsMap = new WeakMap<object, Map<string, ChildrenInternal[]>>();

export interface SlottedVNode extends VNode {
  slot?: string;
}

export function resolveSlots(
  children: ChildrenInternal | ChildrenInternal[] | undefined,
): Map<string, ChildrenInternal[]> {
  const slots = new Map<string, ChildrenInternal[]>();
  const defaultSlot: ChildrenInternal[] = [];
  slots.set("default", defaultSlot);

  if (!children) return slots;

  const arr: ChildrenInternal[] = flattenChildren(children);

  for (const child of arr as SlottedVNode[]) {
    const slotName = (child.props.slot as string | undefined) ?? child.slot;

    if (slotName) {
      if (!slots.has(slotName)) slots.set(slotName, []);
      (slots.get(slotName) as ChildrenInternal[]).push(
        child as ChildrenInternal,
      );
    } else {
      defaultSlot.push(child as ChildrenInternal);
    }
  }

  return slots;
}

export function initSlots(
  instance: object,
  children: Children | undefined,
): void {
  slotsMap.set(instance, resolveSlots(children));
}

export function getSlot(instance: object, name: string): ChildrenInternal[] {
  return slotsMap.get(instance)?.get(name) ?? [];
}

export function Slot(name?: string) {
  return function (target: object, propertyKey: string): void {
    const slotName =
      name ?? (propertyKey === "default" ? "default" : propertyKey);

    Object.defineProperty(target, propertyKey, {
      get(this: BaseComponent): ChildrenInternal[] {
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
