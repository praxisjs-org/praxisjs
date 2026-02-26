import type { Children } from "./types/children";

export const flattenChildren = (
  children: Children | Children[],
  out: Children[] = [],
) => {
  if (Array.isArray(children)) {
    for (const child of children) {
      flattenChildren(child, out);
    }
  } else {
    out.push(children);
  }
  return [children];
};
