import { computed } from "@verbose/core";
import type { Children, VNode } from "@verbose/shared";

import { useRouter } from "../router";

interface LinkProps {
  to: string;
  replace?: boolean;
  class?: string;
  activeClass?: string;
  children?: Children | Children[];
}

export function Link({
  to,
  replace = false,
  class: cls = "",
  activeClass = "active",
  children,
}: LinkProps): VNode {
  const router = useRouter();

  const isActive = computed(() => router.location().path === to);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    if (replace) {
      void router.replace(to);
    } else {
      void router.push(to);
    }
  };

  return (
    <a
      href={to}
      class={() =>
        [cls, isActive() ? activeClass : ""].filter(Boolean).join(" ")
      }
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
