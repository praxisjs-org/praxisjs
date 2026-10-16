import { mountChildren } from "./children";
import { runInScope } from "./context";
import { addEventRoot } from "./dom/events";
import { reconcile } from "./hydration";
import { runInRecording } from "./hydration-context";
import { Scope } from "./scope";
import { syncTemplateDocument } from "./template";

/** Written by `@praxisjs/ssg` onto the mount container in its prerendered HTML. */
const SSG_MARKER = "data-praxis-ssg";

function mountCreate(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  syncTemplateDocument();
  const rootScope = new Scope();
  container.innerHTML = "";
  const removeEventRoot = addEventRoot(container);

  runInScope(rootScope, () => {
    const result = factory();
    mountChildren(container, result, rootScope);
  });

  return () => {
    rootScope.dispose();
    removeEventRoot();
    container.innerHTML = "";
  };
}

function hydrate(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  syncTemplateDocument();
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
  const removeEventRoot = addEventRoot(container);

  return () => {
    rootScope.dispose();
    removeEventRoot();
    container.innerHTML = "";
  };
}

// Reached only through enableHydration(), so an app that never calls it leaves the reconciliation
// and every recording branch of the render paths out of its bundle.
let hydrateRoot: typeof hydrate | null = null;

/**
 * Lets render() hydrate the HTML `@praxisjs/ssg` prerendered. `ssgPlugin()` calls it at the start of
 * the client bundle, so apps it builds need nothing more; a page prerendered another way calls it
 * once before render(). Without it, a container carrying the hydration marker is cleared and
 * mounted fresh.
 */
export function enableHydration(): void {
  hydrateRoot = hydrate;
}

/**
 * Renders a component tree into a container element.
 *
 * The factory function is called once inside the root scope,
 * so `jsx()` can access the current scope via `getCurrentScope()`.
 *
 * Once hydration is enabled (see `enableHydration()`), a `container` carrying the marker
 * `@praxisjs/ssg` stamps onto prerendered HTML has its tree built normally into a detached
 * scratch node and then reconciled against the existing DOM (real elements are kept and have their
 * props/listeners replayed onto them; text/comments and any mismatched nodes are recreated)
 * instead of being cleared and mounted fresh.
 *
 * @example
 * render(() => <App />, document.getElementById('app'));
 */
export function render(
  factory: () => Node | Node[] | null,
  container: HTMLElement,
): () => void {
  if (hydrateRoot !== null && container.hasAttribute(SSG_MARKER)) {
    return hydrateRoot(factory, container);
  }
  return mountCreate(factory, container);
}

export { Scope } from "./scope";
export { runInScope, getCurrentScope } from "./context";
export { mountElement } from "./element";
export { mountChildren } from "./children";
export {
  template as _$template,
  html as _$html,
  element as _$element,
  prop as _$prop,
  reactive as _$reactive,
  insert as _$insert,
  reactiveOnly as _$reactiveOnly,
  insertOnly as _$insertOnly,
  on as _$on,
  event as _$event,
  onEvent as _$onEvent,
  className as _$className,
  scope as _$scope,
} from "./template";
export { mountComponent } from "./component";
export { registerHot as _$hmrRegister, acceptsHotUpdate as _$hmrAccepts } from "./hmr";
export { Portal, type PortalProps } from "./portal";
export {
  For,
  Index,
  type ForProps,
  type IndexProps,
  type ListSource,
  type ListTransition,
} from "./list";
