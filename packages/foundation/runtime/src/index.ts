import { mountChildren } from "./children";
import { runInScope } from "./context";
import { reconcile } from "./hydration";
import { runInRecording } from "./hydration-context";
import { Scope } from "./scope";

/** Written by `@praxisjs/ssg` onto the mount container in its prerendered HTML. */
const SSG_MARKER = "data-praxis-ssg";

function mountCreate(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  const rootScope = new Scope();
  container.innerHTML = "";

  runInScope(rootScope, () => {
    const result = factory();
    mountChildren(container, result, rootScope);
  });

  return () => {
    rootScope.dispose();
    container.innerHTML = "";
  };
}

function hydrate(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  const rootScope = new Scope();
  const scratch = document.createDocumentFragment();

  // Build normally — same code as mountCreate, just into a detached scratch
  // node instead of the real container, so it can be walked in document
  // order afterwards (its own construction order is bottom-up, not useful
  // for matching against the server-rendered DOM directly).
  runInRecording(() => {
    runInScope(rootScope, () => {
      const result = factory();
      mountChildren(scratch, result, rootScope);
    });
  });

  reconcile(container, Array.from(scratch.childNodes));

  return () => {
    rootScope.dispose();
    container.innerHTML = "";
  };
}

/**
 * Renders a component tree into a container element.
 *
 * The factory function is called once inside the root scope,
 * so `jsx()` can access the current scope via `getCurrentScope()`.
 *
 * If `container` carries the marker `@praxisjs/ssg` stamps onto prerendered
 * HTML, the tree is built normally into a detached scratch node and then
 * reconciled against the existing DOM (real elements are kept and have their
 * props/listeners replayed onto them; text/comments and any mismatched nodes
 * are recreated) instead of clearing the container and mounting fresh.
 *
 * @example
 * render(() => <App />, document.getElementById('app'));
 */
export function render(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  if (container.hasAttribute(SSG_MARKER)) {
    return hydrate(factory, container);
  }
  return mountCreate(factory, container);
}

export { Scope } from "./scope";
export { runInScope, getCurrentScope } from "./context";
export { mountElement } from "./element";
export { mountComponent } from "./component";
export { Portal, type PortalProps } from "./portal";
