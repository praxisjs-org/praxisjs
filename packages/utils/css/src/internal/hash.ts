/**
 * djb2-variant hash of a string, returning a 6-char base-36 identifier.
 */
export function hashCSS(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}
