import { Stylesheet } from "@praxisjs/css";

// Tokens available as CSS vars (injected by ThemeInstance via @Themed on App):
//   --color-brand, --color-brand-soft
//   --color-bg, --color-bg-alt, --color-bg-elv, --color-bg-soft
//   --color-text, --color-text-secondary, --color-text-muted
//   --color-border, --color-divider
//   --shadow-sm, --shadow-md, --shadow-lg
//   --radius-sm, --radius-md, --radius-lg

// ─── Layout ───────────────────────────────────────────────────────────────────

export class PageStyles extends Stylesheet {
  $page   = this.css({ display: "flex", flexDirection: "column", gap: "40px" });
  $hero   = this.css({ display: "flex", flexDirection: "column", gap: "10px" });
  $heroH1 = this.css({
    fontSize: "2.25rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    background: "linear-gradient(90deg, #6d5bbd, #7c6dd6, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: "1.2",
  });
  $heroP  = this.css({ fontSize: "1.05rem", color: "var(--color-text-secondary)", maxWidth: "520px" });
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export class CardStyles extends Stylesheet {
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

  $cardWide = this.css({
    background: "var(--color-bg-elv)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "36px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    boxShadow: "var(--shadow-md)",
    textAlign: "left",
    maxWidth: "100%",
  });

  $countValue = this.css({
    fontSize: "4.5rem",
    fontWeight: 800,
    lineHeight: "1",
    color: "var(--color-brand)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
  });

  $countLabel = this.css({
    fontSize: "0.78rem",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 600,
    marginTop: "-4px",
  });
}

// ─── Feature grid ─────────────────────────────────────────────────────────────

export class FeatureStyles extends Stylesheet {
  $grid = this.css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  });

  $card = this.css({
    background: "var(--color-bg-elv)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow 0.2s, border-color 0.2s",
  }).hover({ boxShadow: "var(--shadow-md)", borderColor: "var(--color-brand-soft)" });

  $icon  = this.css({ fontSize: "1.5rem", lineHeight: "1" });
  $title = this.css({ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text)" });
  $desc  = this.css({ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: "1.5" });
}

// ─── Demo layouts ─────────────────────────────────────────────────────────────

export class DemoStyles extends Stylesheet {
  $grid = this.css({ display: "flex", flexDirection: "column", gap: "24px" });

  $btnRow = this.css({ display: "flex", gap: "8px", flexWrap: "wrap" });

  $controls = this.css({ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" });

  $infoBox = this.css({
    background: "var(--color-bg-alt)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px 20px",
    fontSize: "0.875rem",
    color: "var(--color-text-secondary)",
    lineHeight: "1.6",
  });

  $syncedText = this.css({
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "var(--color-brand)",
    minHeight: "1.8rem",
    wordBreak: "break-all",
  });
}

// ─── Form inputs ──────────────────────────────────────────────────────────────

export class FormStyles extends Stylesheet {
  $input = this.css({
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-alt)",
    color: "var(--color-text)",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s",
  }).focus({ borderColor: "var(--color-brand)" });

  $codePreview = this.css({
    background: "var(--color-bg-alt)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    fontSize: "0.8rem",
    fontFamily: `ui-monospace, "SFMono-Regular", Menlo, monospace`,
    color: "var(--color-text-secondary)",
    whiteSpace: "pre",
    width: "100%",
    overflowX: "auto",
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export class TagStyles extends Stylesheet {
  $list = this.css({ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "32px", marginBottom: "12px" });

  $tag = this.css({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    background: "var(--color-brand-soft)",
    color: "var(--color-brand)",
    borderRadius: "99px",
    fontSize: "0.8rem",
    fontWeight: 600,
  });
}

// ─── Section helpers ──────────────────────────────────────────────────────────

export class SectionStyles extends Stylesheet {
  $title   = this.css({ marginBottom: "16px" });
  $titleH2 = this.css({ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "6px" });
  $desc    = this.css({ fontSize: "0.875rem", color: "var(--color-text-secondary)" });
  $divider = this.css({ border: "none", borderTop: "1px solid var(--color-divider)", margin: "40px 0" });
}

// ─── Performance: bar chart ───────────────────────────────────────────────────

export class BarChartStyles extends Stylesheet {
  $lazySpacer = this.css({
    height: "480px",
    background: "repeating-linear-gradient(45deg,var(--color-bg-alt),var(--color-bg-alt) 12px,var(--color-bg) 12px,var(--color-bg) 24px)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.875rem",
    color: "var(--color-text-muted)",
    marginBottom: "24px",
  });

  $badge = this.css({
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "4px 10px", background: "var(--color-brand-soft)", color: "var(--color-brand)",
    borderRadius: "99px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "12px",
  });

  $chart = this.css({ display: "flex", flexDirection: "column", gap: "8px" });
  $row   = this.css({ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.8rem" });
  $name  = this.css({ width: "56px", flexShrink: "0", color: "var(--color-text-secondary)", fontSize: "0.75rem" });
  $track = this.css({ flex: "1", height: "8px", background: "var(--color-bg-soft)", borderRadius: "99px", overflow: "hidden" });
  $fill  = this.css({ height: "100%", background: "linear-gradient(90deg, var(--color-brand), #9b90e6)", borderRadius: "99px", transition: "width 0.3s ease" });
  $val   = this.css({ width: "36px", textAlign: "right", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums", color: "var(--color-text-muted)" });
}

// ─── Performance: virtual list ────────────────────────────────────────────────

export class VirtStyles extends Stylesheet {
  $toolbar   = this.css({ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: "1px solid var(--color-divider)" });
  $count     = this.css({ fontSize: "0.8rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });
  $header    = this.css({ display: "flex", alignItems: "center", padding: "8px 16px", background: "var(--color-bg-alt)", borderBottom: "1px solid var(--color-divider)", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" });
  $container = this.css({ height: "480px", overflowY: "auto" });
  $row       = this.css({ display: "flex", alignItems: "center", padding: "0 16px", height: "48px", borderBottom: "1px solid var(--color-divider)", fontSize: "0.875rem", transition: "background 0.1s" }).hover({ background: "var(--color-bg-alt)" });
  $id        = this.css({ width: "60px", flexShrink: "0", fontVariantNumeric: "tabular-nums", color: "var(--color-text-muted)", fontSize: "0.75rem" });
  $name      = this.css({ width: "160px", flexShrink: "0", fontWeight: 500, color: "var(--color-text)" });
  $email     = this.css({ flex: "1", color: "var(--color-text-secondary)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
  $status    = this.css({ width: "80px", flexShrink: "0", fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", textAlign: "center" });
  $statusActive   = this.css({ background: "rgba(22,163,74,0.12)",   color: "#16a34a" });
  $statusInactive = this.css({ background: "rgba(107,114,128,0.12)", color: "#6b7280" });
  $statusPending  = this.css({ background: "rgba(234,179,8,0.12)",   color: "#ca8a04" });
  $score     = this.css({ width: "52px", flexShrink: "0", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--color-brand)", fontWeight: 600 });
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export class BlogStyles extends Stylesheet {
  $list          = this.css({ display: "flex", flexDirection: "column", gap: "14px" });
  $article       = this.css({ padding: "16px 20px", background: "var(--color-bg-elv)", border: "1px solid var(--color-border)", borderRadius: "10px", transition: "box-shadow 0.15s" }).hover({ boxShadow: "var(--shadow-sm)" });
  $articleHeader = this.css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" });
  $articleTitle  = this.css({ margin: "0", fontSize: "1rem", fontWeight: 600 });
  $articleLink   = this.css({ color: "var(--color-text)", textDecoration: "none" }).hover({ color: "var(--color-brand)" });
  $date          = this.css({ fontSize: ".75rem", color: "var(--color-text-muted)" });
  $desc          = this.css({ margin: "0 0 10px", fontSize: ".86rem", color: "var(--color-text-secondary)", lineHeight: "1.5" });
  $tags          = this.css({ display: "flex", gap: "5px" });
  $tag           = this.css({ padding: "2px 8px", borderRadius: "99px", background: "var(--color-brand-soft)", color: "var(--color-brand)", fontSize: ".72rem", fontWeight: 500 });
  $loading       = this.css({ color: "var(--color-text-muted)" });
}
