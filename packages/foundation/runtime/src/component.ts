import {
  getComponentStart,
  pauseTracking,
  resumeTracking,
  setCurrentOwner,
  setComponentAnchor,
  setComponentMounted,
} from "@praxisjs/core/internal";
import { initSlots } from "@praxisjs/decorators";
import type { ComponentConstructor } from "@praxisjs/shared/internal";

import { mountChildren } from "./children";
import { swapScope } from "./context";
import { hotEnabled, isHotClass, latestClass, setHotRemount, trackHotInstance, type HotInstance } from "./hmr";
import { recording, onHydrationReplace } from "./hydration-context";

import type { Scope } from "./scope";

type Instance = InstanceType<ComponentConstructor>;

// One object per component carries both lifecycle steps: mounting (drained in a shared microtask)
// and disposal (registered in the component's scope), instead of a closure for each.
class ComponentLife {
  declare disposed: boolean;
  declare readonly instance: Instance;
  declare readonly ref: ((instance: object | null) => void) | undefined;

  constructor(instance: Instance, ref: ((instance: object | null) => void) | undefined) {
    this.disposed = false;
    this.instance = instance;
    this.ref = ref;
  }

  mount(): void {
    if (this.disposed) return;
    setComponentMounted(this.instance, true);
    this.instance.onMount?.();
    this.ref?.(this.instance);
  }

  dispose(): void {
    this.disposed = true;
    this.instance.onUnmount?.();
    setComponentMounted(this.instance, false);
    this.ref?.(null);
  }
}

let pendingMounts: ComponentLife[] = [];

// One shared microtask drains every component mounted in the same synchronous pass, in mount
// order (children before parents). A throwing onMount is rethrown on its own microtask so it
// can't stop the others, as it couldn't when each component had a microtask of its own.
function drainMounts(): void {
  const queue = pendingMounts;
  pendingMounts = [];
  for (const life of queue) {
    try {
      life.mount();
    } catch (e) {
      queueMicrotask(() => { throw e; });
    }
  }
}

function scheduleMount(life: ComponentLife): void {
  if (pendingMounts.length === 0) queueMicrotask(drainMounts);
  pendingMounts.push(life);
}

export function mountComponent(
  ctor: ComponentConstructor,
  props: Record<string, unknown>,
  parentScope: Scope,
  // Hot remount only: the comments of the instance being replaced, kept as the new one's bounds.
  bounds: [Comment, Comment] | null = null,
): Node[] {
  const prevSub = pauseTracking();
  try {
    // A registered class (development, see hmr.ts) always mounts its newest version, and every
    // instance gets comment bounds, which stay in place when it is mounted again.
    let hot = false;
    if (hotEnabled) {
      ctor = latestClass(ctor);
      hot = isHotClass(ctor);
    }
    const scope = parentScope.fork();

    // Strip ref — managed by the runtime, not forwarded to the component. The component copies its
    // props itself, so they are only copied here when there is a ref to leave out.
    let instanceProps = props;
    let ref: ((instance: object | null) => void) | undefined;
    if ("ref" in props) {
      const { ref: refFn, ...rest } = props;
      instanceProps = rest;
      if (typeof refFn === "function") ref = refFn as (instance: object | null) => void;
    }

    const instance = new ctor(instanceProps);

    const rawChildren = instanceProps.children;
    if (rawChildren != null) {
      initSlots(instance, rawChildren);
    }

    instance.onBeforeMount?.();

    let dom: Node | Node[] | null = null;
    const prevScope = swapScope(scope);
    const prevOwner = setCurrentOwner(instance);
    try {
      dom = instance.render();
    } catch (e) {
      const fallback = instance.onError?.(e instanceof Error ? e : new Error(String(e)));
      if (fallback != null) dom = fallback;
    } finally {
      setCurrentOwner(prevOwner);
      swapScope(prevScope);
    }

    let nodes: Node[];
    if (hot) {
      const container = document.createDocumentFragment();
      const start = bounds === null ? container.appendChild(document.createComment(`[${ctor.name}]`)) : bounds[0];
      mountChildren(container, dom, scope);
      const end = bounds === null ? container.appendChild(document.createComment(`[/${ctor.name}]`)) : bounds[1];
      setComponentAnchor(instance, end);
      nodes = Array.from(container.childNodes);
      trackHotInstance({ ctor, props, parentScope, scope, start, end });
    } else if (dom instanceof Node && dom.nodeType !== 11) {
      // A single root node can't change, so it bounds the component by itself: no comments.
      nodes = [dom];
      setComponentAnchor(instance, dom);
      if (recording) onHydrationReplace(dom, (real) => { setComponentAnchor(instance, real); });
    } else {
      // Several nodes, or ones a reactive child may replace: comments mark where the component
      // starts and ends, unless its render already brought them (see getComponentStart).
      const bounded = getComponentStart(instance) !== undefined;
      const container = document.createDocumentFragment();
      if (!bounded) container.appendChild(document.createComment(`[${ctor.name}]`));
      mountChildren(container, dom, scope);
      if (!bounded) {
        const end = document.createComment(`[/${ctor.name}]`);
        container.appendChild(end);
        setComponentAnchor(instance, end);
      }
      nodes = Array.from(container.childNodes);
    }

    const life = new ComponentLife(instance, ref);
    scheduleMount(life);
    scope.add(life);
    return nodes;
  } finally {
    resumeTracking(prevSub);
  }
}

// Mounts `hot` again with `ctor` between the comments it already has: the reactive children and
// lists around it keep their references to those comments.
function remountHot(hot: HotInstance, ctor: ComponentConstructor): void {
  const { start, end } = hot;
  const parent = end.parentNode;
  // Detached (kept aside by its owner): there is no place to render into, so it is left as it is.
  if (parent === null || start.parentNode !== parent) return;
  hot.scope.dispose();
  for (let node = start.nextSibling; node !== null && node !== end; node = start.nextSibling) parent.removeChild(node);
  const nodes = mountComponent(ctor, hot.props, hot.parentScope, [start, end]);
  for (const node of nodes) parent.insertBefore(node, end);
}

setHotRemount(remountHot);
