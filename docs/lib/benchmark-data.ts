/**
 * Every benchmark number shown in the docs (Performance section and home page).
 *
 * To publish a new run, replace `currentRun`: update `methodology`, `frameworks` and `results`.
 * Results are keyed by js-framework-benchmark ids, so memory (`2x_`) and startup (`3x_`)
 * benchmarks can be added next to the CPU ones; the pages show every group that has data.
 */

export type BenchmarkGroup = "cpu" | "memory" | "startup";

export interface BenchmarkDef {
  /** js-framework-benchmark id, e.g. `01_run1k`. */
  id: string;
  group: BenchmarkGroup;
  name: string;
  description: string;
  unit: "ms" | "MB" | "kB";
}

export interface FrameworkEntry {
  /** Folder name under `frameworks/keyed/`. */
  id: string;
  name: string;
  version: string;
  /** Hand-written DOM code, shown as the reference line rather than a competitor. */
  baseline?: boolean;
}

export interface Measurement {
  /** Median of the measured iterations. CPU: total duration in ms. */
  total: number;
  /** Median script (JS) time in ms, when reported. */
  script?: number;
  /** Median paint time in ms, when reported. */
  paint?: number;
  /** The value is an outlier for this run; compare the other frameworks directly. */
  outlier?: boolean;
}

export interface BenchmarkRun {
  /** Short label of the run, shown next to the numbers. */
  label: string;
  /** True until the final full run replaces this data. */
  provisional: boolean;
  methodology: {
    date: string;
    table: "keyed";
    browser: string;
    headless: boolean;
    os: string;
    machine: string;
    /** Measured iterations per benchmark (after the runner's warm-up runs). */
    iterations: number;
    statistic: "median";
  };
  frameworks: FrameworkEntry[];
  /** benchmark id -> framework id -> measurement */
  results: Record<string, Record<string, Measurement>>;
  /**
   * Weighted geometric mean from the official results table, per framework id. When absent,
   * the pages compute an unweighted geometric mean of the slowdown vs the fastest entry.
   */
  officialGeomean?: Record<string, number>;
}

export const benchmarkRepo: { name: string; url?: string; upstream: string } = {
  name: "praxisjs-benchmark",
  url: "https://github.com/praxisjs-org/praxisjs-benchmark",
  upstream: "https://github.com/krausest/js-framework-benchmark",
};

export const benchmarks: BenchmarkDef[] = [
  { id: "01_run1k", group: "cpu", name: "create 1k", description: "Create 1,000 rows", unit: "ms" },
  { id: "02_replace1k", group: "cpu", name: "replace 1k", description: "Replace all 1,000 rows", unit: "ms" },
  { id: "03_update10th1k_x16", group: "cpu", name: "update every 10th", description: "Update every 10th row of 1,000 rows", unit: "ms" },
  { id: "04_select1k", group: "cpu", name: "select row", description: "Highlight a row on click", unit: "ms" },
  { id: "05_swap1k", group: "cpu", name: "swap rows", description: "Swap 2 rows in a table of 1,000 rows", unit: "ms" },
  { id: "06_remove-one-1k", group: "cpu", name: "remove row", description: "Remove one row", unit: "ms" },
  { id: "07_create10k", group: "cpu", name: "create 10k", description: "Create 10,000 rows", unit: "ms" },
  { id: "08_create1k-after1k_x2", group: "cpu", name: "append 1k", description: "Append 1,000 rows to a table of 1,000 rows", unit: "ms" },
  { id: "09_clear1k_x8", group: "cpu", name: "clear", description: "Clear a table of 1,000 rows", unit: "ms" },
  { id: "21_ready-memory", group: "memory", name: "ready memory", description: "Memory after page load", unit: "MB" },
  { id: "22_run-memory", group: "memory", name: "run memory", description: "Memory after adding 1,000 rows", unit: "MB" },
  { id: "23_update5-memory", group: "memory", name: "update memory", description: "Memory after updating every 10th row five times", unit: "MB" },
  { id: "25_run-clear-memory", group: "memory", name: "create/clear 1k x5", description: "Memory after creating and clearing 1,000 rows five times", unit: "MB" },
  { id: "26_run-10k-memory", group: "memory", name: "run memory 10k", description: "Memory after adding 10,000 rows", unit: "MB" },
  { id: "41_size-uncompressed", group: "startup", name: "uncompressed size", description: "Uncompressed size of all loaded resources", unit: "kB" },
  { id: "42_size-compressed", group: "startup", name: "compressed size", description: "Compressed size of all loaded resources", unit: "kB" },
  { id: "43_first-paint", group: "startup", name: "first paint", description: "Time to first paint", unit: "ms" },
];

/** Benchmarks shown in the comparison block on the docs home page. */
export const homeBenchmarks = ["01_run1k", "03_update10th1k_x16", "04_select1k", "05_swap1k", "09_clear1k_x8"];

const order = ["praxisjs", "solid", "svelte", "vanillajs", "lit", "vue", "preact-signals", "react-hooks"] as const;

function row(totals: number[], extra: Partial<Record<(typeof order)[number], Partial<Measurement>>> = {}) {
  return Object.fromEntries(order.map((id, i) => [id, { total: totals[i], ...extra[id] }])) as Record<string, Measurement>;
}

export const currentRun: BenchmarkRun = {
  label: "PraxisJS 0.8 from npm",
  provisional: false,
  methodology: {
    date: "2026-10-16",
    table: "keyed",
    browser: "Chrome 155",
    headless: false,
    os: "macOS 27",
    machine: "Apple M3 Pro",
    iterations: 15,
    statistic: "median",
  },
  frameworks: [
    { id: "praxisjs", name: "PraxisJS", version: "runtime 0.8.0" },
    { id: "solid", name: "Solid", version: "1.9.3" },
    { id: "svelte", name: "Svelte", version: "5.42.1" },
    { id: "vue", name: "Vue", version: "3.5.39" },
    { id: "lit", name: "Lit", version: "3.2.0" },
    { id: "preact-signals", name: "Preact + signals", version: "11" },
    { id: "react-hooks", name: "React hooks", version: "19.2" },
    { id: "vanillajs", name: "vanillajs", version: "hand-written", baseline: true },
  ],
  results: {
    "01_run1k": row([24.3, 26.9, 26.1, 24.2, 28.5, 28.2, 32.3, 28.4], {
      praxisjs: { script: 2.7, paint: 21.2 },
      solid: { script: 3.1, paint: 23 },
      svelte: { script: 3.5, paint: 22 },
      vanillajs: { script: 2, paint: 21.6 },
      lit: { script: 5.3, paint: 22.4 },
      vue: { script: 6, paint: 21.4 },
      "preact-signals": { script: 10.7, paint: 21 },
      "react-hooks": { script: 6.3, paint: 21.3 },
    }),
    "02_replace1k": row([27.2, 28.4, 28.9, 25.6, 30.8, 32.2, 41, 34.5], {
      praxisjs: { script: 5, paint: 21.1 },
      solid: { script: 6, paint: 21.6 },
      svelte: { script: 7.1, paint: 21.1 },
      vanillajs: { script: 3.9, paint: 21.3 },
      lit: { script: 8.4, paint: 21.8 },
      vue: { script: 9.7, paint: 21.7 },
      "preact-signals": { script: 19.2, paint: 21.4 },
      "react-hooks": { script: 12.6, paint: 21.4 },
    }),
    "03_update10th1k_x16": row([13.6, 17.5, 15.7, 14, 16, 17.6, 14.9, 20.3], {
      praxisjs: { script: 0.9, paint: 10.9 },
      solid: { script: 1.7, paint: 13.2 },
      svelte: { script: 2, paint: 11.7 },
      vanillajs: { script: 0.7, paint: 11.4 },
      lit: { script: 2.2, paint: 11.7 },
      vue: { script: 3.3, paint: 12.3 },
      "preact-signals": { script: 1.5, paint: 11.5 },
      "react-hooks": { script: 5.4, paint: 12.2 },
    }),
    "04_select1k": row([3.9, 4.6, 7.3, 4.5, 8.2, 5.6, 5.8, 8.1], {
      praxisjs: { script: 0.7, paint: 2.4 },
      solid: { script: 1.2, paint: 2.8 },
      svelte: { script: 3.5, paint: 3 },
      vanillajs: { script: 0.6, paint: 2.9 },
      lit: { script: 3.4, paint: 3.3 },
      vue: { script: 2, paint: 3 },
      "preact-signals": { script: 2.4, paint: 2.8 },
      "react-hooks": { script: 3.8, paint: 3 },
    }),
    "05_swap1k": row([15.7, 17.3, 17.9, 15.9, 22, 18.3, 20.7, 117.1], {
      praxisjs: { script: 0.6, paint: 13.1 },
      solid: { script: 1.5, paint: 14 },
      svelte: { script: 2, paint: 13.8 },
      vanillajs: { script: 0.1, paint: 13.6 },
      lit: { script: 2.3, paint: 17.4 },
      vue: { script: 2.2, paint: 14 },
      "preact-signals": { script: 3.8, paint: 15 },
      "react-hooks": { script: 24.1, paint: 89.8 },
    }),
    "06_remove-one-1k": row([13.7, 14.7, 14.2, 13.4, 15.4, 16.9, 14.7, 15.8], {
      praxisjs: { script: 0.5, paint: 11.9 },
      solid: { script: 0.6, paint: 12.7 },
      svelte: { script: 0.9, paint: 12.2 },
      vanillajs: { script: 0.5, paint: 12.1 },
      lit: { script: 1.2, paint: 13.1 },
      vue: { script: 3, paint: 12.6 },
      "preact-signals": { script: 1.4, paint: 12.3 },
      "react-hooks": { script: 1.7, paint: 13 },
    }),
    "07_create10k": row([258.7, 271.8, 273.9, 250.5, 293.2, 300.2, 350.7, 444.6], {
      praxisjs: { script: 25.5, paint: 225.1 },
      solid: { script: 26.9, paint: 236.1 },
      svelte: { script: 29.4, paint: 234.2 },
      vanillajs: { script: 19.2, paint: 222.4 },
      lit: { script: 45.1, paint: 237.9 },
      vue: { script: 46.9, paint: 244.7 },
      "preact-signals": { script: 98.6, paint: 242.6 },
      "react-hooks": { script: 196.7, paint: 236.3 },
    }),
    "08_create1k-after1k_x2": row([29, 30.5, 30.1, 28.1, 34, 32.8, 38.4, 34.2], {
      praxisjs: { script: 2.9, paint: 24.9 },
      solid: { script: 3.5, paint: 25.7 },
      svelte: { script: 3.7, paint: 25.4 },
      vanillajs: { script: 2, paint: 25 },
      lit: { script: 5.9, paint: 27 },
      vue: { script: 6.1, paint: 25.1 },
      "preact-signals": { script: 11.2, paint: 25.6 },
      "react-hooks": { script: 7.7, paint: 25.4 },
    }),
    "09_clear1k_x8": row([12.6, 14.7, 14.1, 11.6, 18.1, 17.8, 19.9, 22.6], {
      praxisjs: { script: 10.1, paint: 1.4 },
      solid: { script: 11.7, paint: 1.3 },
      svelte: { script: 11.6, paint: 1.2 },
      vanillajs: { script: 9.1, paint: 1.2 },
      lit: { script: 15.3, paint: 1.9 },
      vue: { script: 14.8, paint: 1.8 },
      "preact-signals": { script: 17, paint: 1.5 },
      "react-hooks": { script: 20, paint: 1.5 },
    }),
    "21_ready-memory": row([0.69, 0.6, 0.66, 0.56, 0.71, 0.87, 0.69, 1.18]),
    "22_run-memory": row([2.73, 2.68, 2.88, 1.87, 2.8, 3.89, 4.9, 4.39]),
    "25_run-clear-memory": row([0.92, 0.77, 0.98, 0.64, 0.88, 1.19, 8.98, 1.98]),
    "41_size-uncompressed": row([31.2, 11.5, 26.6, 11.3, 22.1, 64.3, 23.3, 190.3]),
    "42_size-compressed": row([10.3, 4.5, 9.7, 2.5, 7.3, 23.3, 8.3, 51.4]),
    "43_first-paint": row([81.5, 60.4, 86.8, 61.8, 70.7, 122.2, 78.4, 278.5]),
  },
};

/** Benchmarks of a group that have results in the run, in table order. */
export function benchmarksWithData(run: BenchmarkRun, group: BenchmarkGroup): BenchmarkDef[] {
  return benchmarks.filter((b) => b.group === group && run.results[b.id] !== undefined);
}

/** Lowest total for a benchmark, ignoring outliers. */
export function fastest(run: BenchmarkRun, benchmarkId: string): number {
  const values = Object.values(run.results[benchmarkId] ?? {})
    .filter((m) => !m.outlier)
    .map((m) => m.total);
  return Math.min(...values);
}

/** Slowdown of a framework vs the fastest entry of a benchmark (1.00 = fastest). */
export function slowdown(run: BenchmarkRun, benchmarkId: string, frameworkId: string): number | undefined {
  const m = run.results[benchmarkId]?.[frameworkId];
  if (!m) return undefined;
  return m.total / fastest(run, benchmarkId);
}

/**
 * Geometric mean of the CPU slowdowns (outliers left out), or the official value when the run
 * provides it.
 */
export function geomean(run: BenchmarkRun, frameworkId: string): number {
  const official = run.officialGeomean?.[frameworkId];
  if (official !== undefined) return official;
  const factors = benchmarksWithData(run, "cpu")
    .filter((b) => !run.results[b.id][frameworkId]?.outlier)
    .map((b) => slowdown(run, b.id, frameworkId))
    .filter((f): f is number => f !== undefined);
  return Math.exp(factors.reduce((sum, f) => sum + Math.log(f), 0) / factors.length);
}

/** Frameworks sorted by geometric mean, fastest first. */
export function ranking(run: BenchmarkRun): { framework: FrameworkEntry; geomean: number }[] {
  return run.frameworks
    .map((framework) => ({ framework, geomean: geomean(run, framework.id) }))
    .sort((a, b) => a.geomean - b.geomean);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
