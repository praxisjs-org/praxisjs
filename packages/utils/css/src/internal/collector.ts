/**
 * CSS collector — used by the Vite CSS plugin during build-time extraction.
 * When a collector is active, `injectStyle` and `keyframes` push CSS to it
 * instead of injecting `<style>` elements into the DOM.
 */

export interface CSSCollector {
  inject(key: string, css: string): void;
  addKeyframes(name: string, css: string): void;
  getCSS(): string;
  clear(): void;
}

let _active: CSSCollector | null = null;

export function setCollector(c: CSSCollector | null): void {
  _active = c;
}

export function getCollector(): CSSCollector | null {
  return _active;
}

export function createCollector(): CSSCollector {
  const seen = new Set<string>();
  const blocks: string[] = [];

  return {
    inject(key, css) {
      if (!seen.has(key)) { seen.add(key); blocks.push(css); }
    },
    addKeyframes(name, css) {
      if (!seen.has(name)) { seen.add(name); blocks.push(css); }
    },
    getCSS() { return blocks.join("\n"); },
    clear() { seen.clear(); blocks.length = 0; },
  };
}
