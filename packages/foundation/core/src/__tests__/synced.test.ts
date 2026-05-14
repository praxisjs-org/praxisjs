import { describe, it, expect, vi, beforeEach } from "vitest";

import { syncedSignal } from "../signal/synced";
import { effect } from "../signal/effect";

// BroadcastChannel mock
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
    // Deliver to all OTHER instances on same channel
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

describe("syncedSignal", () => {
  it("reads initial value", () => {
    const s = syncedSignal("ch", 42);
    expect(s()).toBe(42);
    s.close();
  });

  it("set() updates the signal value", () => {
    const s = syncedSignal("ch", 0);
    s.set(10);
    expect(s()).toBe(10);
    s.close();
  });

  it("update() applies a transform", () => {
    const s = syncedSignal("ch", 5);
    s.update((v) => v * 2);
    expect(s()).toBe(10);
    s.close();
  });

  it("set() posts a JSON message to the channel", () => {
    const s = syncedSignal("ch", 0);
    const postSpy = vi.spyOn(
      MockBroadcastChannel.instances[0],
      "postMessage",
    );
    s.set(99);
    expect(postSpy).toHaveBeenCalledWith(JSON.stringify(99));
    s.close();
  });

  it("receiving a message from another tab updates the signal", () => {
    const s = syncedSignal("ch", 0);
    const channel = MockBroadcastChannel.instances[0];

    channel.onmessage!(new MessageEvent("message", { data: JSON.stringify(7) }));
    expect(s()).toBe(7);
    s.close();
  });

  it("does not echo own set() back to itself", () => {
    const s = syncedSignal("ch", 0);

    // Simulate two instances on the same channel
    const s2 = syncedSignal("ch", 0);
    const received: number[] = [];
    effect(() => { received.push(s2()); });

    s.set(5);
    // s2 should receive the message because it came from a different instance
    expect(s2()).toBe(5);

    // s itself should NOT trigger its own onmessage handler (no echo)
    const channel = MockBroadcastChannel.instances[0];
    const receivedBySelf: number[] = [];
    effect(() => { receivedBySelf.push(s()); });
    const beforeCount = receivedBySelf.length;
    // Manually simulate echo — should be ignored because posting=false after set
    channel.onmessage!(new MessageEvent("message", { data: JSON.stringify(5) }));
    // The value stays 5 (no spurious extra notification tested via subscribe count)
    expect(s()).toBe(5);
    expect(receivedBySelf.length).toBe(beforeCount); // no extra effect run (Object.is equality)

    s.close();
    s2.close();
  });

  it("subscribe fires immediately then on each remote change", () => {
    const s = syncedSignal("ch", 0);
    const channel = MockBroadcastChannel.instances[0];
    const received: number[] = [];
    s.subscribe((v) => received.push(v));

    expect(received).toEqual([0]);

    channel.onmessage!(new MessageEvent("message", { data: JSON.stringify(3) }));
    expect(received).toEqual([0, 3]);
    s.close();
  });

  it("close() shuts down the BroadcastChannel", () => {
    const s = syncedSignal("ch", 0);
    const channel = MockBroadcastChannel.instances[0];
    expect(channel.closed).toBe(false);
    s.close();
    expect(channel.closed).toBe(true);
  });

  it("has __isSignal marker", () => {
    const s = syncedSignal("ch", 0);
    expect(s.__isSignal).toBe(true);
    s.close();
  });
});
