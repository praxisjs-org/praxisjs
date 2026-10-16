export { DevTools } from "@/ui/dev-tools";
export type { DevToolsOptions } from "@/ui/dev-tools";

export { Debug, Trace } from "@/decorators";
export type { DebugOptions } from "@/decorators/debug";
export type { TraceOptions } from "@/decorators/trace";

export { Registry } from "@/core/registry";
export type {
  SignalEntry,
  ComponentEntry,
  TimelineEntry,
  HistoryEntry,
  LifecycleEvent,
  TimelineEventType,
} from "@/core/types";
export type { DevtoolsPlugin } from "@/plugins/types";

export { SignalsPlugin } from "@/plugins/signals";
export { ComponentsPlugin } from "@/plugins/components";
export { TimelinePlugin } from "@/plugins/timeline";
export { PerformancePlugin } from "@/plugins/performance";

export { Profiler } from "@/core/profiler";
export type { ProfileSnapshot, OwnerStats } from "@/core/profiler";
