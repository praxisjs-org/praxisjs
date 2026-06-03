/**
 * Server-side / build-time API for the `@praxisjs/vite-plugin` CSS extractor.
 *
 * Import this at `@praxisjs/css/server` — it is NOT part of the browser bundle.
 * Using it in browser code has no effect and the tree-shaker will remove it.
 */
export {
  setCollector,
  getCollector,
  createCollector,
  type CSSCollector,
} from "./internal/collector.js";
