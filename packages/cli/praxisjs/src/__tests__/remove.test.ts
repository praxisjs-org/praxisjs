import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCancel = vi.fn();
const mockConfirm = vi.fn().mockResolvedValue(true);
const mockIntro = vi.fn();
const mockOutro = vi.fn();
const mockNote = vi.fn();
const mockSelect = vi.fn().mockResolvedValue("claude-skill");
const mockIsCancel = vi.fn().mockReturnValue(false);
const mockExit = vi.fn();
const mockRemovePlugin = vi.fn();
const mockNoteRemovedPlugin = vi.fn();

vi.mock("@clack/prompts", () => ({
  cancel: mockCancel,
  confirm: mockConfirm,
  intro: mockIntro,
  isCancel: mockIsCancel,
  note: mockNote,
  outro: mockOutro,
  select: mockSelect,
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));
vi.mock("picocolors", () => ({
  default: new Proxy({}, { get: () => (s: string) => s }),
}));
vi.mock("node:process", () => ({
  cwd: () => "/project",
  exit: mockExit,
}));
vi.mock("../plugins", () => ({
  removePlugin: mockRemovePlugin,
  noteRemovedPlugin: mockNoteRemovedPlugin,
}));
// PLUGINS deliberately omits "claude-skill" so the display-name lookup misses.
vi.mock("../constants", () => ({
  PLUGINS: [{ name: "none", display: "None", description: "" }],
}));

const { remove } = await import("../commands/ai/remove");

beforeEach(() => {
  mockCancel.mockClear();
  mockConfirm.mockClear().mockResolvedValue(true);
  mockIntro.mockClear();
  mockOutro.mockClear();
  mockNote.mockClear();
  mockSelect.mockClear().mockResolvedValue("claude-skill");
  mockIsCancel.mockClear().mockReturnValue(false);
  mockExit.mockClear();
  mockRemovePlugin.mockClear();
  mockNoteRemovedPlugin.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("remove — display name fallback", () => {
  it("falls back to the raw plugin name when no matching PLUGINS entry is found", async () => {
    await remove();

    const [{ message }] = mockConfirm.mock.calls[0] as [{ message: string }];
    expect(message).toContain("claude-skill");
  });
});
