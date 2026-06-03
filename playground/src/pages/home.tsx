import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Watch, type WatchVals } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { cx, keyframes, Param, ReactiveStylesheet, Stylesheet, Styled } from "@praxisjs/css";

// ─── Keyframe ─────────────────────────────────────────────────────────────────

const countPop = keyframes("count-pop", {
  from: { transform: "scale(1)" },
  "50%": { transform: "scale(1.15)" },
  to:   { transform: "scale(1)" },
});

// ─── Stylesheets ──────────────────────────────────────────────────────────────

class HeroStyles extends Stylesheet {
  $root = this.css({ display: "flex", flexDirection: "column", gap: "10px" });
  $h1   = this.css({
    fontSize: "2.25rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    background: "linear-gradient(90deg, #6d5bbd, #7c6dd6, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: "1.2",
  });
  $p = this.css({ fontSize: "1.05rem", color: "var(--color-text-secondary)", maxWidth: "520px" });
}

class CounterStyles extends ReactiveStylesheet {
  @Param() accent = "#6d5bbd";

  $card = this.css({
    background: "var(--color-bg-elv)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "36px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    boxShadow: "var(--shadow-md)",
    textAlign: "center",
    maxWidth: "320px",
  });

  $value = this.css({
    fontSize: "4.5rem",
    fontWeight: 800,
    lineHeight: "1",
    color: "var(--accent)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
    // Animation runs once on mount; class-swap below retriggers it on each change
    animation: `${countPop} 0.18s ease`,
  });

  // Alternate class used to retrigger the animation without a key prop
  $valueAlt = this.css({
    fontSize: "4.5rem",
    fontWeight: 800,
    lineHeight: "1",
    color: "var(--accent)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
    animation: `${countPop} 0.18s ease reverse`,
  });

  $label = this.css({
    fontSize: "0.78rem",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 600,
    marginTop: "-4px",
  });

  $btnRow = this.css({ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" });

  $swatches = this.css({ display: "flex", gap: "6px", marginTop: "4px" });

  $dot = this.css({
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "transform 0.15s, border-color 0.15s",
    flexShrink: "0",
  }).hover({ transform: "scale(1.25)" });

  $dotActive = this.css({ borderColor: "var(--color-text)", transform: "scale(1.1)" });
}

// ─── Accent palette ───────────────────────────────────────────────────────────

const ACCENTS = ["#6d5bbd", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

@Head({ title: "Home — PraxisJS", description: "A signal-driven frontend framework built with TypeScript." })
@Route("/")
@Component()
export class Home extends StatefulComponent {
  @State() count = 0;
  @State() popAlt = false;

  @Styled(HeroStyles)    $hero!: HeroStyles;
  @Styled(CounterStyles) $counter!: CounterStyles;

  @Watch("count")
  onCountChange(_: WatchVals<this, "count">) {
    this.popAlt = !this.popAlt;
  }

  render() {
    return (
      <div class="page">
        {/* Hero */}
        <div class={this.$hero.$root}>
          <h1 class={this.$hero.$h1}>Hello, PraxisJS</h1>
          <p class={this.$hero.$p}>A signal-driven frontend framework built with TypeScript.</p>
        </div>

        {/* Counter card — ReactiveStylesheet + @Param + keyframes + cx */}
        <div class={this.$counter.$card}>
          <span
            class={() => this.popAlt ? this.$counter.$valueAlt : this.$counter.$value}
          >
            {() => this.count}
          </span>
          <p class={this.$counter.$label}>count</p>

          <div class={this.$counter.$btnRow}>
            <button onClick={() => { this.count++; }}>Increment</button>
            <button class="secondary" onClick={() => { this.count = 0; }}>Reset</button>
          </div>

          {/* Accent picker — @Param() updates --accent on the element, no re-render */}
          <div class={this.$counter.$swatches}>
            {ACCENTS.map((color) => (
              <span
                class={() => cx(
                  this.$counter.$dot,
                  { [this.$counter.$dotActive]: this.$counter.accent === color },
                )}
                style={`background:${color}`}
                onClick={() => { this.$counter.accent = color; }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
}
