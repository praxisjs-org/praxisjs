import { describe, it, expect, vi } from "vitest";

// Mock JSX tab components before importing the plugin index files so that
// their @shared/* aliases (only resolved by the Vite build config) are never
// evaluated at test time.
vi.mock("../plugins/components/components-tab", () => ({
  ComponentsTab: class MockComponentsTab {},
}));
vi.mock("../plugins/signals/signals-tab", () => ({
  SignalsTab: class MockSignalsTab {},
}));
vi.mock("../plugins/timeline/timeline-tab", () => ({
  TimelineTab: class MockTimelineTab {},
}));

import { ComponentsPlugin } from "../plugins/components";
import { SignalsPlugin } from "../plugins/signals";
import { TimelinePlugin } from "../plugins/timeline";
import { TYPE_META, FILTERS } from "../plugins/timeline/constants";

describe("ComponentsPlugin", () => {
  it("has id 'components'", () => {
    expect(ComponentsPlugin.id).toBe("components");
  });

  it("has label 'Components'", () => {
    expect(ComponentsPlugin.label).toBe("Components");
  });

  it("exposes a component", () => {
    expect(ComponentsPlugin.component).toBeDefined();
  });
});

describe("SignalsPlugin", () => {
  it("has id 'signals'", () => {
    expect(SignalsPlugin.id).toBe("signals");
  });

  it("has label 'Signals'", () => {
    expect(SignalsPlugin.label).toBe("Signals");
  });

  it("exposes a component", () => {
    expect(SignalsPlugin.component).toBeDefined();
  });
});

describe("TimelinePlugin", () => {
  it("has id 'timeline'", () => {
    expect(TimelinePlugin.id).toBe("timeline");
  });

  it("has label 'Timeline'", () => {
    expect(TimelinePlugin.label).toBe("Timeline");
  });

  it("exposes a component", () => {
    expect(TimelinePlugin.component).toBeDefined();
  });
});

describe("TYPE_META", () => {
  it("contains all TimelineEventType entries", () => {
    expect(TYPE_META["signal:change"].label).toBe("signal");
    expect(TYPE_META["component:render"].label).toBe("render");
    expect(TYPE_META["component:mount"].label).toBe("mount");
    expect(TYPE_META["component:unmount"].label).toBe("unmount");
    expect(TYPE_META["lifecycle"].label).toBe("lifecycle");
    expect(TYPE_META["method:call"].label).toBe("method");
  });

  it("each entry has a cls string", () => {
    for (const meta of Object.values(TYPE_META)) {
      expect(typeof meta.cls).toBe("string");
      expect(meta.cls.length).toBeGreaterThan(0);
    }
  });
});

describe("FILTERS", () => {
  it("first filter is 'all'", () => {
    expect(FILTERS[0].value).toBe("all");
  });

  it("contains expected filter values", () => {
    const values = FILTERS.map((f) => f.value);
    expect(values).toContain("signal:change");
    expect(values).toContain("component:render");
    expect(values).toContain("component:mount");
    expect(values).toContain("lifecycle");
    expect(values).toContain("method:call");
  });

  it("each filter has a non-empty label", () => {
    for (const f of FILTERS) {
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
    }
  });
});
