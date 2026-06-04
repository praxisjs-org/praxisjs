import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class BrokenWidget extends StatefulComponent {
  onError(err: Error) {
    return (
      <div style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px">
        <p style="margin:0;font-size:.875rem;font-weight:600;color:#dc2626">Something went wrong</p>
        <code style="font-size:.78rem;color:#6b7280">{err.message}</code>
      </div>
    );
  }

  render(): never {
    throw new Error("Failed to fetch widget data");
  }
}

@Component()
class WorkingWidget extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px">
        <p style="margin:0;font-size:.875rem;font-weight:600;color:#15803d">Widget loaded</p>
        <p style="margin:0;font-size:.82rem;color:#6b7280">Content renders normally.</p>
      </div>
    );
  }
}

@Component()
class ErrorBoundaryFallbackDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:20px;font-family:sans-serif;max-width:380px">
        <h3 style="margin:0;font-size:1rem">onError — direct fallback</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          <code style="font-size:.75rem;color:#aaa">{"<BrokenWidget />"}</code>
          <BrokenWidget />
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <code style="font-size:.75rem;color:#aaa">{"<WorkingWidget />"}</code>
          <WorkingWidget />
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa;line-height:1.5">
          When <code>render()</code> throws, the node returned by <code>onError</code> is mounted in its place.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lifecycle/ErrorBoundaryFallback",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ErrorBoundaryFallback: Story = {
  name: "onError — direct fallback",
  render: () => <ErrorBoundaryFallbackDemo />,
};
