import { untrack } from "@praxisjs/core/internal";
import { initSlots } from "@praxisjs/decorators";
import { isComponent, type ComponentConstructor  } from "@praxisjs/shared/internal";

import { mountChildren } from "./children";
import { runInScope } from "./context";

import type { Scope } from "./scope";

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

    // Expose anchor so decorators like @Virtual can find the parent element
    instance._anchor = end;

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

    queueMicrotask(() => {
      if (disposed) return;
      instance._mounted = true;
      instance.onMount?.();
      ref?.(instance);
    });

    scope.add(() => {
      disposed = true;
      instance.onUnmount?.();
      instance._mounted = false;
      ref?.(null);
    });

    // Return the nodes from the fragment as an array so the caller can append them
    return Array.from(container.childNodes);
  });
}

export { isComponent };
