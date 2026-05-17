import { renderOGImage } from '@/lib/og';

export const revalidate = false;

export function GET() {
  return renderOGImage({
    title: 'Signal-driven frontend framework.',
    description: "Class components with TC39 decorators. Fine-grained signals update only the exact DOM nodes they're bound to — no virtual DOM, no diffing.",
  });
}
