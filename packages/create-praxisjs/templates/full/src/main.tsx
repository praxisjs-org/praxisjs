import { createRouter } from "@praxisjs/router";
import { render } from "@praxisjs/runtime";

import "./style.css";
import { App } from "./app";
import { About } from "./pages/about";
import { Home } from "./pages/home";

createRouter([
  { path: "/", component: Home },
  { path: "/about", component: About },
]);

render(() => <App />, document.getElementById("app")!);

if (import.meta.env.DEV) {
  const { DevTools } = await import("@praxisjs/devtools");
  DevTools.init();
}
