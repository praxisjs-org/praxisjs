"use client";

import { useState } from "react";
import {
  benchmarksWithData,
  currentRun,
  ranking,
  slowdown,
  type BenchmarkRun,
  type FrameworkEntry,
} from "@/lib/benchmark-data";
import { cn } from "@/lib/cn";

const OVERALL = "overall";

interface Bar {
  framework: FrameworkEntry;
  /** Sort key and bar length. */
  value: number;
  label: string;
  detail: string;
  outlier?: boolean;
}

function overallBars(run: BenchmarkRun): Bar[] {
  return ranking(run).map(({ framework, geomean }) => ({
    framework,
    // Bars show how much slower than the fastest entry, so they start at zero honestly.
    value: geomean - 1,
    label: `${geomean.toFixed(2)}x`,
    detail: `${geomean.toFixed(2)}x the fastest entry, geometric mean of ${benchmarksWithData(run, "cpu").length} benchmarks`,
  }));
}

function benchmarkBars(run: BenchmarkRun, benchmarkId: string): Bar[] {
  return run.frameworks
    .flatMap((framework) => {
      const m = run.results[benchmarkId]?.[framework.id];
      if (!m) return [];
      const factor = slowdown(run, benchmarkId, framework.id) ?? 1;
      const parts = [`${m.total.toFixed(1)} ms total`, `${factor.toFixed(2)}x the fastest`];
      if (m.script !== undefined) parts.push(`${m.script.toFixed(1)} ms script`);
      if (m.outlier) parts.push("outlier in this run");
      return [{ framework, value: m.total, label: `${m.total.toFixed(1)}`, detail: parts.join(" · "), outlier: m.outlier }];
    })
    .sort((a, b) => a.value - b.value);
}

/** Interactive bar chart: overall geometric mean or the total time of one benchmark. */
export function BenchmarkChart({ run = currentRun }: { run?: BenchmarkRun }) {
  const cpu = benchmarksWithData(run, "cpu");
  const [selected, setSelected] = useState(OVERALL);
  const [active, setActive] = useState<string | null>(null);

  const isOverall = selected === OVERALL;
  const bars = isOverall ? overallBars(run) : benchmarkBars(run, selected);
  const max = Math.max(...bars.map((b) => b.value));
  const def = cpu.find((b) => b.id === selected);
  const activeBar = bars.find((b) => b.framework.id === active) ?? bars.find((b) => b.framework.id === "praxisjs");

  return (
    <figure className="not-prose my-6 rounded-xl border border-fd-border bg-fd-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Benchmark">
        {[{ id: OVERALL, name: "overall" }, ...cpu].map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={selected === b.id}
            onClick={() => setSelected(b.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              selected === b.id
                ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "border-fd-border text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
            )}
          >
            {b.name}
          </button>
        ))}
      </div>

      <figcaption className="mb-4">
        <div className="text-sm font-semibold text-fd-foreground">
          {isOverall ? "Overall: geometric mean of slowdowns" : `${def?.name}: total time`}
        </div>
        <div className="text-xs text-fd-muted-foreground">
          {isOverall
            ? "Each framework's time divided by the fastest entry, per benchmark, then averaged. 1.00 = fastest on every benchmark; bar length is the distance from 1.00. Lower is better."
            : `${def?.description}. Median total duration in ms. Lower is better.`}
        </div>
      </figcaption>

      <div className="space-y-1.5" onMouseLeave={() => setActive(null)}>
        {bars.map((bar) => {
          const width = (bar.value / (max || 1)) * 100;
          const isPraxis = bar.framework.id === "praxisjs";
          return (
            <div
              key={bar.framework.id}
              tabIndex={0}
              onMouseEnter={() => setActive(bar.framework.id)}
              onFocus={() => setActive(bar.framework.id)}
              className={cn(
                "grid grid-cols-[6.5rem_1fr] items-center gap-3 rounded-md px-1 py-0.5 outline-none sm:grid-cols-[8.5rem_1fr]",
                active === bar.framework.id && "bg-fd-accent/60",
                "focus-visible:ring-2 focus-visible:ring-fd-ring",
              )}
            >
              <span
                className={cn(
                  "truncate text-right text-xs",
                  isPraxis ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground",
                )}
              >
                {bar.framework.name}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "h-4 min-w-[3px] rounded-r-[4px]",
                    isPraxis
                      ? "bg-violet-600 dark:bg-violet-400"
                      : bar.framework.baseline
                        ? "bg-fd-muted-foreground/25"
                        : "bg-fd-muted-foreground/45",
                  )}
                  style={{
                    width: `${Math.max(width, 0.5) * 0.82}%`,
                    backgroundImage: bar.framework.baseline
                      ? "repeating-linear-gradient(135deg, transparent 0 3px, var(--color-fd-card) 3px 5px)"
                      : undefined,
                  }}
                />
                <span
                  className={cn(
                    "shrink-0 font-mono text-[11px] tabular-nums",
                    isPraxis ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground",
                  )}
                >
                  {bar.label}
                  {bar.outlier ? "*" : ""}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-10 border-t border-fd-border pt-3 text-xs text-fd-muted-foreground" aria-live="polite">
        {activeBar && (
          <>
            <span className="font-semibold text-fd-foreground">
              {activeBar.framework.name} {activeBar.framework.version}
            </span>{" "}
            · {activeBar.detail}
          </>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fd-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-600 dark:bg-violet-400" /> PraxisJS
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-fd-muted-foreground/45" /> other frameworks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm bg-fd-muted-foreground/25"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 2px, var(--color-fd-card) 2px 3px)" }}
          />{" "}
          vanillajs (hand-written DOM)
        </span>
        {bars.some((b) => b.outlier) && <span>* outlier in this run</span>}
      </div>
    </figure>
  );
}
