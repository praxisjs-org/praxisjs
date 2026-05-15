import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import type { Children } from "@praxisjs/shared";

import { useRouter } from "../router";

interface LinkProps {
  to: string;
  replace?: boolean;
  class?: string;
  activeClass?: string;
  style?: string | Record<string, string>;
  children?: Children | Children[];
}

@Component()
export class Link extends StatelessComponent<LinkProps> {
  render() {
    const {
      to,
      replace = false,
      class: cls = "",
      activeClass = "active",
      style,
      children,
    } = this.props;

    const router = useRouter();

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
        class={() => {
          const isActive = router.location().path === to;
          return [cls, isActive ? activeClass : ""].filter(Boolean).join(" ");
        }}
        style={style}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }
}
