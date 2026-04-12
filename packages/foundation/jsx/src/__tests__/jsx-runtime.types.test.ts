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
