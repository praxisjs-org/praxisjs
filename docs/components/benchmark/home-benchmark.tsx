import Link from "next/link";
import { benchmarks, currentRun, formatDate, homeBenchmarks, ranking } from "@/lib/benchmark-data";
import { cn } from "@/lib/cn";

/** Compact comparison for the home page: overall score bars and a few benchmarks. */
export function HomeBenchmark() {
  const run = currentRun;
  const ranked = ranking(run);
  const maxGap = Math.max(...ranked.map((r) => r.geomean - 1));
  const columns = ranked
    .map((r) => r.framework)
    .filter((f) => !f.baseline)
    .slice(0, 4);
  const rows = homeBenchmarks.flatMap((id) => benchmarks.filter((b) => b.id === id && run.results[id]));
  const m = run.methodology;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-fd-border bg-fd-card p-5 sm:p-6">
        <p className="mb-1 text-sm font-semibold text-fd-foreground">Overall score</p>
        <p className="mb-5 text-[13px] leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
          Geometric mean of each framework&apos;s slowdown vs the fastest entry. 1.00 is the fastest. Lower is better.
        </p>
        <ul className="space-y-2">
          {ranked.map(({ framework, geomean }) => {
            const isPraxis = framework.id === "praxisjs";
            return (
              <li key={framework.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
                <span
                  className={cn(
                    "truncate text-right text-xs",
                    isPraxis ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground",
                  )}
                >
                  {framework.name}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-3.5 min-w-[3px] rounded-r-[4px]",
                      isPraxis
                        ? "bg-violet-600 dark:bg-violet-400"
                        : framework.baseline
                          ? "bg-fd-muted-foreground/25"
                          : "bg-fd-muted-foreground/45",
                    )}
                    style={{
                      width: `${((geomean - 1) / (maxGap || 1)) * 80}%`,
                      backgroundImage: framework.baseline
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
                    {geomean.toFixed(2)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] text-fd-muted-foreground">
          Striped: vanillajs, hand-written DOM code used as the reference.
        </p>
      </div>

      <div className="flex flex-col rounded-2xl border border-fd-border bg-fd-card p-5 sm:p-6">
        <p className="mb-1 text-sm font-semibold text-fd-foreground">Per benchmark</p>
        <p className="mb-5 text-[13px] leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
          Median total time in ms, click to paint. Lower is better.
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-fd-border">
              <th scope="col" className="py-2 pr-2 text-left font-medium text-fd-muted-foreground">
                <span className="sr-only">Benchmark</span>
              </th>
              {columns.map((f) => (
                <th
                  key={f.id}
                  scope="col"
                  className={cn(
                    "px-1 py-2 text-right font-semibold",
                    f.id === "praxisjs" ? "text-violet-600 dark:text-violet-400" : "text-fd-muted-foreground",
                  )}
                >
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-fd-border last:border-0">
                <th scope="row" className="py-2 pr-2 text-left font-normal text-fd-foreground">
                  {b.name}
                </th>
                {columns.map((f) => {
                  const value = run.results[b.id][f.id]?.total;
                  return (
                    <td
                      key={f.id}
                      className={cn(
                        "px-1 py-2 text-right font-mono tabular-nums",
                        f.id === "praxisjs" ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground",
                      )}
                    >
                      {value !== undefined ? value.toFixed(1) : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-auto pt-4 text-[11px] leading-relaxed text-fd-muted-foreground">
          js-framework-benchmark, keyed. {m.browser} {m.headless ? "headless" : ""}, {m.machine},{" "}
          {formatDate(m.date)}.{run.provisional ? " Provisional run." : ""}{" "}
          <Link href="/docs/performance" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            Full results
          </Link>
        </p>
      </div>
    </div>
  );
}
