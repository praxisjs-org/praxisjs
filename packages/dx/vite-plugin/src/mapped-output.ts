export interface SourceMapV3 {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

// ── source map ───────────────────────────────────────────────────────────────

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function encodeVlq(value: number): string {
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += BASE64[digit];
  } while (vlq > 0);
  return out;
}

export class MappedOutput {
  private code = "";
  private readonly lines: string[][] = [[]];
  private column = 0;
  private prevSourceLine = 0;
  private prevSourceColumn = 0;
  private prevColumn = 0;
  private readonly lineStarts: number[];

  constructor(private readonly source: string) {
    this.lineStarts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source.charCodeAt(i) === 10) this.lineStarts.push(i + 1);
    }
  }

  private position(offset: number): [number, number] {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return [lo, offset - this.lineStarts[lo]];
  }

  private segment(offset: number): void {
    const [line, column] = this.position(offset);
    const current = this.lines[this.lines.length - 1];
    current.push(
      encodeVlq(this.column - this.prevColumn) +
        encodeVlq(0) +
        encodeVlq(line - this.prevSourceLine) +
        encodeVlq(column - this.prevSourceColumn),
    );
    this.prevColumn = this.column;
    this.prevSourceLine = line;
    this.prevSourceColumn = column;
  }

  /** Appends text taken verbatim from the source, starting at `offset`. */
  copy(from: number, to: number): void {
    if (from >= to) return;
    const text = this.source.slice(from, to);
    this.segment(from);
    let lineStart = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) !== 10) continue;
      this.newLine();
      lineStart = i + 1;
      if (lineStart < text.length) this.segment(from + lineStart);
    }
    this.column += text.length - lineStart;
    this.code += text;
  }

  /** Appends generated text, mapped to the source position `offset`. */
  insert(text: string, offset: number): void {
    this.segment(offset);
    const lastBreak = text.lastIndexOf("\n");
    if (lastBreak === -1) {
      this.column += text.length;
    } else {
      for (let i = 0; i <= lastBreak; i++) if (text.charCodeAt(i) === 10) this.newLine();
      this.column = text.length - lastBreak - 1;
    }
    this.code += text;
  }

  private newLine(): void {
    this.lines.push([]);
    this.column = 0;
    this.prevColumn = 0;
  }

  result(file: string): { code: string; map: SourceMapV3 } {
    return {
      code: this.code,
      map: {
        version: 3,
        file,
        sources: [file],
        sourcesContent: [this.source],
        names: [],
        mappings: this.lines.map((segments) => segments.join(",")).join(";"),
      },
    };
  }
}

/** A map of `source` moved down by `lines` generated lines, each of its lines otherwise in place. */
export function shiftedLines(source: string, file: string, lines: number): SourceMapV3 {
  const count = source.split("\n").length;
  return {
    version: 3,
    file,
    sources: [file],
    sourcesContent: [source],
    names: [],
    mappings: ";".repeat(lines) + ["AAAA", ...Array<string>(count - 1).fill("AACA")].join(";"),
  };
}
