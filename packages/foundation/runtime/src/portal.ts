import { StatelessComponent } from "@praxisjs/core";

import { mountChildren } from "./children";
import { getCurrentScope } from "./context";

export interface PortalProps {
  to?: Element | string | null;
}

export class Portal extends StatelessComponent<PortalProps> {
  static readonly __isComponent = true as const;
  static readonly __isStateless = true;

  render() {
    const scope = getCurrentScope();
    const target = resolvePortalTarget(this.props.to);
    if (!target) return null;

    const start = document.createComment("");
    const end = document.createComment("");

    target.appendChild(start);
    mountChildren(target, this.props.children, scope);
    target.appendChild(end);

    scope.add(() => {
      if (!start.parentNode || start.parentNode !== end.parentNode) return;
      const range = document.createRange();
      range.setStartBefore(start);
      range.setEndAfter(end);
      range.deleteContents();
    });

    return document.createComment("portal");
  }
}

export function resolvePortalTarget(to?: Element | string | null): Element | null {
  if (to == null) {
    if (typeof document === "undefined") return null;
    return document.body;
  }
  if (typeof to === "string") return document.querySelector(to);
  return to;
}
