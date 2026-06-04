import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface RemoteCardProps {
  attempt: number;
  onFail: (err: Error) => void;
}

@Component()
class RemoteCard extends StatelessComponent<RemoteCardProps> {
  onError(err: Error) {
    this.props.onFail(err);
    return null;
  }

  render() {
    if (this.props.attempt % 2 !== 0) {
      throw new Error(`Connection refused (attempt ${this.props.attempt})`);
    }
    return (
      <div style="padding:14px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-family:sans-serif">
        <p style="margin:0;font-size:.875rem;font-weight:600;color:#15803d">
          Loaded on attempt {this.props.attempt}
        </p>
      </div>
    );
  }
}

@Component()
class ErrorBoundaryRetryDemo extends StatefulComponent {
  @State() failed = false;
  @State() errorMsg = "";
  @State() attempts = 2; // even → starts in success state

  handleFail(err: Error) {
    this.failed = true;
    this.errorMsg = err.message;
  }

  breakIt() {
    this.attempts++; // even → odd, will fail on next mount
    this.failed = false;
  }

  retry() {
    this.attempts++; // odd → even, will succeed on next mount
    this.failed = false;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:400px">
        <h3 style="margin:0;font-size:1rem">onError — callback to parent + retry</h3>

        {() => !this.failed
          ? (
            <div style="display:flex;flex-direction:column;gap:10px">
              <RemoteCard
                attempt={this.attempts}
                onFail={(e) => { this.handleFail(e); }}
              />
              <button
                style="align-self:start;padding:5px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;font-size:.82rem"
                onClick={() => { this.breakIt(); }}
              >
                Break it
              </button>
            </div>
          )
          : (
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px">
              <p style="margin:0;font-size:.875rem;font-weight:600;color:#dc2626">Failed</p>
              <code style="font-size:.78rem;color:#6b7280">{() => this.errorMsg}</code>
              <button
                style="align-self:start;padding:5px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.82rem"
                onClick={() => { this.retry(); }}
              >
                Retry
              </button>
            </div>
          )
        }

        <p style="margin:0;font-size:.78rem;color:#aaa;line-height:1.5">
          Even attempts succeed, odd fail. <code>onError</code> returns <code>null</code> and
          calls a prop callback — the parent drives recovery.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lifecycle/ErrorBoundaryRetry",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ErrorBoundaryRetry: Story = {
  name: "onError — callback to parent + retry",
  render: () => <ErrorBoundaryRetryDemo />,
};
