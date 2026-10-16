import { Callout } from "fumadocs-ui/components/callout";
import {
  benchmarkRepo,
  benchmarksWithData,
  currentRun,
  fastest,
  formatDate,
  ranking,
  slowdown,
  type BenchmarkGroup,
  type BenchmarkRun,
} from "@/lib/benchmark-data";
import { cn } from "@/lib/cn";

const groupTitle: Record<BenchmarkGroup, string> = {
  cpu: "Duration",
  memory: "Memory",
  startup: "Startup and size",
};

function frameworkOrder(run: BenchmarkRun) {
  return ranking(run).map((r) => r.framework);
}

/** One table per benchmark group with data: value and slowdown vs the fastest entry. */
export function BenchmarkTable({ run = currentRun, group = "cpu" }: { run?: BenchmarkRun; group?: BenchmarkGroup }) {
  const rows = benchmarksWithData(run, group);
  if (rows.length === 0) return null;
  const frameworks = frameworkOrder(run);

  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-fd-border">
      <table className="w-full min-w-[44rem] border-collapse text-xs">
        <caption className="sr-only">
          {groupTitle[group]}: median per benchmark, with the slowdown vs the fastest entry
        </caption>
        <thead>
          <tr className="border-b border-fd-border bg-fd-muted/50">
            <th scope="col" className="px-3 py-2 text-left font-semibold text-fd-foreground">
              Benchmark
            </th>
            {frameworks.map((f) => (
              <th
                key={f.id}
                scope="col"
                className={cn(
                  "px-2 py-2 text-right font-semibold",
                  f.id === "praxisjs" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "text-fd-foreground",
                )}
              >
                <div>{f.name}</div>
                <div className="font-normal text-fd-muted-foreground">{f.version}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const best = fastest(run, b.id);
            return (
              <tr key={b.id} className="border-b border-fd-border last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-medium text-fd-foreground">
                  <div className="whitespace-nowrap">{b.name}</div>
                  <div className="font-normal text-fd-muted-foreground">{b.unit}</div>
                </th>
                {frameworks.map((f) => {
                  const m = run.results[b.id]?.[f.id];
                  const factor = slowdown(run, b.id, f.id);
                  const isBest = m !== undefined && !m.outlier && m.total === best;
                  return (
                    <td
                      key={f.id}
                      className={cn(
                        "px-2 py-2 text-right font-mono tabular-nums",
                        f.id === "praxisjs" && "bg-violet-500/5",
                      )}
                    >
                      {m ? (
                        <>
                          <div className={cn(isBest ? "font-bold text-fd-foreground" : "text-fd-foreground/90")}>
                            {m.total.toFixed(1)}
                            {m.outlier ? "*" : ""}
                          </div>
                          <div className="text-[10px] text-fd-muted-foreground">{factor?.toFixed(2)}x</div>
                        </>
                      ) : (
                        <span className="text-fd-muted-foreground">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {group === "cpu" && (
            <tr className="bg-fd-muted/50">
              <th scope="row" className="px-3 py-2 text-left font-semibold text-fd-foreground">
                geometric mean
              </th>
              {ranking(run).map(({ framework, geomean }) => (
                <td
                  key={framework.id}
                  className={cn(
                    "px-2 py-2 text-right font-mono font-semibold tabular-nums text-fd-foreground",
                    framework.id === "praxisjs" && "bg-violet-500/10",
                  )}
                >
                  {geomean.toFixed(2)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      {rows.some((b) => Object.values(run.results[b.id]).some((m) => m.outlier)) && (
        <p className="border-t border-fd-border px-3 py-2 text-[11px] text-fd-muted-foreground">
          * Outlier in this run, left out of the geometric mean.
        </p>
      )}
    </div>
  );
}

/** Script (JS) time where the run reports it. */
export function ScriptTable({ run = currentRun }: { run?: BenchmarkRun }) {
  const rows = benchmarksWithData(run, "cpu").filter((b) =>
    Object.values(run.results[b.id]).some((m) => m.script !== undefined),
  );
  if (rows.length === 0) return null;
  const frameworks = run.frameworks.filter((f) => rows.some((b) => run.results[b.id][f.id]?.script !== undefined));

  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-fd-border">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">Script time, median in ms</caption>
        <thead>
          <tr className="border-b border-fd-border bg-fd-muted/50">
            <th scope="col" className="px-3 py-2 text-left font-semibold text-fd-foreground">
              Script time (ms)
            </th>
            {frameworks.map((f) => (
              <th
                key={f.id}
                scope="col"
                className={cn(
                  "px-3 py-2 text-right font-semibold",
                  f.id === "praxisjs" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "text-fd-foreground",
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
              <th scope="row" className="px-3 py-2 text-left font-medium text-fd-foreground">
                {b.name}
              </th>
              {frameworks.map((f) => {
                const script = run.results[b.id][f.id]?.script;
                return (
                  <td
                    key={f.id}
                    className={cn(
                      "px-3 py-2 text-right font-mono tabular-nums text-fd-foreground",
                      f.id === "praxisjs" && "bg-violet-500/5 font-semibold",
                    )}
                  >
                    {script !== undefined ? script.toFixed(1) : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Machine, browser and run settings. */
export function RunDetails({ run = currentRun }: { run?: BenchmarkRun }) {
  const m = run.methodology;
  const items: [string, string][] = [
    ["Date", formatDate(m.date)],
    ["Suite", `js-framework-benchmark, ${m.table} table`],
    ["Browser", `${m.browser}, ${m.headless ? "headless" : "visible window"}`],
    ["Machine", `${m.machine}, ${m.os}`],
    ["Iterations", `${m.iterations} per benchmark, ${m.statistic} reported`],
    ["Run", `${run.label}${run.provisional ? " (provisional)" : ""}`],
  ];
  return (
    <dl className="not-prose my-6 grid gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="bg-fd-card px-4 py-3">
          <dt className="text-xs text-fd-muted-foreground">{label}</dt>
          <dd className="font-medium text-fd-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shown while the data comes from a provisional run. */
export function ProvisionalNote({ run = currentRun }: { run?: BenchmarkRun }) {
  if (!run.provisional) return null;
  return (
    <Callout type="info" title="Provisional numbers">
      These numbers come from a {run.methodology.headless ? "headless" : ""} run on {formatDate(run.methodology.date)}{" "}
      with {run.methodology.iterations} iterations. They will be replaced by a full run in a visible browser window.
    </Callout>
  );
}

export function BenchmarkRepoLinks() {
  return (
    <ul>
      <li>
        Upstream suite: <a href={benchmarkRepo.upstream}>krausest/js-framework-benchmark</a>
      </li>
      <li>
        PraxisJS entry and raw results: the{" "}
        {benchmarkRepo.url ? (
          <a href={benchmarkRepo.url}>
            <code>{benchmarkRepo.name}</code>
          </a>
        ) : (
          <code>{benchmarkRepo.name}</code>
        )}{" "}
        repository, a clone of the suite with a{" "}
        <code>frameworks/keyed/praxisjs</code> entry and a <code>praxisjs-report/</code> folder
      </li>
    </ul>
  );
}
