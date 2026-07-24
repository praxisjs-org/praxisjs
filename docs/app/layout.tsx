import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import { Banner } from 'fumadocs-ui/components/banner';
import Link from 'next/link';
import { Provider } from '@/components/provider';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://praxisjs.org'),
  title: {
    default: 'PraxisJS',
    template: '%s — PraxisJS',
  },
  description: 'Signal-driven frontend framework for TypeScript. Class components with decorators, fine-grained DOM updates, no virtual DOM.',
  icons: { icon: '/icon.svg' },
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${syne.variable} ${inter.className}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Provider>
          <Banner id="morphos-kosmesis-launch" className="gap-2 overflow-hidden border-b border-fd-border bg-fd-background px-3">
            <span className="flex min-w-0 items-center justify-center gap-2.5 text-fd-muted-foreground">
              <span className="hidden shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-violet-600 sm:inline dark:text-violet-400">
                New
              </span>
              <span className="min-w-0 truncate">
                <strong className="font-semibold text-fd-foreground">Morphos</strong> &amp;{' '}
                <strong className="font-semibold text-fd-foreground">Kosmesis</strong>{' '}
                <span className="hidden sm:inline">
                  are here — headless primitives and copy-paste UI components for PraxisJS.
                </span>
                <span className="sm:hidden">are here.</span>
              </span>
              <Link
                href="/docs/ecosystem/ui"
                className="group inline-flex shrink-0 items-center gap-1 font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Explore
                <svg
                  width="10"
                  height="10"
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
            </span>
          </Banner>
          {children}
        </Provider>
      </body>
    </html>
  );
}
