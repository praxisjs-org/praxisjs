---
"@praxisjs/jsx": minor
"@praxisjs/runtime": minor
---

Expand DOM event coverage and HTML/SVG attribute types.

**`@praxisjs/runtime` — EVENT_MAP expanded from 24 to 82 entries.**

Bug fix: `onToggle`, `onClose`, and `onCancel` were declared in their respective JSX interfaces but absent from `EVENT_MAP`. The runtime was treating them as reactive getters instead of event listeners. They are now wired correctly.

New event categories added to `EVENT_MAP`:

- **Pointer** — `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerEnter`, `onPointerLeave`, `onPointerOver`, `onPointerOut`, `onPointerCancel`, `onGotPointerCapture`, `onLostPointerCapture`
- **Mouse** — `onMouseOver`, `onMouseOut` (bubbling variants)
- **Drag** — `onDrag`, `onDragEnter`, `onDragLeave`
- **Form** — `onBeforeInput`, `onSelect`, `onInvalid`
- **Clipboard** — `onCopy`, `onCut`, `onPaste`
- **Composition (IME)** — `onCompositionStart`, `onCompositionUpdate`, `onCompositionEnd`
- **Resource** — `onLoad`, `onError`
- **Scroll** — `onScrollEnd`
- **Element-specific** — `onBeforeToggle`
- **Media** — `onAbort`, `onCanPlay`, `onCanPlayThrough`, `onDurationChange`, `onEmptied`, `onEnded`, `onLoadedData`, `onLoadedMetadata`, `onLoadStart`, `onPause`, `onPlay`, `onPlaying`, `onProgress`, `onRateChange`, `onSeeked`, `onSeeking`, `onStalled`, `onSuspend`, `onTimeUpdate`, `onVolumeChange`, `onWaiting`

**`@praxisjs/jsx` — type additions.**

`AriaAttributes`:
- `"aria-expanded"` — was missing entirely; it is one of the most commonly used ARIA attributes (accordions, disclosures, dropdowns)
- `"aria-autocomplete"` — for combobox/searchbox widgets
- `"aria-errormessage"` — references the element that provides the validation error message

`DOMAttributes<T>`: all new event categories above are now typed with their correct native event types (`PointerEvent`, `ClipboardEvent`, `CompositionEvent`, `ProgressEvent`, etc.) and `currentTarget` narrowed to `T`.

`HTMLAttributes<T>`:
- `autoFocus` — `autofocus` is a global HTML5 attribute, not only valid on form controls
- `inert` — `Reactive<boolean>`; blocks all user interaction and assistive technology programmatically
- `popover` — Popover API; accepts `boolean` (empty attribute, defaults to `"auto"`) or `"auto"` / `"manual"`
- `accessKey` — keyboard shortcut hint
- `nonce` — CSP nonce passthrough
- `part` — CSS `::part()` export list for shadow DOM styling
- `data-*` — template-literal index signature `[key: \`data-${string}\`]: Reactive<string | number | boolean> | undefined`; data attributes are now accepted without a cast on any JSX element

`MediaHTMLAttributes<T>`: all 21 standard media events typed and wired.

`DetailsHTMLAttributes` / `DialogHTMLAttributes`: `onBeforeToggle` added to both.

`InputHTMLAttributes`: `popovertarget` and `popovertargetaction` added (consistent with `ButtonHTMLAttributes`).

`SVGAttributes<T>`:
- `pointerEvents` — typed with all valid SVG `pointer-events` keyword values
- `vectorEffect`, `shapeRendering`, `textRendering`, `imageRendering`, `colorInterpolation`, `paintOrder` — rendering hints
- `cursor` — cursor override on SVG elements
