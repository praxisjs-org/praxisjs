import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Stylesheet, Styled } from "@praxisjs/css";

import { PageStyles, CardStyles, DemoStyles, FormStyles, SectionStyles } from "../shared-styles";

// ─── Styles ───────────────────────────────────────────────────────────────────

class ComputedStyles extends Stylesheet {
  $row = this.css({
    display: "flex",
    gap: "16px",
    alignItems: "center",
    width: "100%",
  });

  $fieldGroup = this.css({
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: "1",
  });

  $label = this.css({
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  });

  $sep = this.css({
    fontSize: "1.1rem",
    color: "var(--color-text-muted)",
    marginTop: "20px",
    flexShrink: "0",
  });

  $readonlyValue = this.css({
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--color-brand)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    lineHeight: "1",
    marginBottom: "4px",
  });

  $readonlyLabel = this.css({
    fontSize: "0.78rem",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 600,
  });

  $badge = this.css({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 10px",
    background: "var(--color-brand-soft)",
    color: "var(--color-brand)",
    borderRadius: "99px",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
  });
}

// ─── Temperature converter — writable @Computed with accessor ─────────────────

@Component()
class TemperatureConverter extends StatefulComponent {
  @State() celsius = 0;

  @Computed({
    get(this: TemperatureConverter): number {
      return Math.round((this.celsius * 9) / 5 + 32);
    },
    set(this: TemperatureConverter, value: number) {
      this.celsius = Math.round(((value - 32) * 5) / 9);
    },
  })
  accessor fahrenheit!: number;

  @Styled(ComputedStyles) $s!: ComputedStyles;
  @Styled(FormStyles)     $form!: FormStyles;

  render() {
    return (
      <div class={this.$s.$row}>
        <div class={this.$s.$fieldGroup}>
          <label class={this.$s.$label} for="celsius">Celsius</label>
          <input
            id="celsius"
            type="number"
            class={this.$form.$input}
            value={() => this.celsius}
            onInput={(e: Event) => {
              this.celsius = Number((e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <span class={this.$s.$sep}>⇄</span>
        <div class={this.$s.$fieldGroup}>
          <label class={this.$s.$label} for="fahrenheit">Fahrenheit</label>
          <input
            id="fahrenheit"
            type="number"
            class={this.$form.$input}
            value={() => this.fahrenheit}
            onInput={(e: Event) => {
              this.fahrenheit = Number((e.target as HTMLInputElement).value);
            }}
          />
        </div>
      </div>
    );
  }
}

// ─── BMI calculator — read-only @Computed ─────────────────────────────────────

@Component()
class BmiCalculator extends StatefulComponent {
  @State() weightKg = 70;
  @State() heightCm = 175;

  @Computed()
  get bmi(): number {
    const h = this.heightCm / 100;
    return Math.round((this.weightKg / (h * h)) * 10) / 10;
  }

  @Computed()
  get category(): string {
    if (this.bmi < 18.5) return "Underweight";
    if (this.bmi < 25)   return "Normal weight";
    if (this.bmi < 30)   return "Overweight";
    return "Obese";
  }

  @Styled(ComputedStyles) $s!: ComputedStyles;
  @Styled(FormStyles)     $form!: FormStyles;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:20px;width:100%">
        <div class={this.$s.$row}>
          <div class={this.$s.$fieldGroup}>
            <label class={this.$s.$label} for="weight">Weight (kg)</label>
            <input
              id="weight"
              type="number"
              class={this.$form.$input}
              value={() => this.weightKg}
              onInput={(e: Event) => {
                this.weightKg = Number((e.target as HTMLInputElement).value);
              }}
            />
          </div>
          <div class={this.$s.$fieldGroup}>
            <label class={this.$s.$label} for="height">Height (cm)</label>
            <input
              id="height"
              type="number"
              class={this.$form.$input}
              value={() => this.heightCm}
              onInput={(e: Event) => {
                this.heightCm = Number((e.target as HTMLInputElement).value);
              }}
            />
          </div>
        </div>
        <div style="display:flex;gap:24px;align-items:center">
          <div>
            <div class={this.$s.$readonlyValue}>{() => this.bmi}</div>
            <div class={this.$s.$readonlyLabel}>BMI</div>
          </div>
          <span class={this.$s.$badge}>{() => this.category}</span>
        </div>
      </div>
    );
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

@Head({ title: "@Computed — PraxisJS", description: "Read-only and writable computed properties." })
@Route("/computed")
@Component()
export default class ComputedPage extends StatefulComponent {
  @Styled(PageStyles)    $page!: PageStyles;
  @Styled(CardStyles)    $card!: CardStyles;
  @Styled(DemoStyles)    $demo!: DemoStyles;
  @Styled(SectionStyles) $sec!: SectionStyles;

  render() {
    return (
      <div class={this.$page.$page}>
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>@Computed</h1>
          <p class={this.$page.$heroP}>
            Derive values from reactive state. Use the plain getter form for
            read-only values, or pass <code>{"{ get, set }"}</code> with{" "}
            <code>accessor</code> for a writable computed.
          </p>
        </div>

        <div class={this.$demo.$grid}>
          {/* Writable computed */}
          <div>
            <div class={this.$sec.$title}>
              <h2 class={this.$sec.$titleH2}>Writable computed — <code>accessor</code> form</h2>
              <p class={this.$sec.$desc}>
                Edit either field. The setter converts back to the source signal.
              </p>
            </div>
            <div class={this.$card.$cardWide}>
              <TemperatureConverter />
            </div>
          </div>

          {/* Read-only computed */}
          <div>
            <div class={this.$sec.$title}>
              <h2 class={this.$sec.$titleH2}>Read-only computed — getter form</h2>
              <p class={this.$sec.$desc}>
                BMI and category re-derive automatically from weight and height.
              </p>
            </div>
            <div class={this.$card.$cardWide}>
              <BmiCalculator />
            </div>
          </div>
        </div>

        <div class={this.$demo.$infoBox}>
          <strong>How it works:</strong> <code>@Computed()</code> wraps the
          getter in a lazy signal — it only recomputes when accessed and a
          dependency changed. The writable form (<code>{"{ get, set }"}</code>{" "}
          + <code>accessor</code>) lets TypeScript infer the field as writable
          without any cast.
        </div>
      </div>
    );
  }
}
