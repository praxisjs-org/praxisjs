import { render } from "@praxisjs/runtime";

import "./style.css";
import { App } from "./app";

render(() => <App />, document.getElementById("app")!);
