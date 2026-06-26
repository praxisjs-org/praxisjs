import type { Children } from "@praxisjs/shared";

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** A value OR a zero-argument function returning that value (for reactive bindings). */
export type Reactive<T> = T | (() => T);

/** Boolean that can also be expressed as its string form for HTML attributes. */
export type Booleanish = boolean | "true" | "false";

/**
 * Widens a string literal union so that any `string` value is assignable
 * while IDE autocomplete still suggests the known members.
 */
export type LiteralUnion<T extends string> = T | (string & {});

// ---------------------------------------------------------------------------
// Attribute value enumerations
// ---------------------------------------------------------------------------

export type HTMLInputTypeAttribute = LiteralUnion<
  | "button"
  | "checkbox"
  | "color"
  | "date"
  | "datetime-local"
  | "email"
  | "file"
  | "hidden"
  | "image"
  | "month"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "reset"
  | "search"
  | "submit"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week"
>;

export type ButtonType = LiteralUnion<"submit" | "reset" | "button">;
export type FormMethod = LiteralUnion<"get" | "post" | "dialog">;
export type FormEncType = LiteralUnion<
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"
>;
export type LinkTarget = LiteralUnion<
  "_self" | "_blank" | "_parent" | "_top"
>;
export type ReferrerPolicy = LiteralUnion<
  | ""
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url"
>;
export type CrossOrigin = LiteralUnion<"anonymous" | "use-credentials" | "">;
export type Decoding = LiteralUnion<"async" | "sync" | "auto">;
export type Loading = LiteralUnion<"eager" | "lazy">;
export type Dir = LiteralUnion<"ltr" | "rtl" | "auto">;
export type AutoCapitalize = LiteralUnion<
  "off" | "none" | "on" | "sentences" | "words" | "characters"
>;
export type InputMode = LiteralUnion<
  | "none"
  | "text"
  | "decimal"
  | "numeric"
  | "tel"
  | "search"
  | "email"
  | "url"
>;
export type EnterKeyHint = LiteralUnion<
  "enter" | "done" | "go" | "next" | "previous" | "search" | "send"
>;

// ---------------------------------------------------------------------------
// CSSProperties
// ---------------------------------------------------------------------------

/**
 * Object-style CSS properties accepted by the `style` prop.
 * Supports all camelCase CSS properties and CSS custom properties (`--xxx`).
 */
export type CSSProperties = {
  [K in keyof CSSStyleDeclaration as K extends string
    ? CSSStyleDeclaration[K] extends string
      ? K
      : never
    : never]?: string | number;
} & Record<`--${string}`, string | number | undefined>;

// ---------------------------------------------------------------------------
// AriaAttributes — WAI-ARIA 1.2
// ---------------------------------------------------------------------------

export interface AriaAttributes {
  /** Identifies the currently active element when DOM focus is on a composite widget, combobox, textbox, group, or application. */
  "aria-activedescendant"?: string;
  /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
  "aria-atomic"?: Reactive<Booleanish>;
  /** Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for a combobox, searchbox, or textbox and specifies how predictions would be presented. */
  "aria-autocomplete"?: LiteralUnion<"none" | "inline" | "list" | "both">;
  /** Indicates an element's "busy" status. */
  "aria-busy"?: Reactive<Booleanish>;
  /** Indicates the current "checked" state of checkboxes, radio buttons, and other widgets. */
  "aria-checked"?: Reactive<Booleanish | LiteralUnion<"mixed">>;
  /** Defines the total number of columns in a table, grid, or treegrid. */
  "aria-colcount"?: number;
  /** Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid. */
  "aria-colindex"?: number;
  /** Defines a human readable text alternative of aria-colindex. */
  "aria-colindextext"?: string;
  /** Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. */
  "aria-colspan"?: number;
  /** Identifies the element(s) whose contents or presence are controlled by the current element. */
  "aria-controls"?: string;
  /** Indicates the element that represents the current item within a container or set of related elements. */
  "aria-current"?: Reactive<
    Booleanish | LiteralUnion<"page" | "step" | "location" | "date" | "time">
  >;
  /** Identifies the element(s) that describes the object. */
  "aria-describedby"?: string;
  /** Defines a string value that describes or annotates the current element. */
  "aria-description"?: string;
  /** Identifies the element that provides a detailed, extended description for the object. */
  "aria-details"?: string;
  /** Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. */
  "aria-disabled"?: Reactive<Booleanish>;
  /** Identifies the element that provides an error message for the current element. */
  "aria-errormessage"?: string;
  /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
  "aria-expanded"?: Reactive<Booleanish>;
  /** Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order. */
  "aria-flowto"?: string;
  /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
  "aria-haspopup"?: Reactive<
    Booleanish | LiteralUnion<"menu" | "listbox" | "tree" | "grid" | "dialog">
  >;
  /** Indicates whether the element is exposed to an accessibility API. */
  "aria-hidden"?: Reactive<Booleanish>;
  /** Indicates the entered value does not conform to the format expected by the application. */
  "aria-invalid"?: Reactive<Booleanish | LiteralUnion<"grammar" | "spelling">>;
  /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
  "aria-keyshortcuts"?: string;
  /** Defines a string value that labels the current element. */
  "aria-label"?: Reactive<string>;
  /** Identifies the element(s) that labels the current element. */
  "aria-labelledby"?: string;
  /** Defines the hierarchical level of an element within a structure. */
  "aria-level"?: number;
  /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
  "aria-live"?: Reactive<LiteralUnion<"off" | "assertive" | "polite">>;
  /** Indicates whether an element is modal when displayed. */
  "aria-modal"?: Reactive<Booleanish>;
  /** Indicates whether a text box accepts multiple lines of input or only a single line. */
  "aria-multiline"?: Reactive<Booleanish>;
  /** Indicates that the user may select more than one item from the current selectable descendants. */
  "aria-multiselectable"?: Reactive<Booleanish>;
  /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
  "aria-orientation"?: LiteralUnion<"horizontal" | "vertical">;
  /** Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. */
  "aria-owns"?: string;
  /** Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. */
  "aria-placeholder"?: string;
  /** Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. */
  "aria-posinset"?: number;
  /** Indicates the current "pressed" state of toggle buttons. */
  "aria-pressed"?: Reactive<Booleanish | LiteralUnion<"mixed">>;
  /** Indicates that the element is not editable, but is otherwise operable. */
  "aria-readonly"?: Reactive<Booleanish>;
  /** Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. */
  "aria-relevant"?: Reactive<LiteralUnion<
    | "additions"
    | "additions removals"
    | "additions text"
    | "all"
    | "removals"
    | "removals additions"
    | "removals text"
    | "text"
    | "text additions"
    | "text removals"
  >>;
  /** Indicates that user input is required on the element before a form may be submitted. */
  "aria-required"?: Reactive<Booleanish>;
  /** Defines a human-readable, author-localized description for the role of an element. */
  "aria-roledescription"?: string;
  /** Defines the total number of rows in a table, grid, or treegrid. */
  "aria-rowcount"?: number;
  /** Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid. */
  "aria-rowindex"?: number;
  /** Defines a human readable text alternative of aria-rowindex. */
  "aria-rowindextext"?: string;
  /** Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. */
  "aria-rowspan"?: number;
  /** Indicates the current "selected" state of various widgets. */
  "aria-selected"?: Reactive<Booleanish>;
  /** Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. */
  "aria-setsize"?: number;
  /** Indicates if items in a table or grid are sorted in ascending or descending order. */
  "aria-sort"?: LiteralUnion<"none" | "ascending" | "descending" | "other">;
  /** Defines the maximum allowed value for a range widget. */
  "aria-valuemax"?: number;
  /** Defines the minimum allowed value for a range widget. */
  "aria-valuemin"?: number;
  /** Defines the current value for a range widget. */
  "aria-valuenow"?: number;
  /** Defines the human readable text alternative of aria-valuenow for a range widget. */
  "aria-valuetext"?: string;
  /** Defines the ARIA role of the element. */
  role?: LiteralUnion<
    | "alert"
    | "alertdialog"
    | "application"
    | "article"
    | "banner"
    | "button"
    | "cell"
    | "checkbox"
    | "columnheader"
    | "combobox"
    | "complementary"
    | "contentinfo"
    | "definition"
    | "dialog"
    | "directory"
    | "document"
    | "feed"
    | "figure"
    | "form"
    | "generic"
    | "grid"
    | "gridcell"
    | "group"
    | "heading"
    | "img"
    | "link"
    | "list"
    | "listbox"
    | "listitem"
    | "log"
    | "main"
    | "marquee"
    | "math"
    | "menu"
    | "menubar"
    | "menuitem"
    | "menuitemcheckbox"
    | "menuitemradio"
    | "meter"
    | "navigation"
    | "none"
    | "note"
    | "option"
    | "presentation"
    | "progressbar"
    | "radio"
    | "radiogroup"
    | "region"
    | "row"
    | "rowgroup"
    | "rowheader"
    | "scrollbar"
    | "search"
    | "searchbox"
    | "separator"
    | "slider"
    | "spinbutton"
    | "status"
    | "switch"
    | "tab"
    | "table"
    | "tablist"
    | "tabpanel"
    | "term"
    | "textbox"
    | "timer"
    | "toolbar"
    | "tooltip"
    | "tree"
    | "treegrid"
    | "treeitem"
  >;
}

// ---------------------------------------------------------------------------
// DOMAttributes — events wired by the runtime's EVENT_MAP
// ---------------------------------------------------------------------------

/** Narrows `currentTarget` to the actual host element type `T`. */
type NativeEventOf<E extends Event, T extends EventTarget> = E & {
  currentTarget: T;
};

/**
 * Event handlers that the praxis runtime wires up via EVENT_MAP.
 * Each handler receives the native browser event with `currentTarget`
 * narrowed to the host element type `T`.
 */
export interface DOMAttributes<T extends EventTarget = EventTarget> {
  // Mouse
  onClick?: (e: NativeEventOf<MouseEvent, T>) => void;
  onDblClick?: (e: NativeEventOf<MouseEvent, T>) => void;
  onMouseDown?: (e: NativeEventOf<MouseEvent, T>) => void;
  onMouseUp?: (e: NativeEventOf<MouseEvent, T>) => void;
  onMouseEnter?: (e: NativeEventOf<MouseEvent, T>) => void;
  onMouseLeave?: (e: NativeEventOf<MouseEvent, T>) => void;
  onMouseMove?: (e: NativeEventOf<MouseEvent, T>) => void;
  /** Fires when the pointer moves over an element or its children (bubbles). */
  onMouseOver?: (e: NativeEventOf<MouseEvent, T>) => void;
  /** Fires when the pointer moves out of an element or its children (bubbles). */
  onMouseOut?: (e: NativeEventOf<MouseEvent, T>) => void;
  onContextMenu?: (e: NativeEventOf<MouseEvent, T>) => void;
  // Keyboard
  onKeyDown?: (e: NativeEventOf<KeyboardEvent, T>) => void;
  onKeyUp?: (e: NativeEventOf<KeyboardEvent, T>) => void;
  /** @deprecated Use onKeyDown instead */
  onKeyPress?: (e: NativeEventOf<KeyboardEvent, T>) => void;
  // Focus
  onFocus?: (e: NativeEventOf<FocusEvent, T>) => void;
  onBlur?: (e: NativeEventOf<FocusEvent, T>) => void;
  // Pointer
  onPointerDown?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerUp?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerMove?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerEnter?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerLeave?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerOver?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerOut?: (e: NativeEventOf<PointerEvent, T>) => void;
  onPointerCancel?: (e: NativeEventOf<PointerEvent, T>) => void;
  onGotPointerCapture?: (e: NativeEventOf<PointerEvent, T>) => void;
  onLostPointerCapture?: (e: NativeEventOf<PointerEvent, T>) => void;
  // Touch
  onTouchStart?: (e: NativeEventOf<TouchEvent, T>) => void;
  onTouchEnd?: (e: NativeEventOf<TouchEvent, T>) => void;
  onTouchMove?: (e: NativeEventOf<TouchEvent, T>) => void;
  // Drag
  onDrag?: (e: NativeEventOf<DragEvent, T>) => void;
  onDragStart?: (e: NativeEventOf<DragEvent, T>) => void;
  onDragEnd?: (e: NativeEventOf<DragEvent, T>) => void;
  onDragEnter?: (e: NativeEventOf<DragEvent, T>) => void;
  onDragLeave?: (e: NativeEventOf<DragEvent, T>) => void;
  onDragOver?: (e: NativeEventOf<DragEvent, T>) => void;
  onDrop?: (e: NativeEventOf<DragEvent, T>) => void;
  // Scroll / Wheel
  onScroll?: (e: NativeEventOf<Event, T>) => void;
  onScrollEnd?: (e: NativeEventOf<Event, T>) => void;
  onWheel?: (e: NativeEventOf<WheelEvent, T>) => void;
  // Form
  onChange?: (e: NativeEventOf<Event, T>) => void;
  onInput?: (e: NativeEventOf<InputEvent, T>) => void;
  onBeforeInput?: (e: NativeEventOf<InputEvent, T>) => void;
  onSubmit?: (e: NativeEventOf<SubmitEvent, T>) => void;
  onReset?: (e: NativeEventOf<Event, T>) => void;
  onSelect?: (e: NativeEventOf<Event, T>) => void;
  onInvalid?: (e: NativeEventOf<Event, T>) => void;
  // Clipboard
  onCopy?: (e: NativeEventOf<ClipboardEvent, T>) => void;
  onCut?: (e: NativeEventOf<ClipboardEvent, T>) => void;
  onPaste?: (e: NativeEventOf<ClipboardEvent, T>) => void;
  // Composition (IME)
  onCompositionStart?: (e: NativeEventOf<CompositionEvent, T>) => void;
  onCompositionUpdate?: (e: NativeEventOf<CompositionEvent, T>) => void;
  onCompositionEnd?: (e: NativeEventOf<CompositionEvent, T>) => void;
  // Resource
  onLoad?: (e: NativeEventOf<Event, T>) => void;
  onError?: (e: NativeEventOf<Event, T>) => void;
  // Animation / Transition
  onAnimationEnd?: (e: NativeEventOf<AnimationEvent, T>) => void;
  onTransitionEnd?: (e: NativeEventOf<TransitionEvent, T>) => void;
}

// ---------------------------------------------------------------------------
// HTMLAttributes — global attributes shared by all HTML elements
// ---------------------------------------------------------------------------

export interface HTMLAttributes<T extends Element = HTMLElement>
  extends AriaAttributes,
    DOMAttributes<T> {
  // Core
  id?: Reactive<string>;
  class?: Reactive<string>;
  /** Alias for `class`. */
  className?: Reactive<string>;
  style?: Reactive<string | CSSProperties>;
  title?: Reactive<string>;
  lang?: Reactive<string>;
  dir?: Reactive<Dir>;
  slot?: string;
  accessKey?: string;
  nonce?: string;
  // Visibility / interaction
  hidden?: Reactive<boolean>;
  tabIndex?: Reactive<number>;
  draggable?: Reactive<boolean>;
  /** Autofocus on mount (global HTML5 attribute). */
  autoFocus?: boolean;
  contentEditable?: Reactive<Booleanish | LiteralUnion<"inherit" | "plaintext-only">>;
  spellcheck?: Reactive<Booleanish>;
  translate?: LiteralUnion<"yes" | "no">;
  /** Marks the element as inert — blocks all user interaction and assistive technology. */
  inert?: Reactive<boolean>;
  /** Declares the element as a popover. Use `"auto"` (default, light-dismiss) or `"manual"`. */
  popover?: boolean | LiteralUnion<"auto" | "manual">;
  /** CSS `::part()` export list for shadow DOM styling. */
  part?: string;
  // Input hints
  inputMode?: Reactive<InputMode>;
  enterKeyHint?: Reactive<EnterKeyHint>;
  autoCapitalize?: Reactive<AutoCapitalize>;
  autoCorrect?: Reactive<string>;
  // Raw HTML injection
  innerHTML?: Reactive<string>;
  // Micro-data
  itemID?: string;
  itemProp?: string;
  itemRef?: string;
  itemScope?: boolean;
  itemType?: string;
  // Custom elements
  is?: string;
  // JSX internals
  key?: string | number | symbol;
  ref?: (el: T) => void;
  children?: Children;
  // Data attributes
  [key: `data-${string}`]: Reactive<string | number | boolean> | undefined;
}

// ---------------------------------------------------------------------------
// Per-element HTML attribute interfaces
// ---------------------------------------------------------------------------

// --- Metadata / head ---

export interface BaseHTMLAttributes<
  T extends HTMLBaseElement = HTMLBaseElement,
> extends HTMLAttributes<T> {
  href?: string;
  target?: LinkTarget;
}

export interface LinkHTMLAttributes<
  T extends HTMLLinkElement = HTMLLinkElement,
> extends HTMLAttributes<T> {
  as?: LiteralUnion<
    | "audio"
    | "document"
    | "embed"
    | "fetch"
    | "font"
    | "image"
    | "object"
    | "script"
    | "style"
    | "track"
    | "video"
    | "worker"
  >;
  crossOrigin?: CrossOrigin;
  href?: string;
  hrefLang?: string;
  integrity?: string;
  media?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  sizes?: string;
  type?: string;
  charSet?: string;
}

export interface MetaHTMLAttributes<
  T extends HTMLMetaElement = HTMLMetaElement,
> extends HTMLAttributes<T> {
  charSet?: string;
  content?: string;
  httpEquiv?: string;
  name?: string;
  media?: string;
}

export interface ScriptHTMLAttributes<
  T extends HTMLScriptElement = HTMLScriptElement,
> extends HTMLAttributes<T> {
  async?: boolean;
  crossOrigin?: CrossOrigin;
  defer?: boolean;
  integrity?: string;
  noModule?: boolean;
  referrerPolicy?: ReferrerPolicy;
  src?: string;
  type?: string;
  charSet?: string;
}

export interface StyleHTMLAttributes<
  T extends HTMLStyleElement = HTMLStyleElement,
> extends HTMLAttributes<T> {
  media?: string;
  scoped?: boolean;
  type?: string;
}

// --- Sectioning / grouping ---

export interface BlockquoteHTMLAttributes<
  T extends HTMLQuoteElement = HTMLQuoteElement,
> extends HTMLAttributes<T> {
  cite?: string;
}

export interface OlHTMLAttributes<
  T extends HTMLOListElement = HTMLOListElement,
> extends HTMLAttributes<T> {
  reversed?: boolean;
  start?: number;
  type?: LiteralUnion<"1" | "a" | "A" | "i" | "I">;
}

export interface LiHTMLAttributes<T extends HTMLLIElement = HTMLLIElement>
  extends HTMLAttributes<T> {
  value?: number;
}

export interface MenuHTMLAttributes<
  T extends HTMLMenuElement = HTMLMenuElement,
> extends HTMLAttributes<T> {
  type?: string;
}

// --- Text-level ---

export interface AnchorHTMLAttributes<
  T extends HTMLAnchorElement = HTMLAnchorElement,
> extends HTMLAttributes<T> {
  download?: Reactive<string | boolean>;
  href?: Reactive<string>;
  hrefLang?: string;
  media?: string;
  ping?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  target?: Reactive<LinkTarget>;
  type?: string;
}

export interface DataHTMLAttributes<
  T extends HTMLDataElement = HTMLDataElement,
> extends HTMLAttributes<T> {
  value?: Reactive<string | number>;
}

export interface TimeHTMLAttributes<
  T extends HTMLTimeElement = HTMLTimeElement,
> extends HTMLAttributes<T> {
  dateTime?: Reactive<string>;
}

// --- Embedded content ---

export interface ImgHTMLAttributes<
  T extends HTMLImageElement = HTMLImageElement,
> extends HTMLAttributes<T> {
  alt?: string;
  crossOrigin?: CrossOrigin;
  decoding?: Decoding;
  height?: Reactive<number | string>;
  loading?: Loading;
  referrerPolicy?: ReferrerPolicy;
  sizes?: string;
  src?: Reactive<string>;
  srcSet?: Reactive<string>;
  useMap?: string;
  width?: Reactive<number | string>;
  fetchPriority?: LiteralUnion<"high" | "low" | "auto">;
}

export interface IframeHTMLAttributes<
  T extends HTMLIFrameElement = HTMLIFrameElement,
> extends HTMLAttributes<T> {
  allow?: string;
  allowFullScreen?: Reactive<boolean>;
  height?: Reactive<number | string>;
  loading?: Loading;
  name?: string;
  referrerPolicy?: ReferrerPolicy;
  sandbox?: Reactive<string>;
  src?: Reactive<string>;
  srcDoc?: string;
  title?: Reactive<string>;
  width?: Reactive<number | string>;
}

export interface EmbedHTMLAttributes<
  T extends HTMLEmbedElement = HTMLEmbedElement,
> extends HTMLAttributes<T> {
  height?: Reactive<number | string>;
  src?: Reactive<string>;
  type?: string;
  width?: Reactive<number | string>;
}

export interface ObjectHTMLAttributes<
  T extends HTMLObjectElement = HTMLObjectElement,
> extends HTMLAttributes<T> {
  data?: string;
  form?: string;
  height?: Reactive<number | string>;
  name?: string;
  type?: string;
  useMap?: string;
  width?: Reactive<number | string>;
}

export interface SourceHTMLAttributes<
  T extends HTMLSourceElement = HTMLSourceElement,
> extends HTMLAttributes<T> {
  height?: Reactive<number | string>;
  media?: string;
  sizes?: string;
  src?: Reactive<string>;
  srcSet?: Reactive<string>;
  type?: string;
  width?: Reactive<number | string>;
}

export interface TrackHTMLAttributes<
  T extends HTMLTrackElement = HTMLTrackElement,
> extends HTMLAttributes<T> {
  default?: boolean;
  kind?: LiteralUnion<
    "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
  >;
  label?: string;
  src?: string;
  srcLang?: string;
}

export interface MediaHTMLAttributes<T extends HTMLMediaElement = HTMLMediaElement>
  extends HTMLAttributes<T> {
  autoPlay?: boolean;
  controls?: Reactive<boolean>;
  controlsList?: string;
  crossOrigin?: CrossOrigin;
  loop?: Reactive<boolean>;
  mediaGroup?: string;
  muted?: Reactive<boolean>;
  playsInline?: boolean;
  preload?: LiteralUnion<"none" | "metadata" | "auto">;
  src?: Reactive<string>;
  // Media events
  onAbort?: (e: NativeEventOf<Event, T>) => void;
  onCanPlay?: (e: NativeEventOf<Event, T>) => void;
  onCanPlayThrough?: (e: NativeEventOf<Event, T>) => void;
  onDurationChange?: (e: NativeEventOf<Event, T>) => void;
  onEmptied?: (e: NativeEventOf<Event, T>) => void;
  onEnded?: (e: NativeEventOf<Event, T>) => void;
  onLoadedData?: (e: NativeEventOf<Event, T>) => void;
  onLoadedMetadata?: (e: NativeEventOf<Event, T>) => void;
  onLoadStart?: (e: NativeEventOf<Event, T>) => void;
  onPause?: (e: NativeEventOf<Event, T>) => void;
  onPlay?: (e: NativeEventOf<Event, T>) => void;
  onPlaying?: (e: NativeEventOf<Event, T>) => void;
  onProgress?: (e: NativeEventOf<ProgressEvent, T>) => void;
  onRateChange?: (e: NativeEventOf<Event, T>) => void;
  onSeeked?: (e: NativeEventOf<Event, T>) => void;
  onSeeking?: (e: NativeEventOf<Event, T>) => void;
  onStalled?: (e: NativeEventOf<Event, T>) => void;
  onSuspend?: (e: NativeEventOf<Event, T>) => void;
  onTimeUpdate?: (e: NativeEventOf<Event, T>) => void;
  onVolumeChange?: (e: NativeEventOf<Event, T>) => void;
  onWaiting?: (e: NativeEventOf<Event, T>) => void;
}

export type AudioHTMLAttributes<
  T extends HTMLAudioElement = HTMLAudioElement,
> = MediaHTMLAttributes<T>;

export interface VideoHTMLAttributes<
  T extends HTMLVideoElement = HTMLVideoElement,
> extends MediaHTMLAttributes<T> {
  height?: Reactive<number | string>;
  playsInline?: boolean;
  poster?: Reactive<string>;
  width?: Reactive<number | string>;
  disablePictureInPicture?: boolean;
  disableRemotePlayback?: boolean;
}

export interface CanvasHTMLAttributes<
  T extends HTMLCanvasElement = HTMLCanvasElement,
> extends HTMLAttributes<T> {
  height?: Reactive<number | string>;
  width?: Reactive<number | string>;
}

export interface MapHTMLAttributes<
  T extends HTMLMapElement = HTMLMapElement,
> extends HTMLAttributes<T> {
  name?: string;
}

export interface AreaHTMLAttributes<
  T extends HTMLAreaElement = HTMLAreaElement,
> extends HTMLAttributes<T> {
  alt?: string;
  coords?: string;
  download?: string;
  href?: Reactive<string>;
  hrefLang?: string;
  media?: string;
  referrerPolicy?: ReferrerPolicy;
  rel?: string;
  shape?: string;
  target?: Reactive<LinkTarget>;
}

// --- Forms ---

export interface FormHTMLAttributes<
  T extends HTMLFormElement = HTMLFormElement,
> extends HTMLAttributes<T> {
  acceptCharset?: string;
  action?: Reactive<string>;
  autoComplete?: string;
  encType?: FormEncType;
  method?: FormMethod;
  name?: string;
  noValidate?: boolean;
  target?: LinkTarget;
  rel?: string;
}

export interface FieldsetHTMLAttributes<
  T extends HTMLFieldSetElement = HTMLFieldSetElement,
> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  form?: string;
  name?: string;
}

export interface InputHTMLAttributes<
  T extends HTMLInputElement = HTMLInputElement,
> extends HTMLAttributes<T> {
  accept?: string;
  alt?: string;
  autoComplete?: LiteralUnion<string>;
  autoFocus?: boolean;
  capture?: boolean | LiteralUnion<"user" | "environment">;
  checked?: Reactive<boolean>;
  crossOrigin?: CrossOrigin;
  defaultChecked?: boolean;
  defaultValue?: string | number | readonly string[];
  dirName?: string;
  disabled?: Reactive<boolean>;
  enterKeyHint?: Reactive<EnterKeyHint>;
  form?: string;
  formAction?: string;
  formEncType?: FormEncType;
  formMethod?: FormMethod;
  formNoValidate?: boolean;
  formTarget?: string;
  height?: Reactive<number | string>;
  list?: string;
  max?: Reactive<number | string>;
  maxLength?: number;
  min?: Reactive<number | string>;
  minLength?: number;
  multiple?: boolean;
  name?: string;
  pattern?: string;
  placeholder?: Reactive<string>;
  readOnly?: Reactive<boolean>;
  required?: Reactive<boolean>;
  size?: number;
  src?: string;
  step?: Reactive<number | string>;
  type?: Reactive<HTMLInputTypeAttribute>;
  value?: Reactive<string | number | readonly string[]>;
  width?: Reactive<number | string>;
  popovertarget?: string;
  popovertargetaction?: LiteralUnion<"hide" | "show" | "toggle">;
}

export interface ButtonHTMLAttributes<
  T extends HTMLButtonElement = HTMLButtonElement,
> extends HTMLAttributes<T> {
  autoFocus?: boolean;
  disabled?: Reactive<boolean>;
  form?: string;
  formAction?: string;
  formEncType?: FormEncType;
  formMethod?: FormMethod;
  formNoValidate?: boolean;
  formTarget?: string;
  name?: string;
  type?: Reactive<ButtonType>;
  value?: Reactive<string>;
  popovertarget?: string;
  popovertargetaction?: LiteralUnion<"hide" | "show" | "toggle">;
}

export interface LabelHTMLAttributes<
  T extends HTMLLabelElement = HTMLLabelElement,
> extends HTMLAttributes<T> {
  form?: string;
  htmlFor?: string;
  /** DOM attribute alias for `htmlFor`. */
  for?: string;
}

export interface SelectHTMLAttributes<
  T extends HTMLSelectElement = HTMLSelectElement,
> extends HTMLAttributes<T> {
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: Reactive<boolean>;
  form?: string;
  multiple?: boolean;
  name?: string;
  required?: Reactive<boolean>;
  size?: number;
  value?: Reactive<string | number | readonly string[]>;
}

export interface OptgroupHTMLAttributes<
  T extends HTMLOptGroupElement = HTMLOptGroupElement,
> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  label?: string;
}

export interface OptionHTMLAttributes<
  T extends HTMLOptionElement = HTMLOptionElement,
> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  label?: string;
  selected?: Reactive<boolean>;
  value?: Reactive<string | number>;
}

export interface OutputHTMLAttributes<
  T extends HTMLOutputElement = HTMLOutputElement,
> extends HTMLAttributes<T> {
  form?: string;
  htmlFor?: string;
  name?: string;
}

export interface TextareaHTMLAttributes<
  T extends HTMLTextAreaElement = HTMLTextAreaElement,
> extends HTMLAttributes<T> {
  autoComplete?: string;
  autoFocus?: boolean;
  cols?: number;
  defaultValue?: string;
  dirName?: string;
  disabled?: Reactive<boolean>;
  form?: string;
  maxLength?: number;
  minLength?: number;
  name?: string;
  placeholder?: Reactive<string>;
  readOnly?: Reactive<boolean>;
  required?: Reactive<boolean>;
  rows?: number;
  value?: Reactive<string>;
  wrap?: LiteralUnion<"hard" | "soft" | "off">;
}

export interface MeterHTMLAttributes<
  T extends HTMLMeterElement = HTMLMeterElement,
> extends HTMLAttributes<T> {
  form?: string;
  high?: number;
  low?: number;
  max?: Reactive<number | string>;
  min?: Reactive<number | string>;
  optimum?: number;
  value?: Reactive<string | number>;
}

export interface ProgressHTMLAttributes<
  T extends HTMLProgressElement = HTMLProgressElement,
> extends HTMLAttributes<T> {
  max?: number | string;
  value?: Reactive<string | number>;
}

export type DatalistHTMLAttributes<
  T extends HTMLDataListElement = HTMLDataListElement,
> = HTMLAttributes<T>;

// --- Interactive ---

export interface DetailsHTMLAttributes<
  T extends HTMLDetailsElement = HTMLDetailsElement,
> extends HTMLAttributes<T> {
  open?: Reactive<boolean>;
  name?: string;
  onToggle?: (e: NativeEventOf<Event, T>) => void;
  onBeforeToggle?: (e: NativeEventOf<Event, T>) => void;
}

export interface DialogHTMLAttributes<
  T extends HTMLDialogElement = HTMLDialogElement,
> extends HTMLAttributes<T> {
  open?: Reactive<boolean>;
  onClose?: (e: NativeEventOf<Event, T>) => void;
  onCancel?: (e: NativeEventOf<Event, T>) => void;
  onToggle?: (e: NativeEventOf<Event, T>) => void;
  onBeforeToggle?: (e: NativeEventOf<Event, T>) => void;
}

export interface SlotHTMLAttributes<
  T extends HTMLSlotElement = HTMLSlotElement,
> extends HTMLAttributes<T> {
  name?: string;
}

// --- Tabular ---

export interface TableHTMLAttributes<
  T extends HTMLTableElement = HTMLTableElement,
> extends HTMLAttributes<T> {
  cellPadding?: number | string;
  cellSpacing?: number | string;
  summary?: string;
  width?: number | string;
}

export interface ColHTMLAttributes<
  T extends HTMLTableColElement = HTMLTableColElement,
> extends HTMLAttributes<T> {
  span?: number;
  width?: number | string;
}

export interface ColgroupHTMLAttributes<
  T extends HTMLTableColElement = HTMLTableColElement,
> extends HTMLAttributes<T> {
  span?: number;
}

export interface TdHTMLAttributes<
  T extends HTMLTableCellElement = HTMLTableCellElement,
> extends HTMLAttributes<T> {
  align?: LiteralUnion<"left" | "center" | "right" | "justify" | "char">;
  colSpan?: number;
  headers?: string;
  rowSpan?: number;
  scope?: LiteralUnion<"col" | "row" | "colgroup" | "rowgroup">;
  abbr?: string;
  height?: number | string;
  width?: number | string;
  valign?: LiteralUnion<"top" | "middle" | "bottom" | "baseline">;
}

export interface ThHTMLAttributes<
  T extends HTMLTableCellElement = HTMLTableCellElement,
> extends HTMLAttributes<T> {
  align?: LiteralUnion<"left" | "center" | "right" | "justify" | "char">;
  colSpan?: number;
  headers?: string;
  rowSpan?: number;
  scope?: LiteralUnion<"col" | "row" | "colgroup" | "rowgroup">;
  abbr?: string;
}

// --- Content edits ---

export interface DelHTMLAttributes<
  T extends HTMLModElement = HTMLModElement,
> extends HTMLAttributes<T> {
  cite?: string;
  dateTime?: string;
}

export interface InsHTMLAttributes<
  T extends HTMLModElement = HTMLModElement,
> extends HTMLAttributes<T> {
  cite?: string;
  dateTime?: string;
}

// ---------------------------------------------------------------------------
// SVGAttributes — common SVG presentation and geometry attributes
// ---------------------------------------------------------------------------

export interface SVGAttributes<T extends Element = SVGElement>
  extends AriaAttributes,
    DOMAttributes<T> {
  // Core
  id?: Reactive<string>;
  class?: Reactive<string>;
  className?: Reactive<string>;
  style?: Reactive<string | CSSProperties>;
  tabIndex?: Reactive<number>;
  key?: string | number | symbol;
  ref?: (el: T) => void;
  children?: Children;
  // Presentation
  color?: Reactive<string>;
  fill?: Reactive<string>;
  fillOpacity?: Reactive<number | string>;
  fillRule?: Reactive<"nonzero" | "evenodd" | "inherit">;
  stroke?: Reactive<string>;
  strokeWidth?: Reactive<number | string>;
  strokeOpacity?: Reactive<number | string>;
  strokeLinecap?: Reactive<"butt" | "round" | "square" | "inherit">;
  strokeLinejoin?: Reactive<"miter" | "round" | "bevel" | "inherit">;
  strokeDasharray?: Reactive<string | number>;
  strokeDashoffset?: Reactive<string | number>;
  strokeMiterlimit?: Reactive<number | string>;
  opacity?: Reactive<number | string>;
  visibility?: Reactive<string>;
  display?: Reactive<string>;
  overflow?: Reactive<string>;
  clipPath?: Reactive<string>;
  clipRule?: Reactive<"nonzero" | "evenodd" | "inherit">;
  mask?: Reactive<string>;
  filter?: Reactive<string>;
  transform?: Reactive<string>;
  cursor?: Reactive<string>;
  /** Controls whether the element can be a hit-test target for pointer events. */
  pointerEvents?: Reactive<LiteralUnion<"none" | "auto" | "visiblePainted" | "visibleFill" | "visibleStroke" | "visible" | "painted" | "fill" | "stroke" | "all">>;
  vectorEffect?: Reactive<LiteralUnion<"none" | "non-scaling-stroke" | "non-scaling-size" | "non-rotation" | "fixed-position">>;
  shapeRendering?: Reactive<LiteralUnion<"auto" | "optimizeSpeed" | "crispEdges" | "geometricPrecision">>;
  textRendering?: Reactive<LiteralUnion<"auto" | "optimizeSpeed" | "optimizeLegibility" | "geometricPrecision">>;
  imageRendering?: Reactive<LiteralUnion<"auto" | "optimizeSpeed" | "optimizeQuality" | "pixelated">>;
  colorInterpolation?: Reactive<LiteralUnion<"auto" | "sRGB" | "linearRGB">>;
  paintOrder?: Reactive<string>;
  // Geometry (shared)
  x?: Reactive<number | string>;
  y?: Reactive<number | string>;
  width?: Reactive<number | string>;
  height?: Reactive<number | string>;
  cx?: Reactive<number | string>;
  cy?: Reactive<number | string>;
  r?: Reactive<number | string>;
  rx?: Reactive<number | string>;
  ry?: Reactive<number | string>;
  d?: Reactive<string>;
  points?: Reactive<string>;
  // Text
  fontSize?: Reactive<number | string>;
  fontFamily?: Reactive<string>;
  fontStyle?: Reactive<string>;
  fontWeight?: Reactive<number | string>;
  textAnchor?: Reactive<"start" | "middle" | "end" | "inherit">;
  dominantBaseline?: Reactive<string>;
  letterSpacing?: Reactive<number | string>;
  wordSpacing?: Reactive<number | string>;
  // Gradient / pattern
  gradientUnits?: Reactive<"userSpaceOnUse" | "objectBoundingBox">;
  gradientTransform?: Reactive<string>;
  spreadMethod?: Reactive<"pad" | "reflect" | "repeat">;
  patternUnits?: Reactive<"userSpaceOnUse" | "objectBoundingBox">;
  patternTransform?: Reactive<string>;
  // Misc
  href?: Reactive<string>;
  xlinkHref?: Reactive<string>;
  viewBox?: Reactive<string>;
  preserveAspectRatio?: Reactive<string>;
  xmlns?: string;
  "xmlns:xlink"?: string;
  in?: Reactive<string>;
  result?: Reactive<string>;
  stdDeviation?: Reactive<number | string>;
  offset?: Reactive<number | string>;
  stopColor?: Reactive<string>;
  stopOpacity?: Reactive<number | string>;
  markerWidth?: Reactive<number | string>;
  markerHeight?: Reactive<number | string>;
  markerUnits?: Reactive<string>;
  refX?: Reactive<number | string>;
  refY?: Reactive<number | string>;
  orient?: Reactive<string>;
  maskUnits?: Reactive<string>;
  maskContentUnits?: Reactive<string>;
  clipPathUnits?: Reactive<string>;
  textLength?: Reactive<number | string>;
  lengthAdjust?: Reactive<string>;
  dy?: Reactive<number | string>;
  dx?: Reactive<number | string>;
  x1?: Reactive<number | string>;
  y1?: Reactive<number | string>;
  x2?: Reactive<number | string>;
  y2?: Reactive<number | string>;
}
