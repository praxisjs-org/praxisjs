import { PerformanceTab } from "./performance-tab";

import type { DevtoolsPlugin } from "@plugins/types";

export const PerformancePlugin: DevtoolsPlugin = {
  id: "performance",
  label: "Performance",
  component: PerformanceTab,
};
