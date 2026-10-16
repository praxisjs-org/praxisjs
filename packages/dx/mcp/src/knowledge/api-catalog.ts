/**
 * The public PraxisJS API: every runtime export of the `@praxisjs/*` packages an application uses,
 * with where it lives, what kind of thing it is and which docs page explains it. Signatures are not
 * kept here: they are read from the project's installed type declarations, so they always match
 * the version in use. A test checks this list against the packages' real exports.
 */

export const API_KINDS = [
  'base-class',
  'class-decorator',
  'field-decorator',
  'method-decorator',
  'getter-decorator',
  'decorator-builder',
  'composable',
  'component',
  'function',
  'class',
] as const

export type ApiKind = (typeof API_KINDS)[number]

export interface ApiEntry {
  name: string
  package: string
  kind: ApiKind
  summary: string
  /** Docs slug relative to /docs. */
  docs: string
  /** Extra words for "does this already exist?" searches. */
  keywords?: string
  /** Field decorators whose field is reactive: reading it outside a JSX arrow is a snapshot. */
  reactive?: true
  /** Only valid on `StatefulComponent` (and stores), never on `StatelessComponent`. */
  statefulOnly?: true
}

const D = '@praxisjs/decorators'

export const API_CATALOG: readonly ApiEntry[] = [
  // @praxisjs/core
  { name: 'StatefulComponent', package: '@praxisjs/core', kind: 'base-class', summary: 'Base class for components with internal state, props via @Prop, watchers, events and slots.', docs: 'essentials/components' },
  { name: 'StatelessComponent', package: '@praxisjs/core', kind: 'base-class', summary: 'Base class for presentational components; props typed with a generic and read through this.props.', docs: 'essentials/components' },
  { name: 'Composable', package: '@praxisjs/core', kind: 'base-class', summary: 'Base class for reusable reactive logic attached to components with @Compose.', docs: 'advanced/custom-composables', keywords: 'mixin hook reusable logic' },
  { name: 'peek', package: '@praxisjs/core', kind: 'function', summary: 'Reads a signal without subscribing the current reactive context to it.', docs: 'essentials/reactivity', keywords: 'untracked read' },
  { name: 'untrack', package: '@praxisjs/core', kind: 'function', summary: 'Runs a function without tracking the signals it reads.', docs: 'essentials/reactivity', keywords: 'untracked' },

  // @praxisjs/decorators: components
  { name: 'Component', package: D, kind: 'class-decorator', summary: 'Marks a class as a component; must be the innermost class decorator.', docs: 'essentials/components' },
  { name: 'Lazy', package: D, kind: 'class-decorator', summary: 'Defers mounting a component until it enters the viewport (IntersectionObserver).', docs: 'decorators/performance', keywords: 'viewport defer offscreen intersection lazy load' },

  // @praxisjs/decorators: state & props
  { name: 'State', package: D, kind: 'field-decorator', summary: 'Field backed by a signal; reading it inside a JSX arrow subscribes to updates.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'reactive signal state' },
  { name: 'Prop', package: D, kind: 'field-decorator', summary: 'External prop received from the parent; the initializer is the default.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'input property parent' },
  { name: 'FunctionProp', package: D, kind: 'field-decorator', summary: 'Function prop received from the parent without being called as a reactive getter.', docs: 'decorators/state', statefulOnly: true, keywords: 'callback handler prop' },
  { name: 'Computed', package: D, kind: 'getter-decorator', summary: 'Read-only derived getter cached as a computed; recomputes only when its dependencies change.', docs: 'decorators/state', reactive: true, keywords: 'derived cached memo getter' },
  { name: 'DeepState', package: D, kind: 'field-decorator', summary: 'Like @State, but nested mutations (push, property assignment) are reactive through a deep proxy.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'nested mutation proxy deep' },
  { name: 'Persisted', package: D, kind: 'field-decorator', summary: 'Like @State, persisted to localStorage with optional cross-tab sync.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'localStorage storage persist save remember' },
  { name: 'History', package: D, kind: 'field-decorator', summary: 'Adds undo/redo (undo, redo, canUndo, canRedo) to a @State field.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'undo redo history stack' },
  { name: 'Synced', package: D, kind: 'field-decorator', summary: 'Like @State, synced across open browser tabs through BroadcastChannel.', docs: 'decorators/state', reactive: true, statefulOnly: true, keywords: 'cross-tab broadcast sync tabs' },
  { name: 'Resource', package: D, kind: 'field-decorator', summary: 'Async data field tracking pending, error and data; refetches when signals in the fetcher change.', docs: 'essentials/async-data', reactive: true, statefulOnly: true, keywords: 'fetch async loading error data request api' },
  { name: 'invalidateResource', package: D, kind: 'function', summary: 'Invalidates cached @Resource entries so they refetch.', docs: 'essentials/async-data', keywords: 'refetch cache invalidate' },
  { name: 'Ref', package: D, kind: 'field-decorator', summary: 'Holds a reference to a rendered DOM element or component.', docs: 'decorators/state', statefulOnly: true, keywords: 'dom element reference' },
  { name: 'createRef', package: D, kind: 'function', summary: 'Creates a standalone element ref object.', docs: 'decorators/state', keywords: 'dom element reference' },
  { name: 'Selector', package: D, kind: 'field-decorator', summary: 'Exposes isSelected(key); a change re-runs only the bindings of the previous and next key.', docs: 'decorators/performance', reactive: true, statefulOnly: true, keywords: 'selected row highlight active item list performance' },
  { name: 'Slot', package: D, kind: 'field-decorator', summary: 'Declares a named slot collecting children passed with slot="name".', docs: 'decorators/events', statefulOnly: true, keywords: 'children named slot' },
  { name: 'initSlots', package: D, kind: 'function', summary: 'Distributes children into @Slot fields; used by components that manage slots by hand.', docs: 'decorators/events' },
  { name: 'Compose', package: D, kind: 'field-decorator', summary: 'Attaches a Composable class to the component, wiring its reactive properties and lifecycle.', docs: 'composables', reactive: true, keywords: 'composable mixin attach' },
  { name: 'getter', package: D, kind: 'function', summary: 'Passes a live reactive prop source to a composable constructor argument.', docs: 'advanced/custom-composables' },

  // @praxisjs/decorators: watchers, events, timing, utilities
  { name: 'Watch', package: D, kind: 'method-decorator', summary: 'Calls the method when any listed property changes; changes in one tick are coalesced.', docs: 'decorators/watchers', statefulOnly: true, keywords: 'observe change effect subscribe side effect' },
  { name: 'When', package: D, kind: 'method-decorator', summary: 'Calls the method once, the first time the property becomes truthy.', docs: 'decorators/watchers', statefulOnly: true, keywords: 'once truthy condition' },
  { name: 'Until', package: D, kind: 'method-decorator', summary: 'Turns the method into a promise resolving with the first truthy value of the property.', docs: 'decorators/watchers', statefulOnly: true, keywords: 'await promise wait condition' },
  { name: 'Emit', package: D, kind: 'method-decorator', summary: 'Calls the named callback prop with the method return value.', docs: 'decorators/events', statefulOnly: true, keywords: 'event emit callback notify parent' },
  { name: 'OnCommand', package: D, kind: 'method-decorator', summary: 'Subscribes the method to a Command prop bus; unsubscribes on unmount.', docs: 'decorators/events', statefulOnly: true, keywords: 'command bus parent to child call' },
  { name: 'Command', package: D, kind: 'class', summary: 'A command bus a parent passes down to trigger child methods.', docs: 'decorators/events' },
  { name: 'createCommand', package: D, kind: 'function', summary: 'Creates a Command bus.', docs: 'decorators/events' },
  { name: 'Debounce', package: D, kind: 'method-decorator', summary: 'Delays execution until calls settle for the given milliseconds; cleaned up on unmount.', docs: 'decorators/timing', keywords: 'debounce delay timer input typing settimeout' },
  { name: 'Throttle', package: D, kind: 'method-decorator', summary: 'Runs on the leading edge, then ignores calls for the given milliseconds.', docs: 'decorators/timing', keywords: 'throttle rate limit scroll resize' },
  { name: 'Bind', package: D, kind: 'method-decorator', summary: 'Binds the method to the instance.', docs: 'decorators/utilities', keywords: 'bind this callback' },
  { name: 'Log', package: D, kind: 'method-decorator', summary: 'Logs calls with arguments, return value and duration (dev only by default).', docs: 'decorators/utilities', keywords: 'logging console trace' },
  { name: 'Once', package: D, kind: 'method-decorator', summary: 'Runs the method at most once per instance and caches the result.', docs: 'decorators/utilities', keywords: 'once guard run once' },
  { name: 'Memo', package: D, kind: 'method-decorator', summary: 'Memoizes the method per argument set with a reactive computed per entry.', docs: 'decorators/utilities', keywords: 'memoize cache' },
  { name: 'Retry', package: D, kind: 'method-decorator', summary: 'Retries an async method on failure with delay and exponential backoff.', docs: 'decorators/utilities', keywords: 'retry backoff failure' },

  // @praxisjs/decorators: building your own
  { name: 'createFieldDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a field decorator from a per-instance bind() returning a descriptor and lifecycle hooks.', docs: 'advanced/custom-decorators', keywords: 'custom decorator field property' },
  { name: 'createMethodDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a method decorator that wraps the method with cross-cutting logic.', docs: 'advanced/custom-decorators', keywords: 'custom decorator method wrap' },
  { name: 'createLifecycleMethodDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a method decorator that registers the method on mount and cleans it up on unmount.', docs: 'advanced/custom-decorators', keywords: 'custom decorator listener mount unmount' },
  { name: 'createGetterDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a getter decorator that transforms the getter value on every read.', docs: 'advanced/custom-decorators', keywords: 'custom decorator getter transform' },
  { name: 'createWritableGetterDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a getter decorator that owns both reads and writes.', docs: 'advanced/custom-decorators', keywords: 'custom decorator getter setter' },
  { name: 'createGetterObserverDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a getter decorator that observes the value for side effects.', docs: 'advanced/custom-decorators', keywords: 'custom decorator observe getter' },
  { name: 'createClassDecorator', package: D, kind: 'decorator-builder', summary: 'Builds a class decorator from a ClassBehavior (per-instance create, one-time initialize).', docs: 'advanced/custom-decorators', keywords: 'custom class decorator behavior lifecycle render' },
  { name: 'ClassBehavior', package: D, kind: 'class', summary: 'Base class for the behavior passed to createClassDecorator.', docs: 'advanced/custom-decorators' },
  { name: 'addClaimableInitializer', package: D, kind: 'function', summary: 'Registers per-instance field setup for decorators written directly against the TC39 API.', docs: 'advanced/custom-decorators' },
  { name: 'assertFieldContext', package: D, kind: 'function', summary: 'Throws when a field decorator is applied to something other than a plain field.', docs: 'advanced/custom-decorators' },
  { name: 'reactiveHostType', package: D, kind: 'function', summary: 'Type-only marker that lets non-component classes host @State fields.', docs: 'internal/core' },

  // @praxisjs/runtime
  { name: 'render', package: '@praxisjs/runtime', kind: 'function', summary: 'Mounts (or hydrates prerendered HTML of) a component tree into a container; returns a dispose function.', docs: 'guide/getting-started' },
  { name: 'enableHydration', package: '@praxisjs/runtime', kind: 'function', summary: 'Lets render() hydrate prerendered HTML; ssgPlugin() calls it, other prerenderers call it once before render().', docs: 'tooling/ssg', keywords: 'hydrate ssr prerender' },
  { name: 'For', package: '@praxisjs/runtime', kind: 'component', summary: 'Renders a list keeping one row per key; rows update in place.', docs: 'essentials/lists', keywords: 'list loop map keyed rows array' },
  { name: 'Index', package: '@praxisjs/runtime', kind: 'component', summary: 'Renders a list keeping one row per position.', docs: 'essentials/lists', keywords: 'list loop map index rows array' },
  { name: 'Portal', package: '@praxisjs/runtime', kind: 'component', summary: 'Renders children into another DOM node (modals, tooltips).', docs: 'essentials/portal', keywords: 'modal overlay tooltip teleport body' },
  { name: 'Scope', package: '@praxisjs/runtime', kind: 'class', summary: 'Ownership scope disposing effects and children together.', docs: 'internal/core' },
  { name: 'runInScope', package: '@praxisjs/runtime', kind: 'function', summary: 'Runs a function with the given scope as the current owner.', docs: 'internal/core' },
  { name: 'getCurrentScope', package: '@praxisjs/runtime', kind: 'function', summary: 'Returns the scope currently collecting effects.', docs: 'internal/core' },
  { name: 'mountElement', package: '@praxisjs/runtime', kind: 'function', summary: 'Low-level element mounting used by the JSX runtime.', docs: 'internal/core' },
  { name: 'mountChildren', package: '@praxisjs/runtime', kind: 'function', summary: 'Low-level children mounting used by the JSX runtime.', docs: 'internal/core' },
  { name: 'mountComponent', package: '@praxisjs/runtime', kind: 'function', summary: 'Low-level component mounting used by the JSX runtime.', docs: 'internal/core' },

  // @praxisjs/router
  { name: 'Router', package: '@praxisjs/router', kind: 'class-decorator', summary: 'Declares the route table on the root component.', docs: 'ecosystem/router', keywords: 'routes routing navigation pages' },
  { name: 'Route', package: '@praxisjs/router', kind: 'class-decorator', summary: 'Registers a component as the page for a path.', docs: 'ecosystem/router', keywords: 'page path url' },
  { name: 'Lazy', package: '@praxisjs/router', kind: 'function', summary: 'Wraps a dynamically imported route component (code splitting).', docs: 'ecosystem/router', keywords: 'code splitting dynamic import' },
  { name: 'Params', package: '@praxisjs/router', kind: 'field-decorator', summary: 'Injects the current route params.', docs: 'ecosystem/router', reactive: true, keywords: 'url params id slug' },
  { name: 'Query', package: '@praxisjs/router', kind: 'field-decorator', summary: 'Injects the current query string values.', docs: 'ecosystem/router', reactive: true, keywords: 'query string search params' },
  { name: 'Location', package: '@praxisjs/router', kind: 'field-decorator', summary: 'Injects the current route location.', docs: 'ecosystem/router', reactive: true, keywords: 'current url path location' },
  { name: 'Meta', package: '@praxisjs/router', kind: 'field-decorator', summary: 'Injects the current route meta.', docs: 'ecosystem/router', reactive: true },
  { name: 'InjectLayout', package: '@praxisjs/router', kind: 'field-decorator', summary: 'Injects the active layout component.', docs: 'ecosystem/router', reactive: true, keywords: 'layout shell' },
  { name: 'RouterView', package: '@praxisjs/router', kind: 'component', summary: 'Renders the matched page component.', docs: 'ecosystem/router' },
  { name: 'RouterOutlet', package: '@praxisjs/router', kind: 'component', summary: 'Renders the page inside a layout.', docs: 'ecosystem/router' },
  { name: 'Link', package: '@praxisjs/router', kind: 'component', summary: 'Navigation link with an active class.', docs: 'ecosystem/router', keywords: 'anchor navigate href active' },
  { name: 'RouterInstance', package: '@praxisjs/router', kind: 'class', summary: 'The router: navigation, current location and loading state.', docs: 'ecosystem/router', keywords: 'navigate programmatic push replace' },
  { name: 'useMeta', package: '@praxisjs/router', kind: 'function', summary: 'Reads the current route meta.', docs: 'ecosystem/router' },

  // @praxisjs/store
  { name: 'Storable', package: '@praxisjs/store', kind: 'class-decorator', summary: 'Declares a global store class (a singleton per name).', docs: 'ecosystem/store', keywords: 'global state singleton shared store' },
  { name: 'Store', package: '@praxisjs/store', kind: 'field-decorator', summary: 'Injects a store instance into a component field.', docs: 'ecosystem/store', reactive: true, keywords: 'inject store' },
  { name: 'store', package: '@praxisjs/store', kind: 'function', summary: 'Returns a store instance outside components.', docs: 'ecosystem/store' },
  { name: 'ReactiveStore', package: '@praxisjs/store', kind: 'base-class', summary: 'Base class for stores that hold @State fields.', docs: 'ecosystem/store' },
  { name: 'useStorePlugin', package: '@praxisjs/store', kind: 'function', summary: 'Registers a store plugin (init, mutation and action hooks).', docs: 'ecosystem/store', keywords: 'store plugin middleware logging persistence' },
  { name: 'clearPlugins', package: '@praxisjs/store', kind: 'function', summary: 'Removes every registered store plugin.', docs: 'ecosystem/store' },

  // @praxisjs/di
  { name: 'Injectable', package: '@praxisjs/di', kind: 'class-decorator', summary: 'Registers a class as an injectable service.', docs: 'ecosystem/di', keywords: 'service dependency injection singleton' },
  { name: 'Inject', package: '@praxisjs/di', kind: 'field-decorator', summary: 'Injects a service into a field.', docs: 'ecosystem/di', keywords: 'dependency injection service' },
  { name: 'InjectContainer', package: '@praxisjs/di', kind: 'field-decorator', summary: 'Injects the current DI container.', docs: 'ecosystem/di' },
  { name: 'Scope', package: '@praxisjs/di', kind: 'class-decorator', summary: 'Gives a component subtree its own DI container.', docs: 'ecosystem/di', keywords: 'scoped container provider' },
  { name: 'inject', package: '@praxisjs/di', kind: 'function', summary: 'Resolves a service outside a decorated field.', docs: 'ecosystem/di' },
  { name: 'Container', package: '@praxisjs/di', kind: 'class', summary: 'A DI container.', docs: 'ecosystem/di' },
  { name: 'container', package: '@praxisjs/di', kind: 'function', summary: 'The root DI container.', docs: 'ecosystem/di' },
  { name: 'Token', package: '@praxisjs/di', kind: 'class', summary: 'A typed injection token for non-class values.', docs: 'ecosystem/di' },
  { name: 'token', package: '@praxisjs/di', kind: 'function', summary: 'Creates an injection token.', docs: 'ecosystem/di' },

  // @praxisjs/motion, fsm, content, head, concurrent
  { name: 'Tween', package: '@praxisjs/motion', kind: 'field-decorator', summary: 'Animates a numeric field toward its target over a duration with easing.', docs: 'ecosystem/motion', reactive: true, keywords: 'animation tween requestAnimationFrame easing' },
  { name: 'Spring', package: '@praxisjs/motion', kind: 'field-decorator', summary: 'Animates a numeric field with spring physics.', docs: 'ecosystem/motion', reactive: true, keywords: 'animation spring physics' },
  { name: 'createTransition', package: '@praxisjs/motion', kind: 'function', summary: 'Enter/leave transition hooks for For and Index rows.', docs: 'ecosystem/motion', keywords: 'list transition enter leave animate rows' },
  { name: 'StateMachine', package: '@praxisjs/fsm', kind: 'field-decorator', summary: 'Declares a finite state machine field.', docs: 'ecosystem/fsm', reactive: true, keywords: 'state machine status transitions enum' },
  { name: 'Transition', package: '@praxisjs/fsm', kind: 'method-decorator', summary: 'Runs a state machine transition when the method is called.', docs: 'ecosystem/fsm', keywords: 'state machine transition' },
  { name: 'Collection', package: '@praxisjs/content', kind: 'field-decorator', summary: 'Loads a content collection (markdown with frontmatter) into a field.', docs: 'ecosystem/content', reactive: true, keywords: 'markdown frontmatter content posts blog' },
  { name: 'PagedCollection', package: '@praxisjs/content', kind: 'field-decorator', summary: 'Loads one page of a content collection.', docs: 'ecosystem/content', reactive: true, keywords: 'pagination posts' },
  { name: 'ContentSchema', package: '@praxisjs/content', kind: 'base-class', summary: 'Base class describing a content collection schema.', docs: 'ecosystem/content' },
  { name: 'getCollection', package: '@praxisjs/content', kind: 'function', summary: 'Loads every entry of a collection.', docs: 'ecosystem/content' },
  { name: 'getEntry', package: '@praxisjs/content', kind: 'function', summary: 'Loads one entry by slug.', docs: 'ecosystem/content' },
  { name: 'getTotal', package: '@praxisjs/content', kind: 'function', summary: 'Number of entries in a collection.', docs: 'ecosystem/content' },
  { name: 'getPage', package: '@praxisjs/content', kind: 'function', summary: 'Loads one page of entries.', docs: 'ecosystem/content' },
  { name: 'collectionStaticPaths', package: '@praxisjs/content', kind: 'function', summary: 'Builds getStaticPaths for @praxisjs/ssg from a collection.', docs: 'ecosystem/content' },
  { name: 'Head', package: '@praxisjs/head', kind: 'class-decorator', summary: 'Manages document title and meta tags reactively per component.', docs: 'essentials/head', keywords: 'document title meta og seo head' },
  { name: 'headVersion', package: '@praxisjs/head', kind: 'function', summary: 'Signal bumped whenever the head stack changes.', docs: 'essentials/head' },
  { name: 'Task', package: '@praxisjs/concurrent', kind: 'field-decorator', summary: 'Wraps an async method with loading, error, last result and cancellation.', docs: 'ecosystem/concurrency', reactive: true, keywords: 'async loading cancel concurrency task' },
  { name: 'Queue', package: '@praxisjs/concurrent', kind: 'field-decorator', summary: 'Runs calls of an async method one after another.', docs: 'ecosystem/concurrency', reactive: true, keywords: 'queue sequential serial' },
  { name: 'Pool', package: '@praxisjs/concurrent', kind: 'field-decorator', summary: 'Runs calls of an async method with a concurrency limit.', docs: 'ecosystem/concurrency', reactive: true, keywords: 'pool parallel limit concurrency' },
  { name: 'QueueClearedError', package: '@praxisjs/concurrent', kind: 'class', summary: 'Rejection reason of calls dropped by a cleared @Queue.', docs: 'ecosystem/concurrency' },

  // @praxisjs/composables
  { name: 'WindowSize', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive window width and height.', docs: 'composables/dom', keywords: 'resize viewport window dimensions' },
  { name: 'ScrollPosition', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive scroll x and y of the window or an element.', docs: 'composables/dom', keywords: 'scroll listener offset' },
  { name: 'ElementSize', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive element width and height (ResizeObserver).', docs: 'composables/dom', keywords: 'resizeobserver element dimensions' },
  { name: 'Intersection', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive visibility of an element (IntersectionObserver).', docs: 'composables/dom', keywords: 'intersectionobserver visible viewport infinite scroll' },
  { name: 'Focus', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive focus state of an element.', docs: 'composables/dom', keywords: 'focus blur' },
  { name: 'MediaQuery', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive matchMedia result.', docs: 'composables/browser', keywords: 'matchmedia breakpoint responsive' },
  { name: 'ColorScheme', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive OS dark/light preference.', docs: 'composables/browser', keywords: 'dark mode light theme prefers-color-scheme' },
  { name: 'Mouse', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive mouse position.', docs: 'composables/browser', keywords: 'pointer cursor position' },
  { name: 'KeyCombo', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive state of a keyboard shortcut.', docs: 'composables/browser', keywords: 'keyboard shortcut hotkey keydown' },
  { name: 'Idle', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive user idle detection.', docs: 'composables/browser', keywords: 'idle inactivity afk' },
  { name: 'Clipboard', package: '@praxisjs/composables', kind: 'composable', summary: 'Copy to clipboard with a reactive copied flag.', docs: 'composables/browser', keywords: 'copy paste clipboard' },
  { name: 'Geolocation', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive geolocation with loading and error.', docs: 'composables/browser', keywords: 'gps location latitude longitude' },
  { name: 'TimeAgo', package: '@praxisjs/composables', kind: 'composable', summary: 'Reactive relative time ("5 minutes ago").', docs: 'composables/browser', keywords: 'relative time date format ago' },
  { name: 'Pagination', package: '@praxisjs/composables', kind: 'composable', summary: 'Pagination math: page, totalPages, offset, prev/next/goTo.', docs: 'composables/browser', keywords: 'paging pages offset' },
  { name: 'VirtualList', package: '@praxisjs/composables', kind: 'composable', summary: 'Virtualizes a long fixed-height list.', docs: 'composables/list', keywords: 'virtual scroll long list windowing' },
  { name: 'FileSelection', package: '@praxisjs/composables', kind: 'composable', summary: 'File picker with validation (accept, size, count).', docs: 'composables/upload', keywords: 'file input picker' },
  { name: 'DropZone', package: '@praxisjs/composables', kind: 'composable', summary: 'Drag-and-drop file target.', docs: 'composables/upload', keywords: 'drag drop files' },
  { name: 'FileUpload', package: '@praxisjs/composables', kind: 'composable', summary: 'Uploads files with progress, concurrency and retries.', docs: 'composables/upload', keywords: 'upload progress xhr' },
  { name: 'FilePreview', package: '@praxisjs/composables', kind: 'composable', summary: 'Object URLs for image previews, revoked on unmount.', docs: 'composables/upload', keywords: 'image preview thumbnail' },
  { name: 'formatFileSize', package: '@praxisjs/composables', kind: 'function', summary: 'Formats a byte count ("1.2 MB").', docs: 'composables/upload', keywords: 'bytes size format' },
  { name: 'validateFiles', package: '@praxisjs/composables', kind: 'function', summary: 'Validates files against accept, size and count rules.', docs: 'composables/upload' },

  // @praxisjs/css
  { name: 'Stylesheet', package: '@praxisjs/css', kind: 'base-class', summary: 'Typed, scoped stylesheet class.', docs: 'css/stylesheets', keywords: 'css styles scoped' },
  { name: 'ReactiveStylesheet', package: '@praxisjs/css', kind: 'base-class', summary: 'Stylesheet with reactive CSS variables (@Param); StatefulComponent only.', docs: 'css/reactive' },
  { name: 'Styled', package: '@praxisjs/css', kind: 'field-decorator', summary: 'Attaches a stylesheet class to a component field (`@Styled(Sheet) $sheet!: Sheet`).', docs: 'css/stylesheets' },
  { name: 'Style', package: '@praxisjs/css', kind: 'field-decorator', summary: 'Binds a reactive inline style value.', docs: 'css/reactive', reactive: true },
  { name: 'Param', package: '@praxisjs/css', kind: 'field-decorator', summary: 'Reactive CSS variable driven by component state.', docs: 'css/reactive', reactive: true, keywords: 'css variable custom property' },
  { name: 'TokenSheet', package: '@praxisjs/css', kind: 'base-class', summary: 'Design tokens as CSS variables.', docs: 'css/tokens', keywords: 'design tokens theme variables' },
  { name: 'ThemeInstance', package: '@praxisjs/css', kind: 'class', summary: 'An applied theme of a TokenSheet.', docs: 'css/tokens' },
  { name: 'theme', package: '@praxisjs/css', kind: 'function', summary: 'Creates a theme for a TokenSheet.', docs: 'css/tokens' },
  { name: 'Themed', package: '@praxisjs/css', kind: 'class-decorator', summary: 'Applies a theme to a component subtree.', docs: 'css/tokens' },
  { name: 'Theme', package: '@praxisjs/css', kind: 'field-decorator', summary: 'Injects the active theme.', docs: 'css/tokens' },
  { name: 'tokenVars', package: '@praxisjs/css', kind: 'function', summary: 'CSS variable references for a TokenSheet.', docs: 'css/tokens' },
  { name: 'cx', package: '@praxisjs/css', kind: 'function', summary: 'Composes class names conditionally.', docs: 'css/cx', keywords: 'classnames clsx conditional classes' },
  { name: 'keyframes', package: '@praxisjs/css', kind: 'function', summary: 'Declares a scoped @keyframes animation.', docs: 'css/keyframes', keywords: 'css animation keyframes' },
  { name: 'globalStyle', package: '@praxisjs/css', kind: 'function', summary: 'Declares global CSS rules.', docs: 'css/global-style' },
  { name: 'preflight', package: '@praxisjs/css', kind: 'function', summary: 'Injects a CSS reset.', docs: 'css/global-style', keywords: 'css reset normalize' },

  // @praxisjs/devtools
  { name: 'DevTools', package: '@praxisjs/devtools', kind: 'class', summary: 'In-app devtools overlay; DevTools.init() in development only.', docs: 'tooling/devtools', keywords: 'debug inspect devtools panel' },
  { name: 'Debug', package: '@praxisjs/devtools', kind: 'field-decorator', summary: 'Shows a field, getter or method in the Signals and Timeline panels; can log or break on changes.', docs: 'decorators/dx', keywords: 'debug log breakpoint console' },
  { name: 'Trace', package: '@praxisjs/devtools', kind: 'class-decorator', summary: 'Reports render count, duration and lifecycle; warns on renders slower than `slow` ms.', docs: 'decorators/dx', keywords: 'performance render time profiling slow' },
  { name: 'Registry', package: '@praxisjs/devtools', kind: 'class', summary: 'Devtools registry: components, signals, timeline and the profiler.', docs: 'tooling/devtools-plugins' },
  { name: 'Profiler', package: '@praxisjs/devtools', kind: 'class', summary: 'Render profiler (start, stop, reset, snapshot).', docs: 'tooling/devtools', keywords: 'profile performance' },
  { name: 'SignalsPlugin', package: '@praxisjs/devtools', kind: 'class', summary: 'Built-in Signals tab.', docs: 'tooling/devtools-plugins' },
  { name: 'ComponentsPlugin', package: '@praxisjs/devtools', kind: 'class', summary: 'Built-in Components tab.', docs: 'tooling/devtools-plugins' },
  { name: 'TimelinePlugin', package: '@praxisjs/devtools', kind: 'class', summary: 'Built-in Timeline tab.', docs: 'tooling/devtools-plugins' },
  { name: 'PerformancePlugin', package: '@praxisjs/devtools', kind: 'class', summary: 'Built-in Performance tab (profiler).', docs: 'tooling/devtools' },
]

/** Packages listed in the catalog, in a stable order. */
export const CATALOG_PACKAGES = [...new Set(API_CATALOG.map((entry) => entry.package))]

export function findApi(name: string): ApiEntry[] {
  const bare = name.trim().replace(/^@/, '').replace(/\(\)$/, '')
  return API_CATALOG.filter((entry) => entry.name === bare)
}

export function apiNames(predicate: (entry: ApiEntry) => boolean): Set<string> {
  return new Set(API_CATALOG.filter(predicate).map((entry) => entry.name))
}
