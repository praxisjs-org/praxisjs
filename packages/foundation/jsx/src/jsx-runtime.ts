import {
  mountElement,
  mountComponent,
  getCurrentScope,
} from "@praxisjs/runtime";
import type { Children } from "@praxisjs/shared";
import { isComponent, type ComponentConstructor } from "@praxisjs/shared/internal";

export const Fragment = Symbol("Fragment");

type PropsOf<T> = T extends string
  ? JSX.IntrinsicElements[T]
  : T extends ComponentConstructor<infer P>
    ? P
    : Record<string, unknown>;

type Reactive<T> = T | (() => T);

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
    return mountComponent(
      type,
      props as Record<string, unknown>,
      scope,
    );
  }

  return document.createComment("?");
}

export const jsxs = jsx;
export const jsxDEV = jsx;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = Node | Node[];

  interface GlobalAttributes {
    key?: string | number | symbol;
  }

  // Infer props from the class instance properties
  // (excludes lifecycle and methods)
  type InstancePropsOf<C> = C extends { prototype: infer I }
    ? {
        [K in keyof I as K extends
          | "defaults"
          | "onMount"
          | "onUnmount"
          | "onUpdate"
          ? never
          : I[K] extends (...args: unknown[]) => unknown
            ? never
            : K]?: I[K];
      }
    : never;

  export type LibraryManagedAttributes<C, P> = P &
    (C extends string
      ? Record<never, never>
      : InstancePropsOf<C> extends never
        ? Record<never, never>
        : InstancePropsOf<C>) &
    GlobalAttributes;

  export interface IntrinsicElements {
    div: HTMLAttributes;
    span: HTMLAttributes;
    p: HTMLAttributes;
    h1: HTMLAttributes;
    h2: HTMLAttributes;
    h3: HTMLAttributes;
    h4: HTMLAttributes;
    h5: HTMLAttributes;
    h6: HTMLAttributes;
    button: ButtonAttributes;
    input: InputAttributes;
    form: FormAttributes;
    ul: HTMLAttributes;
    ol: HTMLAttributes;
    li: HTMLAttributes;
    a: AnchorAttributes;
    img: ImgAttributes;
    section: HTMLAttributes;
    header: HTMLAttributes;
    main: HTMLAttributes;
    footer: HTMLAttributes;
    nav: HTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    label: LabelAttributes;
    select: SelectAttributes;
    option: OptionAttributes;
    textarea: TextareaAttributes;
    table: HTMLAttributes;
    thead: HTMLAttributes;
    tbody: HTMLAttributes;
    tfoot: HTMLAttributes;
    tr: HTMLAttributes;
    th: ThAttributes;
    td: TdAttributes;
    pre: HTMLAttributes;
    code: HTMLAttributes;
    strong: HTMLAttributes;
    em: HTMLAttributes;
    small: HTMLAttributes;
    hr: HTMLAttributes;
    br: HTMLAttributes;
    [key: string]: HTMLAttributes;
  }

  interface HTMLAttributes {
    id?: Reactive<string>;
    class?: Reactive<string>;
    className?: Reactive<string>;
    style?: Reactive<string | Partial<CSSStyleDeclaration>>;
    children?: Children;
    key?: string | number;
    ref?: (el: HTMLElement) => void;
    tabIndex?: Reactive<number>;
    title?: Reactive<string>;
    hidden?: Reactive<boolean>;
    draggable?: Reactive<boolean>;
    role?: Reactive<string>;
    // Aria
    "aria-label"?: Reactive<string>;
    "aria-hidden"?: Reactive<boolean | "true" | "false">;
    "aria-expanded"?: Reactive<boolean | "true" | "false">;
    "aria-checked"?: Reactive<boolean | "true" | "false" | "mixed">;
    "aria-disabled"?: Reactive<boolean | "true" | "false">;
    "aria-selected"?: Reactive<boolean | "true" | "false">;
    "aria-controls"?: Reactive<string>;
    "aria-describedby"?: Reactive<string>;
    "aria-labelledby"?: Reactive<string>;
    // Mouse Events
    onClick?: (e: MouseEvent) => void;
    onDblClick?: (e: MouseEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    onMouseUp?: (e: MouseEvent) => void;
    onMouseEnter?: (e: MouseEvent) => void;
    onMouseLeave?: (e: MouseEvent) => void;
    onMouseMove?: (e: MouseEvent) => void;
    onContextMenu?: (e: MouseEvent) => void;
    // Keyboard Events
    onKeyDown?: (e: KeyboardEvent) => void;
    onKeyUp?: (e: KeyboardEvent) => void;
    onKeyPress?: (e: KeyboardEvent) => void;
    // Focus Events
    onFocus?: (e: FocusEvent) => void;
    onBlur?: (e: FocusEvent) => void;
    // Form Events
    onChange?: (e: Event) => void;
    onInput?: (e: InputEvent) => void;
    onSubmit?: (e: SubmitEvent) => void;
    onReset?: (e: Event) => void;
    // Drag Events
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
    // Touch Events
    onTouchStart?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    // Other Events
    onScroll?: (e: Event) => void;
    onWheel?: (e: WheelEvent) => void;
    onAnimationEnd?: (e: AnimationEvent) => void;
    onTransitionEnd?: (e: TransitionEvent) => void;
    [key: string]: unknown;
  }

  interface ButtonAttributes extends HTMLAttributes {
    type?: "button" | "submit" | "reset";
    disabled?: Reactive<boolean>;
    form?: string;
    name?: string;
    value?: Reactive<string>;
  }

  interface InputAttributes extends HTMLAttributes {
    type?: string;
    value?: Reactive<string | number>;
    defaultValue?: string | number;
    placeholder?: Reactive<string>;
    disabled?: Reactive<boolean>;
    checked?: Reactive<boolean>;
    defaultChecked?: boolean;
    name?: string;
    min?: Reactive<string | number>;
    max?: Reactive<string | number>;
    step?: Reactive<string | number>;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: Reactive<boolean>;
    readOnly?: Reactive<boolean>;
    multiple?: boolean;
    accept?: string;
    autoComplete?: string;
    autoFocus?: boolean;
  }

  interface FormAttributes extends HTMLAttributes {
    action?: string;
    method?: "get" | "post";
    encType?: string;
    noValidate?: boolean;
    target?: string;
    name?: string;
  }

  interface AnchorAttributes extends HTMLAttributes {
    href?: Reactive<string>;
    target?: "_blank" | "_self" | "_parent" | "_top";
    rel?: string;
    download?: string | boolean;
  }

  interface ImgAttributes extends HTMLAttributes {
    src?: Reactive<string>;
    alt?: string;
    width?: Reactive<number | string>;
    height?: Reactive<number | string>;
    loading?: "lazy" | "eager";
    decoding?: "async" | "sync" | "auto";
  }

  interface LabelAttributes extends HTMLAttributes {
    for?: string;
    htmlFor?: string;
    form?: string;
  }

  interface SelectAttributes extends HTMLAttributes {
    value?: Reactive<string>;
    multiple?: boolean;
    size?: number;
    disabled?: Reactive<boolean>;
    required?: Reactive<boolean>;
    name?: string;
  }

  interface OptionAttributes extends HTMLAttributes {
    value?: string;
    selected?: Reactive<boolean>;
    disabled?: Reactive<boolean>;
    label?: string;
  }

  interface TextareaAttributes extends HTMLAttributes {
    value?: Reactive<string>;
    defaultValue?: string;
    placeholder?: Reactive<string>;
    rows?: number;
    cols?: number;
    disabled?: Reactive<boolean>;
    required?: Reactive<boolean>;
    readOnly?: Reactive<boolean>;
    minLength?: number;
    maxLength?: number;
    name?: string;
    autoFocus?: boolean;
    resize?: "none" | "both" | "horizontal" | "vertical";
  }

  interface ThAttributes extends HTMLAttributes {
    colSpan?: number;
    rowSpan?: number;
    scope?: "col" | "row" | "colgroup" | "rowgroup";
  }

  interface TdAttributes extends HTMLAttributes {
    colSpan?: number;
    rowSpan?: number;
  }
}
