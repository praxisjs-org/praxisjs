// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { effect } from "@praxisjs/core/internal";

import { Synced } from "../properties/synced";

// BroadcastChannel mock (same as core test)
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  static byChannel: Map<string, MockBroadcastChannel[]> = new Map();

  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly name: string;
  closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
    if (!MockBroadcastChannel.byChannel.has(name)) {
      MockBroadcastChannel.byChannel.set(name, []);
    }
    MockBroadcastChannel.byChannel.get(name)!.push(this);
  }

  postMessage(data: unknown) {
    MockBroadcastChannel.byChannel.get(this.name)?.forEach((ch) => {
      if (ch !== this && ch.onmessage) {
        ch.onmessage(new MessageEvent("message", { data }));
      }
    });
  }

  close() {
    this.closed = true;
    const list = MockBroadcastChannel.byChannel.get(this.name);
    if (list) {
      const idx = list.indexOf(this);
      if (idx !== -1) list.splice(idx, 1);
    }
    MockBroadcastChannel.instances.splice(
      MockBroadcastChannel.instances.indexOf(this),
      1,
    );
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  MockBroadcastChannel.byChannel = new Map();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});

class TestComponent extends StatefulComponent {
  render() { return null; }
}

function fieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

describe("@Synced decorator", () => {
  it("reads and writes the field reactively", () => {
    const { ctx, run } = fieldCtx("count");
    Synced()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).count = 0;
    run(instance);

    const inst = instance as unknown as { count: number };
    expect(inst.count).toBe(0);
    inst.count = 5;
    expect(inst.count).toBe(5);
  });

  it("uses field name as channel name by default", () => {
    const { ctx, run } = fieldCtx("cart");
    Synced()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).cart = [];
    run(instance);

    expect(MockBroadcastChannel.instances[0].name).toBe("cart");
  });

  it("uses custom channel name when provided", () => {
    const { ctx, run } = fieldCtx("items");
    Synced("my-channel")(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).items = [];
    run(instance);

    expect(MockBroadcastChannel.instances[0].name).toBe("my-channel");
  });

  it("triggers reactive effects on write", () => {
    const { ctx, run } = fieldCtx("value");
    Synced()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).value = 0;
    run(instance);

    const inst = instance as unknown as { value: number };
    const log: number[] = [];
    effect(() => { log.push(inst.value); });

    inst.value = 10;
    expect(log).toEqual([0, 10]);
  });

  it("updates field when a remote message arrives", () => {
    const { ctx, run } = fieldCtx("score");
    Synced()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).score = 0;
    run(instance);

    const inst = instance as unknown as { score: number };
    const channel = MockBroadcastChannel.instances[0];
    channel.onmessage!(new MessageEvent("message", { data: JSON.stringify(42) }));

    expect(inst.score).toBe(42);
  });

  it("two @Synced fields on the same instance share the signalMap entry", () => {
    const { ctx: ctx1, run: run1 } = fieldCtx("a");
    const { ctx: ctx2, run: run2 } = fieldCtx("b");
    Synced()(undefined, ctx1);
    Synced()(undefined, ctx2);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).a = 1;
    (instance as unknown as Record<string, unknown>).b = 2;
    run1(instance);
    run2(instance);

    const inst = instance as unknown as { a: number; b: number };
    inst.a = 10;
    inst.b = 20;
    expect(inst.a).toBe(10);
    expect(inst.b).toBe(20);

    // Both fields have their own BroadcastChannel
    expect(MockBroadcastChannel.instances.length).toBe(2);
    instance.onUnmount?.();
    expect(MockBroadcastChannel.instances.every((ch) => ch.closed)).toBe(true);
  });

  it("reuses the existing signal when the same channel key is registered again on the same instance", () => {
    // Two fields using an identical explicit channel name bind to the same SyncedSignal.
    const { ctx: ctx1, run: run1 } = fieldCtx("alpha");
    const { ctx: ctx2, run: run2 } = fieldCtx("beta");
    Synced("shared-chan")(undefined, ctx1);
    Synced("shared-chan")(undefined, ctx2);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).alpha = "initial";
    (instance as unknown as Record<string, unknown>).beta = "initial";
    run1(instance);
    // second bind for "shared-chan" on the same instance hits the map.has(key) === true branch
    run2(instance);

    const inst = instance as unknown as { alpha: string; beta: string };
    inst.alpha = "changed";
    // both fields share the same underlying signal
    expect(inst.beta).toBe("changed");
    instance.onUnmount?.();
  });

  it("onUnmount closes the BroadcastChannel", () => {
    const { ctx, run } = fieldCtx("data");
    Synced()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).data = null;
    run(instance);

    const channel = MockBroadcastChannel.instances[0];
    expect(channel.closed).toBe(false);
    instance.onUnmount?.();
    expect(channel.closed).toBe(true);
  });
});
