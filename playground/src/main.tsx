import { render } from "@praxisjs/runtime";

import "./style.css";
import { App } from "./app";

render(() => <App />, document.getElementById("app")!);

// if (import.meta.env.DEV) {
//   const { DevTools } = await import("@praxisjs/devtools");
//   DevTools.init();
// }
