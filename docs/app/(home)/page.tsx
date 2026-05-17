import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  openGraph: {
    images: "/og/home/image.png",
  },
};

const PRINCIPLES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 6v4l2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 3.5L6 6M16.5 3.5L14 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Render once, update precisely",
    body: "render() runs exactly once on mount. Every subsequent update targets only the DOM nodes that subscribed to a changed signal — nothing more.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect
          x="3"
          y="5"
          width="14"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 9h2m0 0v4m0-4h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="9" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Reactivity you can read",
    body: "@State, @Watch and @Computed sit directly on class fields. Every reactive dependency is a decorator you can see, rename, or delete — no implicit tracking.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M10 3L17 7v6l-7 4-7-4V7l7-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 3v14M3 7l7 4 7-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "No reconciler, no diff",
    body: "There is no virtual DOM tree to compare. A signal change triggers a direct DOM write on the exact node bound to it. The rest of the page is untouched.",
  },
];

const STEPS = [
  {
    n: "01",
    label: "Declare",
    title: "Annotate fields with decorators",
    body: "@State, @Prop, @Resource — each one wraps a class field in a reactive signal. No store setup, no context providers, no boilerplate.",
    code: "@State() count = 0",
  },
  {
    n: "02",
    label: "Bind",
    title: "Wrap expressions in arrow functions",
    body: "{() => this.count} subscribes that DOM node to the signal. Static reads like {this.count} are safe too — they snapshot the value at render time.",
    code: "<p>{() => this.count}</p>",
  },
  {
    n: "03",
    label: "Update",
    title: "Only subscribed nodes re-evaluate",
    body: "Assign a new value. The signal notifies its subscribers. Only those DOM nodes update. render() stays idle. No tree traversal, no component re-run.",
    code: "this.count++",
  },
];

const QUICK_START = [
  {
    cmd: "npm create praxisjs@latest",
    label: "Scaffold",
    desc: "Creates a new project with TypeScript, Vite, JSX transform, and HMR pre-configured.",
  },
  {
    cmd: "cd my-app && npm install",
    label: "Install",
    desc: "PraxisJS has zero runtime dependencies. The install is fast.",
  },
  {
    cmd: "npm run dev",
    label: "Run",
    desc: "Vite starts the dev server. Open the browser and start editing your first component.",
  },
];

const FOOTER_LINKS = [
  {
    group: "Learn",
    links: [
      { label: "Introduction", href: "/docs/guide/introduction" },
      { label: "Quick start", href: "/docs/guide/getting-started" },
      { label: "Components", href: "/docs/essentials/components" },
      { label: "Reactivity", href: "/docs/essentials/reactivity" },
    ],
  },
  {
    group: "Reference",
    links: [
      { label: "Decorators", href: "/docs/decorators" },
      { label: "Composables", href: "/docs/composables" },
      { label: "Packages", href: "/docs/packages" },
      { label: "Changelog", href: "/docs/changelog" },
    ],
  },
  {
    group: "Ecosystem",
    links: [
      { label: "Router", href: "/docs/ecosystem/router" },
      { label: "Store", href: "/docs/ecosystem/store" },
      { label: "Devtools", href: "/docs/tooling/devtools" },
      { label: "Vite plugin", href: "/docs/tooling/vite-plugin" },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <main className="relative overflow-hidden">
        {/* Background dot grid */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(261 40% 55% / 0.11) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* ── Hero ── */}
        <section className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center px-6 py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 sm:left-1/4"
            style={{
              background:
                "radial-gradient(circle, hsl(261 78% 65% / 0.12) 0%, transparent 65%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-6xl">
            <div className="flex flex-col justify-center lg:max-w-2xl">
              {/* Logo + name + install */}
              <div className="mb-7 flex flex-wrap items-center gap-4">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-2xl"
                    style={{
                      background:
                        "radial-gradient(circle, hsl(261 78% 72% / 0.5) 0%, transparent 70%)",
                    }}
                  />
                  <svg
                    width="52"
                    height="52"
                    viewBox="0 0 1024 1024"
                    fill="none"
                    aria-hidden
                    className="relative"
                  >
                    <defs>
                      <linearGradient
                        id="logo-g"
                        x1="512"
                        y1="40"
                        x2="512"
                        y2="983"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#A78BFA" />
                        <stop offset="1" stopColor="#3B1FA3" />
                      </linearGradient>
                    </defs>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M605.411 445.66L641.322 498.293L641.342 498.278L697.538 578.57L742.673 512.806L512.5 178.878L281.327 512.806L512.5 848.182L603.519 715.561L650.559 782.134L512.701 983L187 510.478L512.701 40L837 510.478L698.206 712.709L668.895 671.104L604.033 578.775L512 712.504L373.199 511.5L512.233 309.092L584.13 414.469L536.746 480.456L513.69 445.66L466.305 511.5L512.166 577.425L556.48 513.91L605.411 445.66Z"
                      fill="url(#logo-g)"
                    />
                  </svg>
                </div>
                <span
                  className="text-2xl font-bold tracking-tight text-fd-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  PraxisJS
                </span>
                <span className="h-5 w-px bg-fd-border" />
                <div className="flex items-center gap-2 font-mono text-[12px]">
                  <span className="select-none text-violet-400">❯</span>
                  <span className="text-fd-muted-foreground">npm create </span>
                  <span className="text-fd-foreground">praxisjs@latest</span>
                </div>
              </div>

              {/* Headline */}
              <h1
                className="mb-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.2rem] lg:text-[4rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="text-fd-foreground">Signal-driven </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, hsl(261 68% 55%) 0%, hsl(261 78% 68%) 100%)",
                  }}
                >
                  frontend
                </span>
                <br className="hidden sm:block" />{" "}
                <span className="text-fd-foreground">framework.</span>
              </h1>

              {/* Tagline */}
              <p className="mb-8 text-base leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80 sm:max-w-sm">
                Class components with TC39 decorators. Fine-grained signals
                update only the exact DOM nodes they're bound to — no virtual
                DOM, no diffing.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/docs/guide/getting-started"
                  className="group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-[0.97] dark:bg-violet-500 dark:hover:bg-violet-600"
                >
                  Get started
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path
                      d="M1 6h10M6.5 1.5l4.5 4.5-4.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center rounded-xl border border-fd-border bg-fd-background px-5 py-2.5 text-sm font-semibold text-fd-foreground transition-all hover:border-violet-300 hover:text-violet-700 active:scale-[0.97] dark:hover:border-violet-700 dark:hover:text-violet-300"
                >
                  Browse docs
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Design principles ── */}
        <section className="relative z-10 border-t border-fd-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-xl">
              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                Design principles
              </p>
              <h2
                className="text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The ideas behind every decision.
              </h2>
            </div>

            <div className="grid gap-px bg-fd-border sm:grid-cols-3">
              {PRINCIPLES.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="flex flex-col gap-5 bg-fd-background p-8"
                >
                  <div className="text-violet-500 dark:text-violet-400">
                    {icon}
                  </div>
                  <div>
                    <h3
                      className="mb-2 text-[0.95rem] font-semibold tracking-tight text-fd-foreground"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How reactivity works ── */}
        <section className="relative z-10 border-t border-fd-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-xl">
              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                How it works
              </p>
              <h2
                className="text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Three steps. No magic.
              </h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ n, label, title, body, code }) => (
                <div key={n} className="flex flex-col">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 font-mono text-[11px] font-bold text-white dark:bg-violet-500">
                      {n}
                    </span>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-fd-muted-foreground">
                      {label}
                    </span>
                  </div>
                  <h3
                    className="mb-3 text-[0.95rem] font-semibold tracking-tight text-fd-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
                    {body}
                  </p>
                  <div className="mt-auto inline-flex self-start rounded-lg border border-fd-border bg-fd-muted px-3 py-2 font-mono text-[12px] text-violet-600 dark:text-violet-400">
                    {code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Start ── */}
        <section className="relative z-10 border-t border-fd-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-xl">
              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                Quick start
              </p>
              <h2
                className="mb-3 text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Up and running in minutes.
              </h2>
              <p className="text-sm leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
                The CLI scaffolds a complete project — TypeScript, Vite, JSX
                transform, decorator support, and HMR all pre-configured.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {QUICK_START.map(({ cmd, label, desc }, i) => (
                <div
                  key={label}
                  className="group relative rounded-2xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-violet-300 dark:hover:border-violet-800"
                >
                  {/* Step number */}
                  <span className="mb-5 block font-mono text-[11px] font-bold uppercase tracking-widest text-fd-muted-foreground">
                    {String(i + 1).padStart(2, "0")} — {label}
                  </span>

                  {/* Command */}
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-fd-muted px-3 py-2.5 font-mono text-[12px]">
                    <span className="select-none text-fd-muted-foreground">
                      $
                    </span>
                    <span className="text-violet-600 dark:text-violet-400">
                      {cmd}
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/docs/guide/getting-started"
                className="group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-[0.97] dark:bg-violet-500 dark:hover:bg-violet-600"
              >
                Read the full guide
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M1 6h10M6.5 1.5l4.5 4.5-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                href="https://github.com/praxisjs-org/praxisjs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-fd-border bg-fd-background px-5 py-2.5 text-sm font-semibold text-fd-foreground transition-all hover:border-violet-300 hover:text-violet-700 active:scale-[0.97] dark:hover:border-violet-700 dark:hover:text-violet-300"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-fd-border bg-fd-background px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
            {/* Brand */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 1024 1024"
                  fill="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient
                      id="footer-logo-g"
                      x1="512"
                      y1="40"
                      x2="512"
                      y2="983"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#A78BFA" />
                      <stop offset="1" stopColor="#3B1FA3" />
                    </linearGradient>
                  </defs>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M605.411 445.66L641.322 498.293L641.342 498.278L697.538 578.57L742.673 512.806L512.5 178.878L281.327 512.806L512.5 848.182L603.519 715.561L650.559 782.134L512.701 983L187 510.478L512.701 40L837 510.478L698.206 712.709L668.895 671.104L604.033 578.775L512 712.504L373.199 511.5L512.233 309.092L584.13 414.469L536.746 480.456L513.69 445.66L466.305 511.5L512.166 577.425L556.48 513.91L605.411 445.66Z"
                    fill="url(#footer-logo-g)"
                  />
                </svg>
                <span
                  className="font-bold tracking-tight text-fd-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  PraxisJS
                </span>
              </div>
              <p className="mb-6 max-w-56 text-[13px] leading-relaxed text-fd-muted-foreground dark:text-fd-foreground/80">
                Signal-driven frontend framework for TypeScript. Zero runtime
                dependencies.
              </p>
              <p className="font-mono text-[11px] text-fd-muted-foreground">
                MIT License · © {new Date().getFullYear()} Mateus Martins
              </p>
            </div>

            {/* Link groups */}
            {FOOTER_LINKS.map(({ group, links }) => (
              <div key={group}>
                <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-widest text-fd-foreground">
                  {group}
                </p>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[13px] text-fd-muted-foreground transition-colors hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
