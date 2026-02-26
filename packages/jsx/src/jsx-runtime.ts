import {
  Children,
  ComponentConstructor,
  FunctionComponent,
  VNode,
} from "./types";

type PropsOf<T> = T extends string
  ? JSX.IntrinsicElements[T]
  : T extends ComponentConstructor<infer P>
    ? P
    : T extends FunctionComponent<infer P>
      ? P
      : Record<string, unknown>;

type Reactive<T> = T | (() => T);

function flattenChildren(
  children: Children | Children[],
  out: Children[] = [],
): Children[] {
  if (Array.isArray(children)) {
    for (const child of children) {
      flattenChildren(child, out);
    }
  } else {
    out.push(children);
  }
  return [children];
}

export function jsx<T extends VNode["type"]>(
  type: T,
  props: PropsOf<T> & { children?: Children | Children[] },
  key?: string | number,
): VNode {
  const { children: raw, ...rest } = props;
  const children: Children[] = [];

  if (raw !== undefined) {
    if (Array.isArray(raw)) {
      const flatted = flattenChildren(raw);
      children.push(...flatted);
    } else {
      children.push(raw);
    }
  }

  return {
    type,
    props: rest,
    children,
    key,
  };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export const Fragment = Symbol("Fragment");

export namespace JSX {
  export interface Element extends VNode {}

  type GlobalAttributes = {
    key?: string | number | symbol;
  };

  // Inferir props a partir das propriedades de instância da classe
  // (exclui lifecycle e métodos)
  type InstancePropsOf<C> = C extends { prototype: infer I }
    ? {
        [K in keyof I as K extends
          | "defaults"
          | "onMount"
          | "onUnmount"
          | "onUpdate"
          ? never
          : I[K] extends (...args: any[]) => any
            ? never
            : K]?: I[K];
      }
    : never;

  export type LibraryManagedAttributes<C, P> = P &
    (C extends string
      ? {}
      : InstancePropsOf<C> extends never
        ? {}
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
    children?: Children | Children[];
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
