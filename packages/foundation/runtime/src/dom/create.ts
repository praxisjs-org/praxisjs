import { SVG_NAMESPACE, SVG_TAGS } from "./constants";

export function createElement(tag: string, doc: Document = document): HTMLElement | SVGElement {
  return SVG_TAGS.has(tag)
    ? (doc.createElementNS(SVG_NAMESPACE, tag))
    : doc.createElement(tag);
}
