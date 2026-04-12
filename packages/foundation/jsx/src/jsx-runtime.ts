import {
  mountElement,
  mountComponent,
  getCurrentScope,
} from "@praxisjs/runtime";
import {
  isComponent,
  type ComponentConstructor,
} from "@praxisjs/shared/internal";

import type {
  Reactive,
  HTMLAttributes,
  AnchorHTMLAttributes,
  AreaHTMLAttributes,
  AudioHTMLAttributes,
  BaseHTMLAttributes,
  BlockquoteHTMLAttributes,
  ButtonHTMLAttributes,
  CanvasHTMLAttributes,
  ColHTMLAttributes,
  ColgroupHTMLAttributes,
  DataHTMLAttributes,
  DatalistHTMLAttributes,
  DelHTMLAttributes,
  DetailsHTMLAttributes,
  DialogHTMLAttributes,
  EmbedHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  InsHTMLAttributes,
  LabelHTMLAttributes,
  LiHTMLAttributes,
  LinkHTMLAttributes,
  MapHTMLAttributes,
  MenuHTMLAttributes,
  MetaHTMLAttributes,
  MeterHTMLAttributes,
  ObjectHTMLAttributes,
  OlHTMLAttributes,
  OptgroupHTMLAttributes,
  OptionHTMLAttributes,
  OutputHTMLAttributes,
  ProgressHTMLAttributes,
  ScriptHTMLAttributes,
  SelectHTMLAttributes,
  SlotHTMLAttributes,
  SourceHTMLAttributes,
  StyleHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
  ThHTMLAttributes,
  TimeHTMLAttributes,
  TrackHTMLAttributes,
  VideoHTMLAttributes,
  SVGAttributes,
} from "./dom-types";

export const Fragment = Symbol("Fragment");

type PropsOf<T> = T extends string
  ? T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : HTMLAttributes
  : T extends ComponentConstructor<infer P>
    ? { [K in keyof P]: Reactive<P[K]> }
    : Record<string, unknown>;

export function jsx<T extends string | ComponentConstructor | symbol>(
  type: T,
  props: PropsOf<T> & { children?: unknown },
): Node | Node[] {
  const scope = getCurrentScope();

  if (type === Fragment) {
    const { children } = props;
    if (!children) return [];
    if (Array.isArray(children)) return children.flat(Infinity) as Node[];
    if (children instanceof Node) return [children];
    return [];
  }

  if (typeof type === "string") {
    return mountElement(type, props as Record<string, unknown>, scope);
  }

  if (isComponent(type)) {
    return mountComponent(type, props as Record<string, unknown>, scope);
  }

  return document.createComment("?");
}

export const jsxs = jsx;
export const jsxDEV = jsx;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = Node | Node[];

  // Resolves to `true` when T is the `any` type.
  type IsAny<T> = 0 extends 1 & T ? true : false;

  // Internal framework property names excluded from JSX prop inference.
  // `_${string}` covers all underscore-prefixed internals without enumeration.
  type FrameworkKeys =
    | `_${string}`
    | "props"
    | "render"
    | "onBeforeMount"
    | "onMount"
    | "onUnmount"
    | "onError"
    | "onUpdate";

  // Infer typed props:
  // - StatelessComponent<T> with an explicit T → use _rawProps keys directly.
  // - StatefulComponent (wide record) → walk instance properties, strip framework
  //   internals via FrameworkKeys and method filter, leaving @Prop/@State fields.
  type InstancePropsOf<C> = C extends { prototype: infer I }
    ? IsAny<I> extends true
      ? never // raw construct-type alias — prototype resolves to `any`
      : I extends { _rawProps: infer RawProps extends object }
        ? [string] extends [keyof RawProps]
          ? {
              [K in keyof I as K extends FrameworkKeys
                ? never
                : I[K] extends (...args: unknown[]) => unknown
                  ? never
                  : K]?: Reactive<I[K]>;
            }
          : { [K in keyof RawProps]?: Reactive<RawProps[K]> }
        : never
    : never;

  export type LibraryManagedAttributes<C, P> = C extends string
    ? P & { key?: string | number | symbol }
    : [InstancePropsOf<C>] extends [never]
      ? C extends new (props: infer CtorProps) => unknown
        ? {
            [K in keyof CtorProps]?: Reactive<CtorProps[K]>;
          } & { key?: string | number | symbol }
        : Record<string, unknown> & { key?: string | number | symbol }
      : InstancePropsOf<C> & { key?: string | number | symbol };

  export interface IntrinsicElements {
    // --- Metadata ---
    base: BaseHTMLAttributes;
    head: HTMLAttributes;
    html: HTMLAttributes<HTMLHtmlElement>;
    link: LinkHTMLAttributes;
    meta: MetaHTMLAttributes;
    noscript: HTMLAttributes;
    script: ScriptHTMLAttributes;
    style: StyleHTMLAttributes;
    title: HTMLAttributes<HTMLTitleElement>;

    // --- Sectioning ---
    address: HTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    body: HTMLAttributes<HTMLBodyElement>;
    footer: HTMLAttributes;
    header: HTMLAttributes;
    h1: HTMLAttributes<HTMLHeadingElement>;
    h2: HTMLAttributes<HTMLHeadingElement>;
    h3: HTMLAttributes<HTMLHeadingElement>;
    h4: HTMLAttributes<HTMLHeadingElement>;
    h5: HTMLAttributes<HTMLHeadingElement>;
    h6: HTMLAttributes<HTMLHeadingElement>;
    hgroup: HTMLAttributes;
    main: HTMLAttributes;
    nav: HTMLAttributes;
    search: HTMLAttributes;
    section: HTMLAttributes;

    // --- Grouping content ---
    blockquote: BlockquoteHTMLAttributes;
    dd: HTMLAttributes;
    div: HTMLAttributes<HTMLDivElement>;
    dl: HTMLAttributes<HTMLDListElement>;
    dt: HTMLAttributes;
    figcaption: HTMLAttributes;
    figure: HTMLAttributes;
    hr: HTMLAttributes<HTMLHRElement>;
    li: LiHTMLAttributes;
    menu: MenuHTMLAttributes;
    ol: OlHTMLAttributes;
    p: HTMLAttributes<HTMLParagraphElement>;
    pre: HTMLAttributes<HTMLPreElement>;
    ul: HTMLAttributes<HTMLUListElement>;

    // --- Text-level semantics ---
    a: AnchorHTMLAttributes;
    abbr: HTMLAttributes;
    b: HTMLAttributes;
    bdi: HTMLAttributes;
    bdo: HTMLAttributes;
    br: HTMLAttributes<HTMLBRElement>;
    cite: HTMLAttributes;
    code: HTMLAttributes;
    data: DataHTMLAttributes;
    dfn: HTMLAttributes;
    em: HTMLAttributes;
    i: HTMLAttributes;
    kbd: HTMLAttributes;
    mark: HTMLAttributes;
    q: BlockquoteHTMLAttributes;
    rp: HTMLAttributes;
    rt: HTMLAttributes;
    ruby: HTMLAttributes;
    s: HTMLAttributes;
    samp: HTMLAttributes;
    small: HTMLAttributes;
    span: HTMLAttributes;
    strong: HTMLAttributes;
    sub: HTMLAttributes;
    sup: HTMLAttributes;
    time: TimeHTMLAttributes;
    u: HTMLAttributes;
    var: HTMLAttributes;
    wbr: HTMLAttributes;

    // --- Edits ---
    del: DelHTMLAttributes;
    ins: InsHTMLAttributes;

    // --- Embedded content ---
    area: AreaHTMLAttributes;
    audio: AudioHTMLAttributes;
    canvas: CanvasHTMLAttributes;
    embed: EmbedHTMLAttributes;
    iframe: IframeHTMLAttributes;
    img: ImgHTMLAttributes;
    map: MapHTMLAttributes;
    object: ObjectHTMLAttributes;
    picture: HTMLAttributes;
    source: SourceHTMLAttributes;
    track: TrackHTMLAttributes;
    video: VideoHTMLAttributes;

    // --- Forms ---
    button: ButtonHTMLAttributes;
    datalist: DatalistHTMLAttributes;
    fieldset: FieldsetHTMLAttributes;
    form: FormHTMLAttributes;
    input: InputHTMLAttributes;
    label: LabelHTMLAttributes;
    legend: HTMLAttributes<HTMLLegendElement>;
    meter: MeterHTMLAttributes;
    optgroup: OptgroupHTMLAttributes;
    option: OptionHTMLAttributes;
    output: OutputHTMLAttributes;
    progress: ProgressHTMLAttributes;
    select: SelectHTMLAttributes;
    textarea: TextareaHTMLAttributes;

    // --- Interactive ---
    details: DetailsHTMLAttributes;
    dialog: DialogHTMLAttributes;
    slot: SlotHTMLAttributes;
    summary: HTMLAttributes;

    // --- Tabular ---
    caption: HTMLAttributes<HTMLTableCaptionElement>;
    col: ColHTMLAttributes;
    colgroup: ColgroupHTMLAttributes;
    table: TableHTMLAttributes;
    tbody: HTMLAttributes<HTMLTableSectionElement>;
    td: TdHTMLAttributes;
    tfoot: HTMLAttributes<HTMLTableSectionElement>;
    th: ThHTMLAttributes;
    thead: HTMLAttributes<HTMLTableSectionElement>;
    tr: HTMLAttributes<HTMLTableRowElement>;

    // --- Scripting ---
    template: HTMLAttributes<HTMLTemplateElement>;

    // --- SVG ---
    svg: SVGAttributes<SVGSVGElement>;
    path: SVGAttributes<SVGPathElement>;
    circle: SVGAttributes<SVGCircleElement>;
    rect: SVGAttributes<SVGRectElement>;
    line: SVGAttributes<SVGLineElement>;
    polyline: SVGAttributes<SVGPolylineElement>;
    polygon: SVGAttributes<SVGPolygonElement>;
    ellipse: SVGAttributes<SVGEllipseElement>;
    text: SVGAttributes<SVGTextElement>;
    g: SVGAttributes<SVGGElement>;
    defs: SVGAttributes<SVGDefsElement>;
    use: SVGAttributes<SVGUseElement>;
    symbol: SVGAttributes<SVGSymbolElement>;
    marker: SVGAttributes<SVGMarkerElement>;
    clipPath: SVGAttributes<SVGClipPathElement>;
    mask: SVGAttributes<SVGMaskElement>;
    pattern: SVGAttributes<SVGPatternElement>;
    image: SVGAttributes<SVGImageElement>;
    linearGradient: SVGAttributes<SVGLinearGradientElement>;
    radialGradient: SVGAttributes<SVGRadialGradientElement>;
    stop: SVGAttributes<SVGStopElement>;
    filter: SVGAttributes<SVGFilterElement>;
    feGaussianBlur: SVGAttributes<SVGFEGaussianBlurElement>;
    tspan: SVGAttributes<SVGTSpanElement>;
    textPath: SVGAttributes<SVGTextPathElement>;
    foreignObject: SVGAttributes<SVGForeignObjectElement>;
  }
}

// Re-export all HTML/SVG attribute types for use in application code.
export type {
  Reactive,
  Booleanish,
  CSSProperties,
  HTMLInputTypeAttribute,
  ButtonType,
  FormMethod,
  FormEncType,
  LinkTarget,
  ReferrerPolicy,
  CrossOrigin,
  Decoding,
  Loading,
  Dir,
  AutoCapitalize,
  InputMode,
  EnterKeyHint,
  AriaAttributes,
  DOMAttributes,
  HTMLAttributes,
  AnchorHTMLAttributes,
  AreaHTMLAttributes,
  AudioHTMLAttributes,
  BaseHTMLAttributes,
  BlockquoteHTMLAttributes,
  ButtonHTMLAttributes,
  CanvasHTMLAttributes,
  ColHTMLAttributes,
  ColgroupHTMLAttributes,
  DataHTMLAttributes,
  DatalistHTMLAttributes,
  DelHTMLAttributes,
  DetailsHTMLAttributes,
  DialogHTMLAttributes,
  EmbedHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  InsHTMLAttributes,
  LabelHTMLAttributes,
  LiHTMLAttributes,
  LinkHTMLAttributes,
  MapHTMLAttributes,
  MediaHTMLAttributes,
  MenuHTMLAttributes,
  MetaHTMLAttributes,
  MeterHTMLAttributes,
  ObjectHTMLAttributes,
  OlHTMLAttributes,
  OptgroupHTMLAttributes,
  OptionHTMLAttributes,
  OutputHTMLAttributes,
  ProgressHTMLAttributes,
  ScriptHTMLAttributes,
  SelectHTMLAttributes,
  SlotHTMLAttributes,
  SourceHTMLAttributes,
  StyleHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
  ThHTMLAttributes,
  TimeHTMLAttributes,
  TrackHTMLAttributes,
  VideoHTMLAttributes,
  SVGAttributes,
} from "./dom-types";
