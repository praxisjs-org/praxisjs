import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Portal } from "@praxisjs/runtime";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Toast {
  id: number;
  message: string;
}

let _toastId = 0;

@Component()
class PortalDemo extends StatefulComponent {
  @State() modalOpen = false;
  @State() toasts: Toast[] = [];

  addToast() {
    const id = ++_toastId;
    this.toasts = [...this.toasts, { id, message: `Toast #${id} — auto-dismissed in 3 s` }];
    setTimeout(() => { this.dismissToast(id); }, 3000);
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:480px">
        <h3 style="margin:0;font-size:1rem">Portal — escape overflow &amp; stacking context</h3>

        {/* Sandbox with overflow:hidden to prove the portal escapes it */}
        <div style="overflow:hidden;border:2px dashed #e5e7eb;border-radius:8px;padding:20px">
          <p style="margin:0 0 12px;font-size:.8rem;color:#9ca3af">
            This box has <code>overflow: hidden</code>. Content mounted via{" "}
            <code>&lt;Portal&gt;</code> escapes it — rendered directly into{" "}
            <code>document.body</code>.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button
              style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { this.modalOpen = true; }}
            >
              Open modal
            </button>
            <button
              style="padding:7px 16px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
              onClick={() => { this.addToast(); }}
            >
              Show toast
            </button>
          </div>
        </div>

        {/* Modal */}
        {() =>
          this.modalOpen && (
            <Portal>
              <div
                style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:50"
                onClick={(e: MouseEvent) => {
                  if (e.target === e.currentTarget) this.modalOpen = false;
                }}
              >
                <div style="background:#fff;border-radius:12px;padding:28px 32px;min-width:320px;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                    <h2 style="margin:0;font-size:1rem;font-weight:700;color:#111827">Portal modal</h2>
                    <button
                      style="border:none;background:none;cursor:pointer;color:#6b7280;font-size:1.1rem"
                      onClick={() => { this.modalOpen = false; }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style="margin:0 0 20px;font-size:.875rem;color:#6b7280;line-height:1.6">
                    Mounted into <code>document.body</code>. This modal is never clipped
                    by its parent's <code>overflow: hidden</code> and always renders above
                    other content via <code>z-index</code>.
                  </p>
                  <div style="display:flex;justify-content:flex-end;gap:8px">
                    <button
                      style="padding:7px 16px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.85rem"
                      onClick={() => { this.modalOpen = false; }}
                    >
                      Cancel
                    </button>
                    <button
                      style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.85rem"
                      onClick={() => { this.modalOpen = false; }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </Portal>
          )
        }

        {/* Toast stack */}
        {() =>
          this.toasts.length > 0 && (
            <Portal>
              <div style="position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:60">
                {() =>
                  this.toasts.map((t) => (
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#1f2937;color:#fff;border-radius:8px;font-size:.85rem;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.25)">
                      <span style="flex:1">{t.message}</span>
                      <button
                        style="border:none;background:none;color:#9ca3af;cursor:pointer;font-size:.9rem"
                        onClick={() => { this.dismissToast(t.id); }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                }
              </div>
            </Portal>
          )
        }

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>Automatic cleanup:</strong> when the reactive condition (<code>this.modalOpen</code>,{" "}
          <code>this.toasts.length &gt; 0</code>) turns false, PraxisJS removes the
          portal content from <code>document.body</code> automatically — no manual teardown needed.
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Portal",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PortalStory: Story = {
  name: "Portal — modal &amp; toast",
  render: () => <PortalDemo />,
};
