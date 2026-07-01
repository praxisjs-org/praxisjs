import { describe, it, expectTypeOf } from "vitest";

import type {
  Reactive,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  HTMLAttributes,
  CSSProperties,
  SVGAttributes,
  ButtonType,
  HTMLInputTypeAttribute,
  LinkTarget,
  AriaAttributes,
  BaseHTMLAttributes,
  LinkHTMLAttributes,
  FormHTMLAttributes,
  LiHTMLAttributes,
  ProgressHTMLAttributes,
  ScriptHTMLAttributes,
  TrackHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  DelHTMLAttributes,
  TimeHTMLAttributes,
} from "../dom-types";

describe("Reactive<T>", () => {
  it("accepts a plain value", () => {
    expectTypeOf<string>().toMatchTypeOf<Reactive<string>>();
  });

  it("accepts a zero-arg function", () => {
    expectTypeOf<() => string>().toMatchTypeOf<Reactive<string>>();
  });

  it("rejects a plain number for Reactive<string>", () => {
    expectTypeOf<number>().not.toMatchTypeOf<Reactive<string>>();
  });

  it("accepts null", () => {
    expectTypeOf<null>().toMatchTypeOf<Reactive<string>>();
  });

  it("accepts undefined", () => {
    expectTypeOf<undefined>().toMatchTypeOf<Reactive<string>>();
  });

  it("accepts a zero-arg function that can return null or undefined", () => {
    expectTypeOf<() => string | null | undefined>().toMatchTypeOf<Reactive<string>>();
  });
});

describe("AriaAttributes", () => {
  it("aria-valuenow accepts a reactive number (range widgets)", () => {
    type Prop = NonNullable<AriaAttributes["aria-valuenow"]>;
    expectTypeOf<5>().toMatchTypeOf<Prop>();
    expectTypeOf<() => number>().toMatchTypeOf<Prop>();
  });

  it("aria-valuetext accepts a reactive string (range widgets)", () => {
    type Prop = NonNullable<AriaAttributes["aria-valuetext"]>;
    expectTypeOf<"50%">().toMatchTypeOf<Prop>();
    expectTypeOf<() => string>().toMatchTypeOf<Prop>();
  });

  it("aria-valuemin / aria-valuemax accept a reactive number", () => {
    type MinProp = NonNullable<AriaAttributes["aria-valuemin"]>;
    type MaxProp = NonNullable<AriaAttributes["aria-valuemax"]>;
    expectTypeOf<() => number>().toMatchTypeOf<MinProp>();
    expectTypeOf<() => number>().toMatchTypeOf<MaxProp>();
  });

  it("aria-selected accepts a reactive boolean (baseline for comparison)", () => {
    type Prop = NonNullable<AriaAttributes["aria-selected"]>;
    expectTypeOf<() => boolean>().toMatchTypeOf<Prop>();
  });

  it("aria-activedescendant accepts a reactive string", () => {
    type Prop = NonNullable<AriaAttributes["aria-activedescendant"]>;
    expectTypeOf<() => string>().toMatchTypeOf<Prop>();
  });

  it("aria-level / aria-posinset / aria-setsize accept a reactive number", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-level"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-posinset"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-setsize"]>
    >();
  });

  it("aria-rowindex / aria-colindex / aria-rowcount / aria-colcount accept a reactive number", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-rowindex"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-colindex"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-rowcount"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-colcount"]>
    >();
  });

  it("aria-sort / aria-orientation / aria-autocomplete accept a reactive literal union", () => {
    expectTypeOf<() => "ascending">().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-sort"]>
    >();
    expectTypeOf<() => "vertical">().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-orientation"]>
    >();
    expectTypeOf<() => "list">().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-autocomplete"]>
    >();
  });

  it("aria-controls / aria-describedby / aria-labelledby / aria-owns accept a reactive string", () => {
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-controls"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-describedby"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-labelledby"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<AriaAttributes["aria-owns"]>
    >();
  });
});

describe("HTMLAttributes — global attribute reactivity", () => {
  it("role accepts a reactive literal union", () => {
    expectTypeOf<() => "tab">().toMatchTypeOf<
      NonNullable<HTMLAttributes["role"]>
    >();
  });

  it("slot / accessKey / part accept a reactive string", () => {
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<HTMLAttributes["slot"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<HTMLAttributes["accessKey"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<HTMLAttributes["part"]>
    >();
  });

  it("popover accepts a reactive boolean or literal union", () => {
    expectTypeOf<() => "manual">().toMatchTypeOf<
      NonNullable<HTMLAttributes["popover"]>
    >();
  });

  it("autoFocus stays a plain boolean — one-shot mount semantics, not reactive", () => {
    type AutoFocusProp = NonNullable<HTMLAttributes["autoFocus"]>;
    expectTypeOf<() => boolean>().not.toMatchTypeOf<AutoFocusProp>();
  });
});

describe("Cross-interface Reactive<T> consistency", () => {
  it("href is reactive on <base> and <link>, matching <a>/<area>/SVG", () => {
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<BaseHTMLAttributes["href"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<LinkHTMLAttributes["href"]>
    >();
  });

  it("target is reactive on <base> and <form>, matching <a>/<area>", () => {
    expectTypeOf<() => "_blank">().toMatchTypeOf<
      NonNullable<BaseHTMLAttributes["target"]>
    >();
    expectTypeOf<() => "_blank">().toMatchTypeOf<
      NonNullable<FormHTMLAttributes["target"]>
    >();
  });

  it("value is reactive on <li>, matching every other value-bearing element", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<LiHTMLAttributes["value"]>
    >();
  });

  it("max is reactive on <progress>, matching <input>/<meter>", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<ProgressHTMLAttributes["max"]>
    >();
  });

  it("src is reactive on <script> and <track>, matching <img>/<iframe>/media", () => {
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<ScriptHTMLAttributes["src"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<TrackHTMLAttributes["src"]>
    >();
  });

  it("width is reactive on <table>, matching <img>/<iframe>/<video>/etc.", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<TableHTMLAttributes["width"]>
    >();
  });

  it("height/width are reactive on <td>, matching every other sized element", () => {
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<TdHTMLAttributes["height"]>
    >();
    expectTypeOf<() => number>().toMatchTypeOf<
      NonNullable<TdHTMLAttributes["width"]>
    >();
  });

  it("dateTime is reactive on <del>, matching <time>", () => {
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<DelHTMLAttributes["dateTime"]>
    >();
    expectTypeOf<() => string>().toMatchTypeOf<
      NonNullable<TimeHTMLAttributes["dateTime"]>
    >();
  });
});

describe("LiteralUnion-based string attributes", () => {
  it("ButtonType: literal values are assignable", () => {
    expectTypeOf<"button">().toMatchTypeOf<ButtonType>();
    expectTypeOf<"submit">().toMatchTypeOf<ButtonType>();
    expectTypeOf<"reset">().toMatchTypeOf<ButtonType>();
  });

  it("ButtonType: arbitrary string is assignable", () => {
    expectTypeOf<string>().toMatchTypeOf<ButtonType>();
  });

  it("HTMLInputTypeAttribute: known literals are assignable", () => {
    expectTypeOf<"text">().toMatchTypeOf<HTMLInputTypeAttribute>();
    expectTypeOf<"email">().toMatchTypeOf<HTMLInputTypeAttribute>();
    expectTypeOf<"password">().toMatchTypeOf<HTMLInputTypeAttribute>();
    expectTypeOf<"checkbox">().toMatchTypeOf<HTMLInputTypeAttribute>();
    expectTypeOf<"radio">().toMatchTypeOf<HTMLInputTypeAttribute>();
  });

  it("HTMLInputTypeAttribute: arbitrary string is assignable", () => {
    expectTypeOf<string>().toMatchTypeOf<HTMLInputTypeAttribute>();
  });

  it("LinkTarget: known literals are assignable", () => {
    expectTypeOf<"_blank">().toMatchTypeOf<LinkTarget>();
    expectTypeOf<"_self">().toMatchTypeOf<LinkTarget>();
    expectTypeOf<"_parent">().toMatchTypeOf<LinkTarget>();
    expectTypeOf<"_top">().toMatchTypeOf<LinkTarget>();
  });

  it("LinkTarget: arbitrary string (e.g. frame name) is assignable", () => {
    expectTypeOf<string>().toMatchTypeOf<LinkTarget>();
  });
});

describe("ButtonHTMLAttributes", () => {
  it("type prop accepts ButtonType", () => {
    type TypeProp = ButtonHTMLAttributes["type"];
    expectTypeOf<"button">().toMatchTypeOf<TypeProp>();
    expectTypeOf<"submit">().toMatchTypeOf<TypeProp>();
    expectTypeOf<"reset">().toMatchTypeOf<TypeProp>();
    expectTypeOf<string>().toMatchTypeOf<TypeProp>();
  });

  it("type prop is reactive", () => {
    type TypeProp = NonNullable<ButtonHTMLAttributes["type"]>;
    expectTypeOf<() => "button">().toMatchTypeOf<TypeProp>();
  });

  it("disabled prop is reactive boolean", () => {
    type DisabledProp = NonNullable<ButtonHTMLAttributes["disabled"]>;
    expectTypeOf<true>().toMatchTypeOf<DisabledProp>();
    expectTypeOf<() => boolean>().toMatchTypeOf<DisabledProp>();
  });

  it("class prop accepts reactive string", () => {
    type ClassProp = NonNullable<ButtonHTMLAttributes["class"]>;
    expectTypeOf<string>().toMatchTypeOf<ClassProp>();
    expectTypeOf<() => string>().toMatchTypeOf<ClassProp>();
  });

  it("onClick receives MouseEvent with currentTarget HTMLButtonElement", () => {
    type Handler = NonNullable<
      ButtonHTMLAttributes<HTMLButtonElement>["onClick"]
    >;
    type Evt = Parameters<Handler>[0];
    expectTypeOf<HTMLButtonElement>().toMatchTypeOf<Evt["currentTarget"]>();
  });
});

describe("InputHTMLAttributes", () => {
  it("type prop accepts HTMLInputTypeAttribute", () => {
    type TypeProp = NonNullable<InputHTMLAttributes["type"]>;
    expectTypeOf<"email">().toMatchTypeOf<TypeProp>();
    expectTypeOf<string>().toMatchTypeOf<TypeProp>();
  });

  it("ref prop receives HTMLInputElement", () => {
    type RefProp = NonNullable<InputHTMLAttributes<HTMLInputElement>["ref"]>;
    type Param = Parameters<RefProp>[0];
    expectTypeOf<HTMLInputElement>().toMatchTypeOf<Param>();
  });
});

describe("AnchorHTMLAttributes", () => {
  it("target accepts LinkTarget (literals and arbitrary strings)", () => {
    type TargetProp = NonNullable<AnchorHTMLAttributes["target"]>;
    expectTypeOf<"_blank">().toMatchTypeOf<TargetProp>();
    expectTypeOf<string>().toMatchTypeOf<TargetProp>();
  });
});

describe("ImgHTMLAttributes", () => {
  it("ref prop receives HTMLImageElement", () => {
    type RefProp = NonNullable<ImgHTMLAttributes<HTMLImageElement>["ref"]>;
    type Param = Parameters<RefProp>[0];
    expectTypeOf<HTMLImageElement>().toMatchTypeOf<Param>();
  });
});

describe("HTMLAttributes", () => {
  it("style accepts a plain string", () => {
    type StyleProp = NonNullable<HTMLAttributes["style"]>;
    expectTypeOf<string>().toMatchTypeOf<StyleProp>();
  });

  it("style accepts a CSSProperties object", () => {
    type StyleProp = NonNullable<HTMLAttributes["style"]>;
    expectTypeOf<CSSProperties>().toMatchTypeOf<StyleProp>();
  });

  it("style accepts a reactive CSSProperties function", () => {
    type StyleProp = NonNullable<HTMLAttributes["style"]>;
    expectTypeOf<() => CSSProperties>().toMatchTypeOf<StyleProp>();
  });
});

describe("CSSProperties", () => {
  it("accepts CSS custom properties", () => {
    const props: CSSProperties = { "--brand-color": "#f00" };
    expectTypeOf(props).toMatchTypeOf<CSSProperties>();
  });
});

describe("SVGAttributes", () => {
  it("fill prop is reactive string", () => {
    type FillProp = NonNullable<SVGAttributes["fill"]>;
    expectTypeOf<string>().toMatchTypeOf<FillProp>();
    expectTypeOf<() => string>().toMatchTypeOf<FillProp>();
  });

  it("onClick receives MouseEvent with SVGElement currentTarget", () => {
    type Handler = NonNullable<SVGAttributes<SVGCircleElement>["onClick"]>;
    type Evt = Parameters<Handler>[0];
    expectTypeOf<SVGCircleElement>().toMatchTypeOf<Evt["currentTarget"]>();
  });
});
