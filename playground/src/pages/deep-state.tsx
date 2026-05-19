import { StatefulComponent } from "@praxisjs/core";
import { Component, DeepState } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";

interface Config {
  theme: { mode: "light" | "dark"; accent: string };
  fontSize: number;
  notifications: boolean;
}

@Head({ title: "@DeepState — PraxisJS", description: "Deep reactive object state with @DeepState." })
@Route("/deep-state")
@Component()
export default class DeepStatePage extends StatefulComponent {
  @DeepState() config: Config = {
    theme: { mode: "light", accent: "#6d5bbd" },
    fontSize: 16,
    notifications: true,
  };

  @DeepState() tags: string[] = ["praxisjs", "signals"];

  render() {
    return (
      <div class="page">
        <div class="page-hero">
          <h1>@DeepState</h1>
          <p>
            Nested mutations are reactive — no new references needed. Mutate
            objects and arrays directly.
          </p>
        </div>

        <div class="demo-grid">
          <div class="card wide">
            <p class="count-label">config object</p>
            <pre class="code-preview">{() => JSON.stringify(this.config, null, 2)}</pre>
            <div class="controls">
              <button
                onClick={() => {
                  this.config.theme.mode =
                    this.config.theme.mode === "light" ? "dark" : "light";
                }}
              >
                Toggle theme.mode
              </button>
              <button
                class="secondary"
                onClick={() => { this.config.fontSize++; }}
              >
                fontSize++
              </button>
              <button
                class="secondary"
                onClick={() => {
                  this.config.notifications = !this.config.notifications;
                }}
              >
                Toggle notifications
              </button>
            </div>
          </div>

          <div class="card wide">
            <p class="count-label">tags array</p>
            <div class="tag-list">
              {() =>
                this.tags.map((tag, i) => (
                  <span class="tag">
                    {tag}
                    <button
                      class="tag-remove"
                      onClick={() => { this.tags.splice(i, 1); }}
                    >
                      ×
                    </button>
                  </span>
                ))
              }
            </div>
            <button
              class="secondary"
              onClick={() => {
                const next = `tag-${this.tags.length + 1}`;
                this.tags.push(next);
              }}
            >
              push new tag
            </button>
          </div>
        </div>

        <div class="info-box">
          <strong>How it works:</strong> a deep <code>Proxy</code> intercepts
          any write at any depth and increments a version signal. Effects that
          read the field re-run automatically — no <code>this.config = &#123;...this.config&#125;</code>{" "}
          required.
        </div>
      </div>
    );
  }
}
