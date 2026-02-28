import {
  effect,
  createFunctionalContext,
  setFunctionalContext,
} from "@verbose/core";
import { initSlots } from "@verbose/decorators";
import type {
  VNode,
  ChildrenInternal,
  ComponentInstance,
} from "@verbose/shared";

const EVENT_MAP: Record<string, string> = {
  onClick: "click",
  onDblClick: "dblclick",
  onChange: "change",
  onInput: "input",
  onSubmit: "submit",
  onReset: "reset",
  onKeyDown: "keydown",
  onKeyUp: "keyup",
  onKeyPress: "keypress",
  onFocus: "focus",
  onBlur: "blur",
  onMouseDown: "mousedown",
  onMouseUp: "mouseup",
  onMouseEnter: "mouseenter",
  onMouseLeave: "mouseleave",
  onMouseMove: "mousemove",
  onContextMenu: "contextmenu",
  onScroll: "scroll",
  onWheel: "wheel",
  onDragStart: "dragstart",
  onDragEnd: "dragend",
  onDragOver: "dragover",
  onDrop: "drop",
  onTouchStart: "touchstart",
  onTouchEnd: "touchend",
  onTouchMove: "touchmove",
  onAnimationEnd: "animationend",
  onTransitionEnd: "transitionend",
};

interface MountedNode {
  el: Node;
  vnode?: VNode;
  instance?: ComponentInstance;
  cleanups: Array<() => void>;
  children: MountedNode[];
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "text",
  "g",
  "defs",
  "use",
  "symbol",
  "marker",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feGaussianBlur",
  "tspan",
  "textPath",
  "foreignObject",
]);

function applyProps(
  el: Element,
  props: Record<string, unknown>,
  cleanups: Array<() => void>,
) {
  for (const [key, value] of Object.entries(props)) {
    if (key === "key" || key === "children") continue;

    if (key in EVENT_MAP) {
      const eventName = EVENT_MAP[key];
      const eventListener = value as EventListener;
      el.addEventListener(eventName, eventListener);
      cleanups.push(() => {
        el.removeEventListener(eventName, eventListener);
      });
      continue;
    }

    if (key === "ref" && typeof value === "function") {
      (value as (el: Element) => void)(el);
      continue;
    }

    if (key === "className" || key === "class") {
      if (typeof value === "function") {
        cleanups.push(
          effect(() => {
            el.setAttribute("class", String((value as () => unknown)()));
          }),
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        el.setAttribute("class", String(value ?? ""));
      }
      continue;
    }

    if (key === "style") {
      if (typeof value === "function") {
        cleanups.push(
          effect(() => {
            const styleValue = (value as () => unknown)();
            if (typeof styleValue === "object" && styleValue !== null) {
              el.removeAttribute("style");
              Object.assign((el as HTMLElement).style, styleValue);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-base-to-string
              el.setAttribute("style", String(styleValue ?? ""));
            }
          }),
        );
      } else if (typeof value === "object" && value !== null) {
        el.removeAttribute("style");
        Object.assign((el as HTMLElement).style, value);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        el.setAttribute("style", String(value ?? ""));
      }
      continue;
    }

    if (["checked", "value", "disabled", "selected"].includes(key)) {
      if (typeof value === "function") {
        cleanups.push(
          effect(() => {
            (el as unknown as Record<string, unknown>)[key] = (
              value as () => unknown
            )();
          }),
        );
      } else {
        (el as unknown as Record<string, unknown>)[key] = value;
      }
      continue;
    }

    if (typeof value === "function") {
      const attrKey = key === "htmlFor" ? "for" : key;
      cleanups.push(
        effect(() => {
          const attrValue = (value as () => unknown)();
          if (
            attrValue === false ||
            attrValue === null ||
            attrValue === undefined
          ) {
            el.removeAttribute(attrKey);
          } else if (attrValue === true) {
            el.setAttribute(attrKey, "");
          } else {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            el.setAttribute(attrKey, String(attrValue));
          }
        }),
      );
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        el.setAttribute(key, "");
      } else {
        el.removeAttribute(key);
      }
      continue;
    }

    if (value !== null && value !== undefined) {
      const attrKey = key === "htmlFor" ? "for" : key;
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      el.setAttribute(attrKey, String(value));
    }
  }
}

function renderChildren(
  children: ChildrenInternal,
  cleanups: Array<() => void>,
): Node[] {
  if (children === null || children === undefined || children === false) {
    return [document.createComment("empty")];
  }

  if (typeof children === "string" || typeof children === "number") {
    return [document.createTextNode(String(children))];
  }

  if (Array.isArray(children)) {
    return children.flatMap((child) => renderChildren(child, cleanups));
  }

  if (typeof children === "function") {
    const fn = children as () => ChildrenInternal;

    const anchor = document.createComment("reactive");
    let currentNodes: Node[] = [];
    let initialized = false;

    cleanups.push(
      effect(() => {
        const result = fn();

        if (!initialized) {
          currentNodes = renderChildren(result, cleanups);
          initialized = true;
          return;
        }

        const parent = anchor.parentNode;
        if (!parent) return;

        for (const node of currentNodes) {
          if (node.parentNode === parent) {
            parent.removeChild(node);
          }
        }

        const newNodes = renderChildren(result, cleanups);
        newNodes.forEach((node) => parent.insertBefore(node, anchor));
        currentNodes = newNodes;
      }),
    );

    return [...currentNodes, anchor];
  }

  if (typeof children === "object" && "type" in children) {
    const mounted = mountVNode(
      children,
      document.createComment("object"),
      cleanups,
    );
    return [mounted.el];
  }

  return [document.createTextNode(String(children))];
}

function mountVNode(
  vnode: VNode,
  _parent: Node,
  parentCleanups: Array<() => void>,
): MountedNode {
  const cleanups: Array<() => void> = [];
  const { type, props, children } = vnode;

  if (typeof type === "function" && "isComponent" in type) {
    const instance = new type({
      ...props,
    });
    if (children.length > 0) {
      initSlots(instance, children);
    }
    instance.onBeforeMount?.();
    let renderedVNode: VNode | null = null;

    try {
      renderedVNode = instance.render();
    } catch (e) {
      console.error("Error rendering component:", e);
      const error = e instanceof Error ? e : new Error(String(e));
      instance.onError?.(error);
    }

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-component", type.name || "AnonymousComponent");

    if (renderedVNode) {
      const childNode = mountVNode(renderedVNode, wrapper, cleanups);
      wrapper.appendChild(childNode.el);
    }

    const isMemoized = instance._isMemorized;

    cleanups.push(
      effect(() => {
        if (instance._mounted) return;

        if (!isMemoized) {
          const resolvedProps: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(props)) {
            if (key === "children" || key === "key") continue;
            if (typeof value === "function") {
              resolvedProps[key] = (value as () => unknown)();
            } else {
              resolvedProps[key] = value;
            }
          }

          if (!instance._stateDirty) {
            const arePropsEqual = instance._arePropsEqual;
            const lastProps = instance._lastResolvedProps;

            if (
              lastProps !== undefined &&
              arePropsEqual?.(lastProps, resolvedProps)
            ) {
              return;
            }
          }

          instance._lastResolvedProps = resolvedProps;
        }

        instance._stateDirty = false;
        instance._setProps({ ...props });

        let rerenderedVNode: VNode | null = null;
        try {
          rerenderedVNode = instance.render();
        } catch (e) {
          console.error("Error rendering component:", e);
          const error = e instanceof Error ? e : new Error(String(e));
          instance.onError?.(error);
        }

        wrapper.innerHTML = "";

        if (rerenderedVNode) {
          const childNode = mountVNode(rerenderedVNode, wrapper, cleanups);
          wrapper.appendChild(childNode.el);
        }
      }),
    );

    parentCleanups.push(() => {
      instance.onUnmount?.();
      instance._mounted = false;
      cleanups.forEach((fn) => {
        fn();
      });
    });

    queueMicrotask(() => {
      instance.onMount?.();
      instance._mounted = true;
    });

    return {
      el: wrapper,
      vnode,
      instance,
      cleanups,
      children: [],
    };
  }

  if (typeof type === "function") {
    const resolvedType = type as (
      props: Record<string, unknown> & { children?: ChildrenInternal[] },
    ) => VNode | null;

    const ctx = createFunctionalContext();
    setFunctionalContext(ctx);

    let resolvedVNode: VNode | null = null;
    try {
      resolvedVNode = resolvedType({ ...props, children });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      ctx.onError.forEach((fn) => {
        fn(error);
      });
    }

    setFunctionalContext(null);

    ctx.onBeforeMount.forEach((fn) => {
      fn();
    });

    if (!resolvedVNode) {
      const commentNode = document.createComment(
        `<${type.name || "AnonymousComponent"} />`,
      );
      queueMicrotask(() => {
        ctx.onMount.forEach((fn) => {
          fn();
        });
      });
      cleanups.push(() => {
        ctx.onUnmount.forEach((fn) => {
          fn();
        });
      });
      parentCleanups.push(() => {
        cleanups.forEach((fn) => {
          fn();
        });
      });
      return {
        el: commentNode,
        cleanups,
        children: [],
      };
    }

    const childNode = mountVNode(resolvedVNode, _parent, cleanups);
    queueMicrotask(() => {
      ctx.onMount.forEach((fn) => {
        fn();
      });
    });
    cleanups.push(() => {
      ctx.onUnmount.forEach((fn) => {
        fn();
      });
    });
    parentCleanups.push(() => {
      cleanups.forEach((fn) => {
        fn();
      });
    });
    return {
      el: childNode.el,
      vnode,
      cleanups,
      children: [],
    };
  }

  const el = SVG_TAGS.has(type)
    ? document.createElementNS(SVG_NAMESPACE, type)
    : document.createElement(type);
  applyProps(el, props, cleanups);

  for (const child of children) {
    const childNodes = renderChildren(child, cleanups);
    childNodes.forEach((node) => el.appendChild(node));
  }

  parentCleanups.push(() => {
    cleanups.forEach((fn) => {
      fn();
    });
  });

  return {
    el,
    vnode,
    cleanups,
    children: [],
  };
}

export function render(vnode: VNode, container: HTMLElement) {
  const cleanups: Array<() => void> = [];
  container.innerHTML = "";
  const mounted = mountVNode(vnode, container, cleanups);
  container.appendChild(mounted.el);

  return () => {
    cleanups.forEach((fn) => {
      fn();
    });
    container.innerHTML = "";
  };
}
