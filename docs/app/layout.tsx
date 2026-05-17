import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import { Provider } from '@/components/provider';
import './global.css';

export const metadata: Metadata = {
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
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
