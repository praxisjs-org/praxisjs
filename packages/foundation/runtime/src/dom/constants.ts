export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const SVG_TAGS = new Set([
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

// Event props and the DOM event each one listens to. Every prop is "on" + the event name in camel
// case and listens to that name in lowercase, so only the camel-case names are spelled out, which
// keeps the table small in bundles. A Map: looking a prop up is a single probe.
export const EVENT_MAP: ReadonlyMap<string, string> = /* @__PURE__ */ eventMap(
  // Mouse
  "Click DblClick MouseDown MouseUp MouseEnter MouseLeave MouseMove MouseOver MouseOut ContextMenu " +
  // Keyboard
  "KeyDown KeyUp KeyPress " +
  // Focus
  "Focus Blur " +
  // Pointer
  "PointerDown PointerUp PointerMove PointerEnter PointerLeave PointerOver PointerOut PointerCancel " +
  "GotPointerCapture LostPointerCapture " +
  // Touch
  "TouchStart TouchEnd TouchMove " +
  // Drag
  "Drag DragStart DragEnd DragEnter DragLeave DragOver Drop " +
  // Scroll / Wheel
  "Scroll ScrollEnd Wheel " +
  // Form
  "Change Input BeforeInput Submit Reset Select Invalid " +
  // Clipboard
  "Copy Cut Paste " +
  // Composition (IME)
  "CompositionStart CompositionUpdate CompositionEnd " +
  // Resource
  "Load Error " +
  // Animation / Transition
  "AnimationEnd TransitionEnd " +
  // Element-specific (details, dialog, popover)
  "Toggle BeforeToggle Close Cancel " +
  // Media
  "Abort CanPlay CanPlayThrough DurationChange Emptied Ended LoadedData LoadedMetadata LoadStart Pause Play " +
  "Playing Progress RateChange Seeked Seeking Stalled Suspend TimeUpdate VolumeChange Waiting",
);

function eventMap(names: string): Map<string, string> {
  return new Map(names.split(" ").map((name) => [`on${name}`, name.toLowerCase()]));
}
