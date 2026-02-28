import type { ChildrenInternal } from "./types/children";

export const flattenChildren = (
  children: ChildrenInternal | ChildrenInternal[],
  out: ChildrenInternal[] = [],
) => {
  if (Array.isArray(children)) {
    for (const child of children) {
      flattenChildren(child, out);
    }
  } else {
    out.push(children);
  }
  return out;
};
