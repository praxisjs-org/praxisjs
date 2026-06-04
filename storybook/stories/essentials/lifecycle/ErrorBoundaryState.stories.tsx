import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class SafeLoader extends StatefulComponent {
  @State() error: Error | null = null;
  @State() loading = false;

  onError(err: Error) {
    // safety net — called if render() itself throws unexpectedly
    this.error = err;
  }

  async load(shouldFail: boolean) {
    this.loading = true;
    this.error = null;
    await new Promise<void>((r) => setTimeout(r, 600));
    if (shouldFail) {
      this.error = new Error("Network request failed (status 503)");
    }
    this.loading = false;
  }

  onMount() {
    void this.load(true);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:420px">
        <h3 style="margin:0;font-size:1rem">onError — @State + reactive fallback</h3>

        {() => {
          if (this.loading) {
            return (
              <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;font-size:.875rem">
                Loading…
              </div>
            );
          }
          if (this.error) {
            return (
              <div style="display:flex;flex-direction:column;gap:10px;padding:14px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px">
                <p style="margin:0;font-size:.875rem;font-weight:600;color:#dc2626">Something went wrong</p>
                <code style="font-size:.78rem;color:#6b7280">{() => this.error!.message}</code>
                <div style="display:flex;gap:8px">
                  <button
                    style="padding:5px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.82rem"
                    onClick={() => { void this.load(false); }}
                  >
                    Retry
                  </button>
                  <button
                    style="padding:5px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;font-size:.82rem"
                    onClick={() => { void this.load(true); }}
                  >
                    Fail again
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div style="padding:14px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:.875rem;color:#15803d;font-weight:600">
              Data loaded successfully
            </div>
          );
        }}

        <p style="margin:0;font-size:.78rem;color:#aaa;line-height:1.5">
          <code>render()</code> returns a reactive function — when <code>this.error</code> changes,
          only the inner binding updates. <code>onError</code> is the safety net if{" "}
          <code>render()</code> itself throws unexpectedly.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lifecycle/ErrorBoundaryState",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ErrorBoundaryState: Story = {
  name: "onError — @State + reactive fallback",
  render: () => <SafeLoader />,
};
