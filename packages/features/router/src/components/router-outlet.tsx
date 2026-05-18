import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";

import { useRouter } from "../router";

@Component()
export class RouterOutlet extends StatelessComponent {
  render() {
    const router = useRouter();

    return (
      <div data-router-outlet="true">
        {() => {
          const RouteComponent = router.currentComponent();
          return RouteComponent ? <RouteComponent /> : null;
        }}
      </div>
    );
  }
}
