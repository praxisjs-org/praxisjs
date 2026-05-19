// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { resource } from "../async/resource";
import { _clearCache } from "../async/resource-cache";

describe("resource — refetchOnFocus", () => {
  beforeEach(() => { _clearCache(); });

  it("refetches when document becomes visible", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(++call));
    const r = resource(fetcher, { refetchOnFocus: true });
    await vi.waitFor(() => r.status() === "success");
    expect(fetcher).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => r.data() === 2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    r.destroy();
  });

  it("does not refetch when document becomes hidden", async () => {
    const fetcher = vi.fn(() => Promise.resolve(1));
    const r = resource(fetcher, { refetchOnFocus: true });
    await vi.waitFor(() => r.status() === "success");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((res) => setTimeout(res, 10));

    expect(fetcher).toHaveBeenCalledTimes(1);
    r.destroy();
  });

  it("destroy() removes the visibilitychange listener", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(++call));
    const r = resource(fetcher, { refetchOnFocus: true });
    await vi.waitFor(() => r.status() === "success");

    r.destroy();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((res) => setTimeout(res, 10));

    expect(fetcher).toHaveBeenCalledTimes(1); // no refetch after destroy
  });
});
