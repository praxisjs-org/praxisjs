import { render } from "@praxisjs/runtime";

import "virtual:praxisjs/styles.css";
import "./base-styles";
import { App } from "./app";

render(() => <App />, document.getElementById("app")!);
