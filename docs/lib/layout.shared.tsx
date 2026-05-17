import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BookMarked } from "lucide-react";
import { gitConfig } from "./shared";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.png" width={22} height={22} alt="" aria-hidden />
      <span
        className="text-[15px] font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display, inherit)" }}
      >
        PraxisJS
      </span>
    </div>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      transparentMode: "top",
    },
    links: [
      {
        type: "icon",
        text: "Storybook",
        url: "https://storybook.praxisjs.org",
        icon: <BookMarked />,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
