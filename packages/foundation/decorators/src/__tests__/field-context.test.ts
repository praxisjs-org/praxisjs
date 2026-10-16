import { describe, it, expect } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import { createFieldDecorator } from "../create-field-decorator";
import { addClaimableInitializer, assertFieldContext, CLAIM } from "../field";
import { Prop } from "../properties/prop";
import { Selector } from "../properties/selector";
import { State } from "../properties/state";

type AnyDecorator = (value: unknown, context: DecoratorContext) => void;

// The types reject these placements already; the casts stand in for plain JavaScript, or code that
// skipped type checking, where only the runtime check stops them.
function loose(decorator: unknown): AnyDecorator {
  return decorator as AnyDecorator;
}

describe("assertFieldContext()", () => {
  it("accepts a plain class field", () => {
    expect(() => { assertFieldContext({ kind: "field", name: "count" } as DecoratorContext); }).not.toThrow();
  });

  it("names the accessor to fix, and the decorator when given", () => {
    const context = { kind: "accessor", name: "count" } as DecoratorContext;
    expect(() => { assertFieldContext(context); }).toThrow(
      'This field decorator decorates plain class fields only: remove `accessor` from "count".',
    );
    expect(() => { assertFieldContext(context, "@State()"); }).toThrow(TypeError);
    expect(() => { assertFieldContext(context, "@State()"); }).toThrow(/^@State\(\) decorates/);
  });

  it("rejects the other member kinds", () => {
    expect(() => { assertFieldContext({ kind: "method", name: "run" } as DecoratorContext); }).toThrow(
      'This field decorator decorates class fields only, not the method "run".',
    );
  });
});

describe("field decorators on an accessor", () => {
  it("throws when the class is defined, before any instance exists", () => {
    const state = loose(State());
    const prop = loose(Prop());
    const custom = loose(createFieldDecorator({ bind: () => ({}) }));
    const selector = loose(Selector("current"));

    expect(() => {
      class Counter extends StatefulComponent {
        @state accessor count = 0;
        render() { return null; }
      }
      return Counter;
    }).toThrow('@State() decorates plain class fields only: remove `accessor` from "count".');
    expect(() => {
      class Panel extends StatefulComponent {
        @prop accessor title = "";
        render() { return null; }
      }
      return Panel;
    }).toThrow('@Prop() decorates plain class fields only: remove `accessor` from "title".');
    expect(() => {
      class Host {
        @custom accessor value = 1;
      }
      return Host;
    }).toThrow(/remove `accessor` from "value"/);
    expect(() => {
      class List {
        current = 0;
        @selector accessor isCurrent = null;
      }
      return List;
    }).toThrow(/remove `accessor` from "isCurrent"/);
  });
});

describe("addClaimableInitializer()", () => {
  it("runs as an ordinary initializer from the field's value, or takes the value through CLAIM", () => {
    const seen: unknown[] = [];
    let init: ((this: object) => void) & { [CLAIM]?: (this: object, value: unknown) => void } = () => {};
    const context = {
      name: "count",
      addInitializer(fn: typeof init) { init = fn; },
    } as unknown as ClassFieldDecoratorContext<object, number>;
    addClaimableInitializer(context, function (value) { seen.push([this, value]); });
    const host = { count: 3 };
    init.call(host);
    const claim = init[CLAIM];
    claim?.call(host, 7);
    expect(seen).toEqual([[host, 3], [host, 7]]);
  });
});

describe("createFieldDecorator() through CLAIM", () => {
  it("defines the plain field itself when its binding has no descriptor", () => {
    let init: ((this: object) => void) & { [CLAIM]?: (this: object, value: unknown) => void } = () => {};
    const context = {
      kind: "field",
      name: "kept",
      addInitializer(fn: typeof init) { init = fn; },
    } as unknown as ClassFieldDecoratorContext<object, number>;
    createFieldDecorator<object>({ bind: () => ({}) })(undefined, context);
    const host: Record<string, unknown> = {};
    init[CLAIM]?.call(host, 4);
    expect(Object.getOwnPropertyDescriptor(host, "kept")).toEqual({ value: 4, writable: true, enumerable: true, configurable: true });
    const existing = { kept: 1 };
    init.call(existing);
    expect(existing.kept).toBe(1);
  });
});
