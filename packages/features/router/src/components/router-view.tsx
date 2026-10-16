import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";

import { useRouter } from "../router";

import type { RouteComponent } from "../types/route";

function renderPage(RouteComponent: RouteComponent | null) {
  return RouteComponent ? <RouteComponent /> : null;
}

@Component()
export class RouterView extends StatelessComponent {
  render() {
    const router = useRouter();

    return (
      <div data-router-view="true">
        {() => {
          // Only the layout is read here: a navigation that keeps the layout swaps the page inside
          // it instead of rebuilding the layout (and losing its state) as well.
          const Layout = router.currentLayout();
          if (Layout) {
            return <Layout>{() => renderPage(router.currentComponent())}</Layout>;
          }
          return renderPage(router.currentComponent());
        }}
      </div>
    );
  }
}
