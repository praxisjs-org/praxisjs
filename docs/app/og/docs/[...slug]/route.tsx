import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;

// ── Logo as SVG data URL (single colour, Satori-safe) ────────────────────────
const LOGO_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M605.411 445.66L641.322 498.293L641.342 498.278L697.538 578.57L742.673 512.806L512.5 178.878L281.327 512.806L512.5 848.182L603.519 715.561L650.559 782.134L512.701 983L187 510.478L512.701 40L837 510.478L698.206 712.709L668.895 671.104L604.033 578.775L512 712.504L373.199 511.5L512.233 309.092L584.13 414.469L536.746 480.456L513.69 445.66L466.305 511.5L512.166 577.425L556.48 513.91L605.411 445.66Z"
      fill="#A78BFA"/>
  </svg>`,
)}`;

// ── Font cache — fetched once across all pages in the same build ──────────────
let fonts: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFonts() {
  if (fonts) return fonts;

  const [regularCss, boldCss] = await Promise.all([
    fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then((r) => r.text()),
    fetch('https://fonts.googleapis.com/css2?family=Inter:wght@700', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then((r) => r.text()),
  ]);

  const toUrl = (css: string) => css.match(/url\(([^)]+)\)/)?.[1] ?? '';

  const [regular, bold] = await Promise.all([
    fetch(toUrl(regularCss)).then((r) => r.arrayBuffer()),
    fetch(toUrl(boldCss)).then((r) => r.arrayBuffer()),
  ]);

  fonts = { regular, bold };
  return fonts;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const { regular, bold } = await loadFonts();
  const title = page.data.title;
  const description = page.data.description ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#07040F',
          padding: '56px 64px',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -160,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
          }}
        />

        {/* Top: logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} width={36} height={36} alt="" />
          <span style={{ color: '#C4B5FD', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
            PraxisJS
          </span>
        </div>

        {/* Center: title + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
          <div
            style={{
              color: '#F5F3FF',
              fontSize: title.length > 30 ? 60 : 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </div>

          {description ? (
            <div
              style={{
                color: '#A89EC4',
                fontSize: 26,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: 860,
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        {/* Bottom: URL */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#4C3D6B', fontSize: 18, letterSpacing: '0.02em' }}>
            praxisjs.org/docs
          </span>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #4C1D95 0%, #7C3AED 40%, #A78BFA 60%, #7C3AED 80%, #4C1D95 100%)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: regular, weight: 400 },
        { name: 'Inter', data: bold, weight: 700 },
      ],
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
