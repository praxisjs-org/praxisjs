import { mountChildren } from "./children";
import { runInScope } from "./context";
import { Scope } from "./scope";

/**
 * Renders a component tree into a container element.
 *
 * The factory function is called once inside the root scope,
 * so `jsx()` can access the current scope via `getCurrentScope()`.
 *
 * @example
 * render(() => <App />, document.getElementById('app'));
 */
export function render(
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

export { Scope } from "./scope";
export { runInScope, getCurrentScope } from "./context";
export { mountElement } from "./element";
export { mountComponent } from "./component";
export { Portal, type PortalProps } from "./portal";
