import {
  setComponentAnchor,
  setComponentMounted,
  untrack,
} from "@praxisjs/core/internal";
import { initSlots } from "@praxisjs/decorators";
import { isComponent, type ComponentConstructor  } from "@praxisjs/shared/internal";

import { mountChildren } from "./children";
import { runInScope } from "./context";

import type { Scope } from "./scope";

let pendingMounts: Array<() => void> = [];

// One shared microtask drains every component mounted in the same synchronous pass, in mount
// order (children before parents). A throwing onMount is rethrown on its own microtask so it
// can't stop the others, as it couldn't when each component had a microtask of its own.
function scheduleMount(run: () => void): void {
  if (pendingMounts.length === 0) {
    queueMicrotask(() => {
      const queue = pendingMounts;
      pendingMounts = [];
      for (const job of queue) {
        try {
          job();
        } catch (e) {
          queueMicrotask(() => { throw e; });
        }
      }
    });
  }
  pendingMounts.push(run);
}

export function mountComponent(
  ctor: ComponentConstructor,
  props: Record<string, unknown>,
  parentScope: Scope,
): Node[] {
  return untrack(() => {
    const scope = parentScope.fork();

    // Strip ref — managed by the runtime, not forwarded to the component.
    const { ref: refFn, ...instanceProps } = props;
    const ref = typeof refFn === "function"
      ? refFn as (instance: object | null) => void
      : undefined;

    const instance = new ctor({ ...instanceProps });

    const rawChildren = instanceProps.children;
    if (rawChildren != null) {
      initSlots(instance, rawChildren);
    }

    const start = document.createComment(`[${ctor.name}]`);
    const end = document.createComment(`[/${ctor.name}]`);
    let disposed = false;

    setComponentAnchor(instance, end);

    instance.onBeforeMount?.();

    const container = document.createDocumentFragment();
    container.appendChild(start);

    let dom: Node | Node[] | null = null;
    runInScope(scope, () => {
      try {
        dom = instance.render();
      } catch (e) {
        const fallback = instance.onError?.(e instanceof Error ? e : new Error(String(e)));
        if (fallback != null) dom = fallback;
      }
    });

    mountChildren(container, dom, scope);
    container.appendChild(end);

    scheduleMount(() => {
      if (disposed) return;
      setComponentMounted(instance, true);
      instance.onMount?.();
      ref?.(instance);
    });

    scope.add(() => {
      disposed = true;
      instance.onUnmount?.();
      setComponentMounted(instance, false);
      ref?.(null);
    });

    // Return the nodes from the fragment as an array so the caller can append them
    return Array.from(container.childNodes);
  });
}

export { isComponent };
