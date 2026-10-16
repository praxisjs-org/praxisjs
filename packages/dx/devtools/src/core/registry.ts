import { EventBus } from "./event-bus";
import { Profiler } from "./profiler";

import type {
  ComponentEntry,
  LifecycleEvent,
  SignalEntry,
  TimelineEntry,
  TimelineEventType,
} from "./types";

const MAX_HISTORY = 20;
const MAX_TIMELINE = 200;

let idCounter = 0;
function uid(): string {
  return `v${(++idCounter).toString()}_${Date.now().toString(36)}`;
}

export class Registry {
  private static _instance: Registry | null = null;

  static get instance(): Registry {
    Registry._instance ??= new Registry();
    return Registry._instance;
  }

  readonly bus = new EventBus();
  readonly profiler = new Profiler();

  private readonly instanceIds = new WeakMap<object, string>();
  private readonly signals = new Map<string, SignalEntry>();
  // Signal ids per component, so unmounting one component drops its signals without scanning all.
  private readonly signalsByComponent = new Map<string, Set<string>>();
  private readonly components = new Map<string, ComponentEntry>();
  private readonly timeline: TimelineEntry[] = [];

  private getInstanceId(instance: object): string {
    if (!this.instanceIds.has(instance)) {
      this.instanceIds.set(instance, uid());
    }
    return this.instanceIds.get(instance) as string;
  }

  registerSignal(
    instance: object,
    key: string,
    value: unknown,
    componentName: string,
  ): void {
    const componentId = this.getInstanceId(instance);
    const id = `${componentId}:${key}`;

    const entry: SignalEntry = {
      id,
      label: key,
      componentId,
      componentName,
      value,
      history: [{ value, timestamp: Date.now() }],
      changedAt: Date.now(),
    };

    this.signals.set(id, entry);
    let ids = this.signalsByComponent.get(componentId);
    if (ids === undefined) {
      ids = new Set();
      this.signalsByComponent.set(componentId, ids);
    }
    ids.add(id);
    this.bus.emit("signal:registered", entry);
  }

  updateSignal(
    instance: object,
    key: string,
    newValue: unknown,
    oldValue: unknown,
  ): void {
    const componentId = this.getInstanceId(instance);
    const id = `${componentId}:${key}`;

    const entry = this.signals.get(id);
    if (!entry) return;

    const now = Date.now();
    entry.history.push({ value: newValue, timestamp: now });
    if (entry.history.length > MAX_HISTORY) entry.history.shift();
    entry.value = newValue;
    entry.changedAt = now;

    this.bus.emit("signal:changed", { entry, oldValue });
    this.pushTimeline({
      type: "signal:change",
      label: `${entry.componentName}.${key}`,
      data: { old: oldValue, new: newValue, signalId: id },
    });
  }

  registerComponent(instance: object, name: string): void {
    const id = this.getInstanceId(instance);

    const entry: ComponentEntry = {
      id,
      name,
      renderCount: 0,
      lastRenderDuration: 0,
      mountedAt: Date.now(),
      status: "mounted",
      lifecycle: [],
    };

    this.components.set(id, entry);
    this.bus.emit("component:registered", entry);
  }

  recordRender(instance: object, duration: number): void {
    const id = this.getInstanceId(instance);
    const entry = this.components.get(id);
    if (!entry) return;

    entry.renderCount++;
    entry.lastRenderDuration = duration;

    this.bus.emit("component:render", { ...entry });
    this.pushTimeline({
      type: "component:render",
      label: `<${entry.name}>`,
      data: {
        componentId: id,
        duration: +duration.toFixed(3),
        renderCount: entry.renderCount,
      },
    });
  }

  recordLifecycle(instance: object, hook: string): void {
    const id = this.getInstanceId(instance);
    const entry = this.components.get(id);
    if (!entry) return;

    const event: LifecycleEvent = { hook, timestamp: Date.now() };
    entry.lifecycle.push(event);

    this.bus.emit("lifecycle", { componentId: id, name: entry.name, hook });

    const type: TimelineEventType =
      hook === "onUnmount"
        ? "component:unmount"
        : hook === "onBeforeMount"
          ? "component:mount"
          : "lifecycle";

    this.pushTimeline({
      type,
      label: `<${entry.name}>.${hook}`,
      data: { componentId: id, hook },
    });

    if (hook === "onUnmount") {
      entry.status = "unmounted";
      this.bus.emit("component:unmount", { ...entry });
      this.components.delete(id);
      for (const sid of this.signalsByComponent.get(id) ?? []) this.signals.delete(sid);
      this.signalsByComponent.delete(id);
    }
  }

  recordMethodCall(
    instance: object,
    method: string,
    args: unknown[],
    result: unknown,
    duration: number,
    componentName: string,
  ): void {
    const componentId = this.getInstanceId(instance);
    this.pushTimeline({
      type: "method:call",
      label: `${componentName}.${method}()`,
      data: {
        componentId,
        args,
        result,
        duration: +duration.toFixed(3),
      },
    });
  }

  getSignals(): SignalEntry[] {
    return [...this.signals.values()];
  }

  getComponents(): ComponentEntry[] {
    return [...this.components.values()];
  }

  getTimeline(): TimelineEntry[] {
    return [...this.timeline];
  }

  getSignalsByComponent(componentId: string): SignalEntry[] {
    const out: SignalEntry[] = [];
    // The index and the signal map are updated together, so every id here has an entry.
    for (const id of this.signalsByComponent.get(componentId) ?? []) out.push(this.signals.get(id) as SignalEntry);
    return out;
  }

  private pushTimeline(data: Omit<TimelineEntry, "id" | "timestamp">): void {
    const entry: TimelineEntry = {
      id: uid(),
      timestamp: Date.now(),
      ...data,
    };

    this.timeline.push(entry);
    if (this.timeline.length > MAX_TIMELINE) this.timeline.shift();

    this.bus.emit("timeline:push", entry);
  }
}
