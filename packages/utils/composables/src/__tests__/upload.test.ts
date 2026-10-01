// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "@praxisjs/core/internal";

import {
  FileSelection,
  DropZone,
  FileUpload,
  FilePreview,
  formatFileSize,
  validateFiles,
  type FileError,
  type UploadItem,
} from "../index";

function makeFile(name: string, size = 10, type = "text/plain"): File {
  return new File([new Uint8Array(size)], name, { type });
}

class FakeXHR {
  static instances: FakeXHR[] = [];
  method = "";
  url = "";
  headers: Record<string, string> = {};
  withCredentials = false;
  body: FormData | null = null;
  status = 0;
  responseText = "";
  aborted = false;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXHR.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  respond(status: number, text = "") {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
}

// ── formatFileSize ────────────────────────────────────────────────────────────

describe("formatFileSize", () => {
  it("formats bytes, KB, MB and GB", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(2 * 1024 ** 3, 0)).toBe("2 GB");
  });

  it("returns 0 B for invalid input", () => {
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(NaN)).toBe("0 B");
  });
});

// ── validateFiles ─────────────────────────────────────────────────────────────

describe("validateFiles", () => {
  it("accepts everything without options", () => {
    const files = [makeFile("a.txt"), makeFile("b.png", 5, "image/png")];
    const { accepted, rejected } = validateFiles(files, 0, {});
    expect(accepted).toEqual(files);
    expect(rejected).toEqual([]);
  });

  it("matches extension, exact mime and wildcard mime tokens", () => {
    const opts = { accept: ".pdf, image/*, text/csv" };
    const pdf = makeFile("Doc.PDF", 1, "");
    const png = makeFile("a.png", 1, "image/png");
    const csv = makeFile("a.csv", 1, "text/csv");
    const exe = makeFile("a.exe", 1, "application/x-msdownload");
    const { accepted, rejected } = validateFiles([pdf, png, csv, exe], 0, opts);
    expect(accepted).toEqual([pdf, png, csv]);
    expect(rejected.map((r) => r.code)).toEqual(["type"]);
  });

  it("accepts an array for accept", () => {
    const { accepted } = validateFiles([makeFile("a.png", 1, "image/png")], 0, { accept: ["image/png"] });
    expect(accepted).toHaveLength(1);
  });

  it("rejects files above maxSize and below minSize", () => {
    const big = makeFile("big.txt", 100);
    const tiny = makeFile("tiny.txt", 1);
    const { rejected } = validateFiles([big, tiny], 0, { maxSize: 50, minSize: 5 });
    expect(rejected.map((r) => r.code)).toEqual(["max-size", "min-size"]);
  });

  it("enforces maxFiles counting already held files", () => {
    const files = [makeFile("a"), makeFile("b"), makeFile("c")];
    const { accepted, rejected } = validateFiles(files, 1, { maxFiles: 2 });
    expect(accepted).toEqual([files[0]]);
    expect(rejected.map((r) => r.code)).toEqual(["max-files", "max-files"]);
  });
});

// ── FileSelection ─────────────────────────────────────────────────────────────

describe("FileSelection", () => {
  type View = {
    files: () => File[];
    errors: () => FileError[];
    add: (f: File[] | null) => void;
    remove: (f: File) => void;
    clear: () => void;
    open: () => void;
  };

  it("starts empty", () => {
    const view = new FileSelection().setup() as unknown as View;
    expect(view.files()).toEqual([]);
    expect(view.errors()).toEqual([]);
  });

  it("replaces the selection in single mode", () => {
    const view = new FileSelection().setup() as unknown as View;
    const a = makeFile("a");
    const b = makeFile("b");
    view.add([a]);
    view.add([b]);
    expect(view.files()).toEqual([b]);
  });

  it("rejects extra files in single mode", () => {
    const view = new FileSelection().setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b")]);
    expect(view.files()).toHaveLength(1);
    expect(view.errors()[0].code).toBe("max-files");
  });

  it("appends in multiple mode up to maxFiles", () => {
    const view = new FileSelection({ maxFiles: 3 }).setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b")]);
    view.add([makeFile("c"), makeFile("d")]);
    expect(view.files().map((f) => f.name)).toEqual(["a", "b", "c"]);
    expect(view.errors()).toHaveLength(1);
  });

  it("keeps the previous file when the new one is rejected", () => {
    const view = new FileSelection({ maxSize: 20 }).setup() as unknown as View;
    const ok = makeFile("ok", 10);
    view.add([ok]);
    view.add([makeFile("big", 100)]);
    expect(view.files()).toEqual([ok]);
    expect(view.errors()[0].code).toBe("max-size");
  });

  it("ignores empty input and calls onFiles with accepted files", () => {
    const onFiles = vi.fn();
    const view = new FileSelection({ multiple: true, onFiles }).setup() as unknown as View;
    view.add(null);
    view.add([]);
    expect(onFiles).not.toHaveBeenCalled();
    const a = makeFile("a");
    view.add([a]);
    expect(onFiles).toHaveBeenCalledWith([a]);
  });

  it("remove and clear update the selection", () => {
    const view = new FileSelection({ multiple: true }).setup() as unknown as View;
    const a = makeFile("a");
    const b = makeFile("b");
    view.add([a, b]);
    view.remove(a);
    expect(view.files()).toEqual([b]);
    view.add([makeFile("c", 1, "")]);
    view.clear();
    expect(view.files()).toEqual([]);
    expect(view.errors()).toEqual([]);
  });

  it("open() creates a file input configured from the options and adds the picked files", () => {
    let input!: HTMLInputElement;
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = original(tag);
      if (tag === "input") {
        input = el as HTMLInputElement;
        vi.spyOn(input, "click").mockImplementation(() => {});
      }
      return el;
    });
    const view = new FileSelection({ accept: [".png", "image/jpeg"], multiple: true }).setup() as unknown as View;
    view.open();
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".png,image/jpeg");
    expect(input.multiple).toBe(true);
    expect(input.click).toHaveBeenCalled();

    const file = makeFile("a.png", 1, "image/png");
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change"));
    expect(view.files()).toEqual([file]);
    vi.restoreAllMocks();
  });
});

describe("FileSelection without accept", () => {
  it("open() leaves the input's accept attribute unset and tolerates an empty dialog", () => {
    let input!: HTMLInputElement;
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = original(tag);
      if (tag === "input") {
        input = el as HTMLInputElement;
        vi.spyOn(input, "click").mockImplementation(() => {});
      }
      return el;
    });
    const view = new FileSelection().setup() as unknown as {
      open: () => void;
      files: () => File[];
    };
    view.open();
    expect(input.accept).toBe("");
    expect(input.multiple).toBe(false);
    input.dispatchEvent(new Event("change"));
    expect(view.files()).toEqual([]);
    vi.restoreAllMocks();
  });
});

// ── DropZone ──────────────────────────────────────────────────────────────────

describe("DropZone", () => {
  type View = {
    files: () => File[];
    errors: () => FileError[];
    dragging: () => boolean;
  };

  function dragEvent(type: string, files: File[] = [], types: string[] = ["Files"]) {
    const e = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(e, "dataTransfer", { value: { files, types } });
    return e;
  }

  it("tracks dragging through nested dragenter/dragleave pairs", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    const view = dz.setup() as unknown as View;
    dz.onMount();

    el.dispatchEvent(dragEvent("dragenter"));
    el.dispatchEvent(dragEvent("dragenter"));
    expect(view.dragging()).toBe(true);
    el.dispatchEvent(dragEvent("dragleave"));
    expect(view.dragging()).toBe(true);
    el.dispatchEvent(dragEvent("dragleave"));
    expect(view.dragging()).toBe(false);
  });

  it("ignores drags that do not carry files", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    const view = dz.setup() as unknown as View;
    dz.onMount();
    const e = dragEvent("dragenter", [], ["text/plain"]);
    el.dispatchEvent(e);
    expect(view.dragging()).toBe(false);
    expect(e.defaultPrevented).toBe(false);
  });

  it("prevents default on dragover so the drop is allowed", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    dz.setup();
    dz.onMount();
    const e = dragEvent("dragover");
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it("adds validated dropped files and stops dragging", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el }, { accept: "image/*", multiple: true });
    const view = dz.setup() as unknown as View;
    dz.onMount();
    const png = makeFile("a.png", 1, "image/png");
    const txt = makeFile("a.txt");

    el.dispatchEvent(dragEvent("dragenter"));
    const drop = dragEvent("drop", [png, txt]);
    el.dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(true);
    expect(view.dragging()).toBe(false);
    expect(view.files()).toEqual([png]);
    expect(view.errors()[0].code).toBe("type");
  });

  it("does not allow drops for dragover events without files", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    dz.setup();
    dz.onMount();
    const e = dragEvent("dragover", [], ["text/plain"]);
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it("ignores events with no dataTransfer and drops without one", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    const view = dz.setup() as unknown as View;
    dz.onMount();
    el.dispatchEvent(new Event("dragenter", { cancelable: true }));
    el.dispatchEvent(new Event("dragover", { cancelable: true }));
    expect(view.dragging()).toBe(false);
    el.dispatchEvent(new Event("drop", { cancelable: true }));
    expect(view.files()).toEqual([]);
  });

  it("dragleave without a matching dragenter keeps dragging false", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    const view = dz.setup() as unknown as View;
    dz.onMount();
    el.dispatchEvent(dragEvent("dragleave"));
    expect(view.dragging()).toBe(false);
  });

  it("onUnmount before onMount is a no-op", () => {
    const dz = new DropZone({ current: document.createElement("div") });
    dz.setup();
    expect(() => { dz.onUnmount(); }).not.toThrow();
  });

  it("does nothing when the ref is empty", () => {
    const dz = new DropZone({ current: null });
    dz.setup();
    expect(() => { dz.onMount(); dz.onUnmount(); }).not.toThrow();
  });

  it("removes listeners on unmount", () => {
    const el = document.createElement("div");
    const dz = new DropZone({ current: el });
    const view = dz.setup() as unknown as View;
    dz.onMount();
    dz.onUnmount();
    el.dispatchEvent(dragEvent("dragenter"));
    expect(view.dragging()).toBe(false);
  });
});

// ── FileUpload ────────────────────────────────────────────────────────────────

describe("FileUpload", () => {
  type View = {
    items: () => UploadItem[];
    errors: () => FileError[];
    uploading: () => boolean;
    progress: () => number;
    add: (f: File[]) => void;
    start: () => void;
    cancel: (id: string) => void;
    retry: (id: string) => void;
    remove: (id: string) => void;
    clear: () => void;
  };

  beforeEach(() => {
    FakeXHR.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads on add with the configured request", () => {
    const up = new FileUpload({
      url: "/api/upload",
      method: "PUT",
      headers: { Authorization: "Bearer x" },
      fieldName: "attachment",
      data: { folder: "docs" },
      withCredentials: true,
    });
    const view = up.setup() as unknown as View;
    const file = makeFile("a.txt");
    view.add([file]);

    const xhr = FakeXHR.instances[0];
    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("/api/upload");
    expect(xhr.headers).toEqual({ Authorization: "Bearer x" });
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.body?.get("attachment")).toBe(file);
    expect(xhr.body?.get("folder")).toBe("docs");
    expect(view.items()[0].status).toBe("uploading");
    expect(view.uploading()).toBe(true);
  });

  it("resolves url, headers and data from functions", () => {
    const up = new FileUpload({
      url: (f) => `/up/${f.name}`,
      headers: () => ({ "X-Token": "t" }),
      data: (f) => ({ name: f.name }),
    });
    const view = up.setup() as unknown as View;
    view.add([makeFile("a.txt")]);
    const xhr = FakeXHR.instances[0];
    expect(xhr.url).toBe("/up/a.txt");
    expect(xhr.headers).toEqual({ "X-Token": "t" });
    expect(xhr.body?.get("name")).toBe("a.txt");
    expect(xhr.body?.get("file")).toBeInstanceOf(File);
  });

  it("reports progress per item and overall", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b")]);
    FakeXHR.instances[0].upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    FakeXHR.instances[1].upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    expect(view.items()[0].progress).toBe(50);
    expect(view.items()[1].progress).toBe(100);
    expect(view.progress()).toBe(75);
  });

  it("ignores non-computable progress events", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].upload.onprogress?.({ lengthComputable: false, loaded: 5, total: 0 });
    expect(view.items()[0].progress).toBe(0);
  });

  it("marks success, parses JSON and calls onSuccess", () => {
    const onSuccess = vi.fn();
    const view = new FileUpload({ url: "/u", onSuccess }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].respond(200, '{"id":7}');
    const item = view.items()[0];
    expect(item.status).toBe("success");
    expect(item.progress).toBe(100);
    expect(item.response).toEqual({ id: 7 });
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
    expect(view.uploading()).toBe(false);
  });

  it("keeps raw text for non-JSON responses", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].respond(201, "ok");
    expect(view.items()[0].response).toBe("ok");
  });

  it("marks HTTP failures and calls onError", () => {
    const onError = vi.fn();
    const view = new FileUpload({ url: "/u", onError }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].respond(500);
    expect(view.items()[0]).toMatchObject({ status: "error", error: "HTTP 500" });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("marks network errors", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].onerror?.();
    expect(view.items()[0]).toMatchObject({ status: "error", error: "Network error" });
  });

  it("respects concurrency and starts queued files as slots free up", () => {
    const view = new FileUpload({ url: "/u", concurrency: 2 }).setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b"), makeFile("c")]);
    expect(FakeXHR.instances).toHaveLength(2);
    expect(view.items().map((i) => i.status)).toEqual(["uploading", "uploading", "pending"]);
    FakeXHR.instances[0].respond(200);
    expect(FakeXHR.instances).toHaveLength(3);
    expect(view.items()[2].status).toBe("uploading");
  });

  it("does not upload until start() when autoStart is false", () => {
    const view = new FileUpload({ url: "/u", autoStart: false }).setup() as unknown as View;
    view.add([makeFile("a")]);
    expect(FakeXHR.instances).toHaveLength(0);
    expect(view.items()[0].status).toBe("pending");
    view.start();
    expect(FakeXHR.instances).toHaveLength(1);
  });

  it("validates files and exposes the rejections", () => {
    const view = new FileUpload({ url: "/u", maxSize: 5 }).setup() as unknown as View;
    view.add([makeFile("big", 100)]);
    expect(view.items()).toEqual([]);
    expect(view.errors()[0].code).toBe("max-size");
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("counts existing items against maxFiles", () => {
    const view = new FileUpload({ url: "/u", maxFiles: 1 }).setup() as unknown as View;
    view.add([makeFile("a")]);
    view.add([makeFile("b")]);
    expect(view.items()).toHaveLength(1);
    expect(view.errors()[0].code).toBe("max-files");
  });

  it("cancel aborts an in-flight upload", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    view.cancel(view.items()[0].id);
    expect(FakeXHR.instances[0].aborted).toBe(true);
    expect(view.items()[0].status).toBe("aborted");
  });

  it("cancel marks a queued upload as aborted so it never starts", () => {
    const view = new FileUpload({ url: "/u", autoStart: false }).setup() as unknown as View;
    view.add([makeFile("a")]);
    view.cancel(view.items()[0].id);
    view.start();
    expect(view.items()[0].status).toBe("aborted");
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("cancel ignores unknown ids and finished items", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    FakeXHR.instances[0].respond(200);
    view.cancel(view.items()[0].id);
    view.cancel("missing");
    expect(view.items()[0].status).toBe("success");
  });

  it("retry ignores unknown ids", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.retry("missing");
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("add ignores empty input", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([]);
    expect(view.items()).toEqual([]);
    expect(view.errors()).toEqual([]);
  });

  it("retry re-uploads failed and aborted items only", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a")]);
    const id = view.items()[0].id;
    view.retry(id);
    expect(FakeXHR.instances).toHaveLength(1);
    FakeXHR.instances[0].respond(500);
    view.retry(id);
    expect(FakeXHR.instances).toHaveLength(2);
    expect(view.items()[0]).toMatchObject({ status: "uploading", progress: 0, error: undefined });
  });

  it("remove aborts and drops the item; clear aborts everything", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b")]);
    view.remove(view.items()[0].id);
    expect(FakeXHR.instances[0].aborted).toBe(true);
    expect(view.items()).toHaveLength(1);
    view.clear();
    expect(FakeXHR.instances[1].aborted).toBe(true);
    expect(view.items()).toEqual([]);
    expect(view.errors()).toEqual([]);
  });

  it("progress is 0 with no items", () => {
    const view = new FileUpload({ url: "/u" }).setup() as unknown as View;
    expect(view.progress()).toBe(0);
  });

  it("onUnmount aborts in-flight requests and stops queueing", () => {
    const up = new FileUpload({ url: "/u", concurrency: 1 });
    const view = up.setup() as unknown as View;
    view.add([makeFile("a"), makeFile("b")]);
    up.onUnmount();
    expect(FakeXHR.instances[0].aborted).toBe(true);
    expect(FakeXHR.instances).toHaveLength(1);
  });
});

// ── FilePreview ───────────────────────────────────────────────────────────────

describe("FilePreview", () => {
  beforeEach(() => {
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("is null without a file", () => {
    const { url } = new FilePreview(() => null).setup() as { url: () => string | null };
    expect(url()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("creates one object URL per file and reuses it", () => {
    const file = signal<File | null>(makeFile("a.png"));
    const { url } = new FilePreview(file).setup() as { url: () => string | null };
    expect(url()).toBe("blob:preview-1");
    expect(url()).toBe("blob:preview-1");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("revokes the previous URL when the file changes", () => {
    const file = signal<File | null>(makeFile("a.png"));
    const { url } = new FilePreview(file).setup() as { url: () => string | null };
    url();
    file.set(makeFile("b.png"));
    expect(url()).toBe("blob:preview-2");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
    file.set(null);
    expect(url()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-2");
  });

  it("revokes the URL on unmount", () => {
    const preview = new FilePreview(() => makeFile("a.png"));
    const { url } = preview.setup() as { url: () => string | null };
    url();
    preview.onUnmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });
});
