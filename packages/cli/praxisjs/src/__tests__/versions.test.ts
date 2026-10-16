import { afterEach, describe, expect, it, vi } from "vitest";

import { compareVersions, fetchManifest, satisfies, splitRange } from "../versions";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("splitRange", () => {
  it.each([
    ["^1.2.3", { prefix: "^", version: "1.2.3" }],
    ["~0.8.0", { prefix: "~", version: "0.8.0" }],
    ["4.1.0", { prefix: "", version: "4.1.0" }],
    ["^3.0.0-beta.1", { prefix: "^", version: "3.0.0-beta.1" }],
  ])("%s", (range, expected) => {
    expect(splitRange(range)).toEqual(expected);
  });

  it.each(["latest", "workspace:*", ">=1.0.0", "1.x", "^1.2"])("rejects %s", (range) => {
    expect(splitRange(range)).toBeUndefined();
  });
});

describe("compareVersions", () => {
  it.each([
    ["1.0.0", "1.0.0", 0],
    ["1.0.1", "1.0.0", 1],
    ["0.8.0", "0.10.0", -1],
    ["2.0.0", "1.99.99", 1],
    ["1.0.0-beta", "1.0.0", -1],
    ["1.0.0", "1.0.0-beta", 1],
    ["1.0.0-alpha", "1.0.0-beta", -1],
    ["1.0.0-beta", "1.0.0-alpha", 1],
    ["1.0.0-rc", "1.0.0-rc", 0],
  ])("%s vs %s", (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });
});

describe("fetchManifest", () => {
  it("reads the latest dist-tag from the configured registry", async () => {
    vi.stubEnv("npm_config_registry", "https://npm.example.com/");
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.0.3", peerDependencies: { "@morphos/core": "0.1.3", bad: 1 } }),
    });
    vi.stubGlobal("fetch", fetch);

    expect(await fetchManifest("@morphos/inputs")).toEqual({
      version: "1.0.3",
      peerDependencies: { "@morphos/core": "0.1.3" },
    });
    expect(fetch).toHaveBeenCalledWith("https://npm.example.com/%40morphos%2Finputs/latest");
  });

  it("reads an exact version from the public registry by default", async () => {
    vi.stubEnv("npm_config_registry", undefined as unknown as string);
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: "1.0.0" }) });
    vi.stubGlobal("fetch", fetch);

    expect(await fetchManifest("praxisjs", "1.0.0")).toEqual({ version: "1.0.0", peerDependencies: {} });
    expect(fetch).toHaveBeenCalledWith("https://registry.npmjs.org/praxisjs/1.0.0");
  });

  it("ignores a peerDependencies field that is not an object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: "1.0.0", peerDependencies: null }) }),
    );
    expect(await fetchManifest("a")).toEqual({ version: "1.0.0", peerDependencies: {} });
  });

  it("returns undefined for an error status, a missing version or a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));
    expect(await fetchManifest("a")).toBeUndefined();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: 3 }) }));
    expect(await fetchManifest("a")).toBeUndefined();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchManifest("a")).toBeUndefined();
  });
});

describe("satisfies", () => {
  it.each([
    ["1.2.3", "1.2.3", true],
    ["1.2.4", "=1.2.3", false],
    ["0.1.3", "0.1.3", true],
    ["2.3.0", ">=1.0.0", true],
    ["0.9.0", ">= 1.0.0", false],
    ["1.0.1", ">1.0.0", true],
    ["1.0.0", ">1.0.0", false],
    ["1.9.9", "<2.0.0", true],
    ["2.0.0", "<=2.0.0", true],
    ["2.0.1", "<=2.0.0", false],
    ["1.9.0", "^1.2.0", true],
    ["2.0.0", "^1.2.0", false],
    ["0.2.5", "^0.2.0", true],
    ["0.3.0", "^0.2.0", false],
    ["0.0.3", "^0.0.3", true],
    ["0.0.4", "^0.0.3", false],
    ["0.9.0", "^0.x", true],
    ["1.0.0", "^0", false],
    ["1.2.9", "~1.2.0", true],
    ["1.3.0", "~1.2.0", false],
    ["1.9.0", "~1", true],
    ["2.0.0", "~1", false],
    ["1.4.0", "1.x", true],
    ["2.0.0", "1", false],
    ["1.2.7", "1.2.*", true],
    ["1.3.0", "1.2", false],
    ["1.5.0", "1.x.3", true],
    ["2.0.0", ">1", true],
    ["1.9.0", ">1", false],
    ["1.2.9", "<=1.2", true],
    ["1.3.0", "<=1.2", false],
    ["5.0.0", "*", true],
    ["5.0.0", "", true],
    ["5.0.0", "x", true],
    ["1.5.0", ">=1.0.0 <2.0.0", true],
    ["2.5.0", ">=1.0.0 <2.0.0", false],
    ["1.5.0", "1.0.0 - 2.0.0", true],
    ["2.0.1", "1.0.0 - 2.0.0", false],
    ["3.1.0", "^1.0.0 || ^3.0.0", true],
    ["2.1.0", "^1.0.0 || ^3.0.0", false],
    ["2.0.0-beta.1", ">=2.0.0-alpha", true],
    ["1.0.0", "v1.0.0", true],
  ])("%s in %s → %s", (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });

  it.each(["workspace:*", "npm:other@1.0.0", "latest", "^1.0.0 || next"])("cannot judge %s", (range) => {
    expect(satisfies("1.0.0", range)).toBeUndefined();
  });
});
