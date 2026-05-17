const STORYBOOK_BASE = 'https://storybook.praxisjs.org';

interface StorybookLinkProps {
  story: string;
  label?: string;
}

export function StorybookLink({ story, label = 'Live demo' }: StorybookLinkProps) {
  const href = `${STORYBOOK_BASE}/?path=/story/${story}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose group my-4 flex items-center gap-4 rounded-xl border bg-fd-card px-4 py-3 no-underline transition-all duration-200 hover:bg-fd-accent"
      style={{ borderLeftWidth: '3px', borderLeftColor: '#FF4785', borderColor: 'var(--color-fd-border)' }}
    >
      {/* Storybook bookmark icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M3 2h12v14l-6-4-6 4V2z"
          stroke="#FF4785"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 7.5h5"
          stroke="#FF4785"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#FF4785' }}>
          Storybook
        </div>
        <div className="truncate text-sm font-medium text-fd-foreground">
          {label}
        </div>
      </div>

      {/* External link arrow */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden
        className="shrink-0 text-fd-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        <path
          d="M1 12L12 1M12 1H5M12 1V8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
