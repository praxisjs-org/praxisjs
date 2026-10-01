import { Composable } from "@praxisjs/core";
import { signal, computed } from "@praxisjs/core/internal";
import type { Signal, Computed } from "@praxisjs/shared";

export interface FileValidationOptions {
  /** Comma-separated string or array of `.ext`, `type/subtype` or `type/*` tokens — same syntax as `<input accept>`. */
  accept?: string | string[];
  /** Maximum size per file, in bytes. */
  maxSize?: number;
  /** Minimum size per file, in bytes. */
  minSize?: number;
  /** Maximum number of files held at once. */
  maxFiles?: number;
}

export type FileErrorCode = "type" | "max-size" | "min-size" | "max-files";

export interface FileError {
  file: File;
  code: FileErrorCode;
  message: string;
}

export interface FileSelectionOptions extends FileValidationOptions {
  /** Defaults to `true` when `maxFiles > 1`, otherwise `false` (a new selection replaces the previous one). */
  multiple?: boolean;
  /** Called with the accepted files of every selection. */
  onFiles?: (files: File[]) => void;
}

export type UploadStatus = "pending" | "uploading" | "success" | "error" | "aborted";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100 */
  progress: number;
  response?: unknown;
  error?: string;
}

export interface FileUploadOptions extends FileValidationOptions {
  url: string | ((file: File) => string);
  method?: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Form field that carries the file. Defaults to `"file"`. */
  fieldName?: string;
  /** Extra form fields sent alongside the file. */
  data?: Record<string, string> | ((file: File) => Record<string, string>);
  withCredentials?: boolean;
  /** Maximum simultaneous uploads. Defaults to `3`. */
  concurrency?: number;
  /** Start uploading as soon as files are added. Defaults to `true`. */
  autoStart?: boolean;
  onSuccess?: (item: UploadItem) => void;
  onError?: (item: UploadItem) => void;
}

export function formatFileSize(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? String(value) : value.toFixed(decimals)} ${units[i]}`;
}

function normalizeAccept(accept?: string | string[]): string[] {
  const list = typeof accept === "string" ? accept.split(",") : (accept ?? []);
  return list.map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function matchesAccept(file: File, tokens: string[]): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

function toFileArray(input: FileList | File[] | null | undefined): File[] {
  return input ? Array.from(input) : [];
}

export function validateFiles(
  files: File[],
  currentCount: number,
  options: FileValidationOptions,
): { accepted: File[]; rejected: FileError[] } {
  const tokens = normalizeAccept(options.accept);
  const accepted: File[] = [];
  const rejected: FileError[] = [];

  for (const file of files) {
    if (tokens.length > 0 && !matchesAccept(file, tokens)) {
      rejected.push({ file, code: "type", message: `${file.name}: file type is not allowed` });
    } else if (options.maxSize !== undefined && file.size > options.maxSize) {
      rejected.push({
        file,
        code: "max-size",
        message: `${file.name}: exceeds the ${formatFileSize(options.maxSize)} limit`,
      });
    } else if (options.minSize !== undefined && file.size < options.minSize) {
      rejected.push({
        file,
        code: "min-size",
        message: `${file.name}: is smaller than ${formatFileSize(options.minSize)}`,
      });
    } else if (options.maxFiles !== undefined && currentCount + accepted.length >= options.maxFiles) {
      rejected.push({
        file,
        code: "max-files",
        message: `${file.name}: at most ${String(options.maxFiles)} file(s) allowed`,
      });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

function openFilePicker(accept: string[], multiple: boolean, onPick: (files: File[]) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  if (accept.length > 0) input.accept = accept.join(",");
  input.addEventListener("change", () => { onPick(toFileArray(input.files)); });
  input.click();
}

function createSelection(options: FileSelectionOptions) {
  const multiple = options.multiple ?? (options.maxFiles ?? 1) > 1;
  const validation: FileValidationOptions = {
    ...options,
    maxFiles: multiple ? options.maxFiles : 1,
  };
  const files = signal<File[]>([]);
  const errors = signal<FileError[]>([]);

  const add = (incoming: FileList | File[] | null | undefined): void => {
    const list = toFileArray(incoming);
    if (list.length === 0) return;
    const current = multiple ? files() : [];
    const { accepted, rejected } = validateFiles(list, current.length, validation);
    errors.set(rejected);
    if (accepted.length === 0) return;
    files.set([...current, ...accepted]);
    options.onFiles?.(accepted);
  };

  return {
    files,
    errors,
    add,
    remove: (file: File) => { files.update((list) => list.filter((f) => f !== file)); },
    clear: () => {
      files.set([]);
      errors.set([]);
    },
    open: () => { openFilePicker(normalizeAccept(options.accept), multiple, add); },
  };
}

export class FileSelection extends Composable {
  declare files: File[];
  declare errors: FileError[];
  declare open: () => void;
  declare add: (files: FileList | File[] | null | undefined) => void;
  declare remove: (file: File) => void;
  declare clear: () => void;

  constructor(private readonly options: FileSelectionOptions = {}) {
    super();
  }

  setup() {
    return createSelection(this.options);
  }
}

export class DropZone extends Composable {
  declare files: File[];
  declare errors: FileError[];
  declare dragging: boolean;
  declare open: () => void;
  declare add: (files: FileList | File[] | null | undefined) => void;
  declare remove: (file: File) => void;
  declare clear: () => void;

  private _dragging!: ReturnType<typeof signal<boolean>>;
  private _add!: (files: FileList | File[] | null | undefined) => void;
  private _depth = 0;
  private _el: HTMLElement | null = null;

  constructor(
    private readonly ref: { current: HTMLElement | null },
    private readonly options: FileSelectionOptions = {},
  ) {
    super();
  }

  setup() {
    this._dragging = signal(false);
    const selection = createSelection(this.options);
    this._add = selection.add;
    return { ...selection, dragging: this._dragging };
  }

  private readonly _onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    this._depth++;
    this._dragging.set(true);
  };

  private readonly _onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
  };

  private readonly _onDragLeave = () => {
    this._depth = Math.max(0, this._depth - 1);
    if (this._depth === 0) this._dragging.set(false);
  };

  private readonly _onDrop = (e: DragEvent) => {
    e.preventDefault();
    this._depth = 0;
    this._dragging.set(false);
    this._add(toFileArray(e.dataTransfer?.files));
  };

  onMount() {
    const el = this.ref.current;
    if (!el) return;
    this._el = el;
    el.addEventListener("dragenter", this._onDragEnter);
    el.addEventListener("dragover", this._onDragOver);
    el.addEventListener("dragleave", this._onDragLeave);
    el.addEventListener("drop", this._onDrop);
  }

  onUnmount() {
    const el = this._el;
    if (!el) return;
    el.removeEventListener("dragenter", this._onDragEnter);
    el.removeEventListener("dragover", this._onDragOver);
    el.removeEventListener("dragleave", this._onDragLeave);
    el.removeEventListener("drop", this._onDrop);
    this._el = null;
  }
}

export class FileUpload extends Composable {
  declare items: UploadItem[];
  declare errors: FileError[];
  declare uploading: boolean;
  declare progress: number;
  declare add: (files: FileList | File[] | null | undefined) => void;
  declare start: () => void;
  declare cancel: (id: string) => void;
  declare retry: (id: string) => void;
  declare remove: (id: string) => void;
  declare clear: () => void;

  private readonly _requests = new Map<string, XMLHttpRequest>();
  private _destroyed = false;

  constructor(private readonly options: FileUploadOptions) {
    super();
  }

  setup() {
    const opts = this.options;
    const concurrency = Math.max(1, opts.concurrency ?? 3);
    const items = signal<UploadItem[]>([]);
    const errors = signal<FileError[]>([]);
    let nextId = 0;

    const patch = (id: string, changes: Partial<UploadItem>) => {
      items.update((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));
    };
    const find = (id: string) => items().find((i) => i.id === id);

    const finish = (id: string, changes: Partial<UploadItem>) => {
      this._requests.delete(id);
      patch(id, changes);
      const item = find(id);
      if (item?.status === "success") opts.onSuccess?.(item);
      else if (item?.status === "error") opts.onError?.(item);
      pump();
    };

    const send = (item: UploadItem) => {
      const xhr = new XMLHttpRequest();
      this._requests.set(item.id, xhr);
      patch(item.id, { status: "uploading", progress: 0, error: undefined });

      const url = typeof opts.url === "function" ? opts.url(item.file) : opts.url;
      xhr.open(opts.method ?? "POST", url);
      xhr.withCredentials = opts.withCredentials ?? false;
      const headers = typeof opts.headers === "function" ? opts.headers() : opts.headers;
      for (const [key, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(key, value);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) patch(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let response: unknown = xhr.responseText;
          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            // non-JSON body: keep the raw text
          }
          finish(item.id, { status: "success", progress: 100, response });
        } else {
          finish(item.id, { status: "error", error: `HTTP ${String(xhr.status)}` });
        }
      };
      xhr.onerror = () => { finish(item.id, { status: "error", error: "Network error" }); };
      xhr.onabort = () => { finish(item.id, { status: "aborted" }); };

      const body = new FormData();
      const extra = typeof opts.data === "function" ? opts.data(item.file) : opts.data;
      for (const [key, value] of Object.entries(extra ?? {})) body.append(key, value);
      body.append(opts.fieldName ?? "file", item.file);
      xhr.send(body);
    };

    const pump = () => {
      if (this._destroyed) return;
      let running = items().filter((i) => i.status === "uploading").length;
      for (const item of items()) {
        if (running >= concurrency) break;
        if (item.status === "pending") {
          running++;
          send(item);
        }
      }
    };

    const cancel = (id: string) => {
      const xhr = this._requests.get(id);
      if (xhr) xhr.abort();
      else if (find(id)?.status === "pending") patch(id, { status: "aborted" });
    };

    const abortAll = () => {
      for (const xhr of [...this._requests.values()]) xhr.abort();
    };

    const add = (incoming: FileList | File[] | null | undefined) => {
      const list = toFileArray(incoming);
      if (list.length === 0) return;
      const { accepted, rejected } = validateFiles(list, items().length, opts);
      errors.set(rejected);
      if (accepted.length === 0) return;
      items.update((current) => [
        ...current,
        ...accepted.map((file): UploadItem => ({
          id: `upload-${String(++nextId)}`,
          file,
          status: "pending",
          progress: 0,
        })),
      ]);
      if (opts.autoStart ?? true) pump();
    };

    return {
      items,
      errors,
      uploading: computed(() => items().some((i) => i.status === "uploading")),
      progress: computed(() => {
        const list = items();
        if (list.length === 0) return 0;
        return Math.round(list.reduce((sum, i) => sum + i.progress, 0) / list.length);
      }),
      add,
      start: pump,
      cancel,
      retry: (id: string) => {
        const status = find(id)?.status;
        if (status !== "error" && status !== "aborted") return;
        patch(id, { status: "pending", progress: 0, error: undefined });
        pump();
      },
      remove: (id: string) => {
        cancel(id);
        items.update((list) => list.filter((i) => i.id !== id));
      },
      clear: () => {
        abortAll();
        items.set([]);
        errors.set([]);
      },
    };
  }

  onUnmount() {
    this._destroyed = true;
    for (const xhr of [...this._requests.values()]) xhr.abort();
    this._requests.clear();
  }
}

export class FilePreview extends Composable {
  declare url: string | null;

  private _file: File | null = null;
  private _url: string | null = null;

  constructor(
    private readonly source:
      | Signal<File | null>
      | Computed<File | null>
      | (() => File | null),
  ) {
    super();
  }

  setup() {
    const read = this.source;

    const url = computed<string | null>(() => {
      const file = read();
      if (file === this._file) return this._url;
      this._revoke();
      this._file = file;
      this._url = file ? URL.createObjectURL(file) : null;
      return this._url;
    });

    return { url };
  }

  private _revoke() {
    if (this._url) URL.revokeObjectURL(this._url);
    this._url = null;
    this._file = null;
  }

  onUnmount() {
    this._revoke();
  }
}
