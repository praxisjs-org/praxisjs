import { describe, it, expect, vi } from "vitest";

import { praxisjs } from "../index";

describe("praxisjs() plugin factory", () => {
  it("returns two plugins by default (core + hmr)", () => {
    const plugins = praxisjs();
    expect(plugins).toHaveLength(2);
  });

  it("returns one plugin when hmr is disabled", () => {
    const plugins = praxisjs({ hmr: false });
    expect(plugins).toHaveLength(1);
  });

  it("core plugin has the correct name", () => {
    const [core] = praxisjs();
    expect(core.name).toBe("praxisjs:core");
  });

  it("core plugin enforces 'pre'", () => {
    const [core] = praxisjs();
    expect(core.enforce).toBe("pre");
  });

  it("hmr plugin has the correct name", () => {
    const [, hmr] = praxisjs();
    expect(hmr.name).toBe("praxisjs:hmr");
  });

  it("hmr plugin enforces 'post'", () => {
    const [, hmr] = praxisjs();
    expect(hmr.enforce).toBe("post");
  });
});

describe("praxisjs:core config()", () => {
  it("sets esbuild target to es2022", () => {
    const [core] = praxisjs();
    const config = (core as unknown as { config: () => unknown }).config();
    expect(config).toEqual({ esbuild: { target: "es2022" } });
  });
});

describe("praxisjs:core transform()", () => {
  type TransformFn = (code: string, id: string) => null | undefined;

  it("returns null for .tsx files when autoImport is enabled", () => {
    const [core] = praxisjs({ autoImport: true });
    const transform = (core as { transform: TransformFn }).transform;
    const result = transform("const x = 1;", "component.tsx");
    expect(result).toBeNull();
  });

  it("returns null for .jsx files when autoImport is enabled", () => {
    const [core] = praxisjs({ autoImport: true });
    const transform = (core as { transform: TransformFn }).transform;
    const result = transform("const x = 1;", "component.jsx");
    expect(result).toBeNull();
  });

  it("returns undefined (no-op) for non-.tsx/.jsx files", () => {
    const [core] = praxisjs({ autoImport: true });
    const transform = (core as { transform: TransformFn }).transform;
    const result = transform("const x = 1;", "module.ts");
    expect(result).toBeUndefined();
  });

  it("returns undefined when autoImport is false", () => {
    const [core] = praxisjs({ autoImport: false });
    const transform = (core as { transform: TransformFn }).transform;
    const result = transform("const x = 1;", "component.tsx");
    expect(result).toBeUndefined();
  });

  it("returns undefined when code already imports @praxisjs/jsx/jsx-runtime", () => {
    const [core] = praxisjs({ autoImport: true });
    const transform = (core as { transform: TransformFn }).transform;
    const code = 'import "@praxisjs/jsx/jsx-runtime"; const x = 1;';
    const result = transform(code, "component.tsx");
    expect(result).toBeUndefined();
  });
});

describe("praxisjs:hmr handleHotUpdate()", () => {
  type HandleHotUpdate = (ctx: { file: string; server: unknown }) => void;

  function makeMockServer() {
    return {
      ws: {
        send: vi.fn(),
      },
    };
  }

  it("sends custom event for .ts files", () => {
    const [, hmr] = praxisjs({ hmr: true });
    const server = makeMockServer();
    (hmr as unknown as { handleHotUpdate: HandleHotUpdate }).handleHotUpdate({
      file: "src/app.ts",
      server,
    });
    expect(server.ws.send).toHaveBeenCalledWith({
      type: "custom",
      event: "praxisjs:component-update",
      data: { file: "src/app.ts" },
    });
  });

  it("sends custom event for .tsx files", () => {
    const [, hmr] = praxisjs({ hmr: true });
    const server = makeMockServer();
    (hmr as unknown as { handleHotUpdate: HandleHotUpdate }).handleHotUpdate({
      file: "src/component.tsx",
      server,
    });
    expect(server.ws.send).toHaveBeenCalledWith({
      type: "custom",
      event: "praxisjs:component-update",
      data: { file: "src/component.tsx" },
    });
  });

  it("does not send event for non-.ts/.tsx files", () => {
    const [, hmr] = praxisjs({ hmr: true });
    const server = makeMockServer();
    (hmr as unknown as { handleHotUpdate: HandleHotUpdate }).handleHotUpdate({
      file: "src/style.css",
      server,
    });
    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("does not send event for .js files", () => {
    const [, hmr] = praxisjs({ hmr: true });
    const server = makeMockServer();
    (hmr as unknown as { handleHotUpdate: HandleHotUpdate }).handleHotUpdate({
      file: "src/utils.js",
      server,
    });
    expect(server.ws.send).not.toHaveBeenCalled();
  });
});
