// SRT parsing & editing (pure JS, no dependencies).
import type { SubtitleEntry } from "./subtitle";
import {
  formatSrtTimecode,
  parseTimecodeToMs,
  reindex,
  shiftMs,
} from "./subtitle";

export { reindex };

/** Parse SRT content into a list of SubtitleEntry. */
export function parseSRT(content: string): SubtitleEntry[] {
  // Normalise line endings.
  const text = content.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  if (!text.trim()) return [];

  // Split on blank-line boundaries.
  const blocks = text.split(/\n\s*\n/);
  const entries: SubtitleEntry[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;

    let idx = 1;
    let linePtr = 0;

    // First line may be an index.
    if (/^\d+$/.test(lines[0].trim())) {
      idx = parseInt(lines[0].trim(), 10);
      linePtr = 1;
    }

    if (linePtr >= lines.length) continue;

    const timeLine = lines[linePtr];
    const match = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
    );
    if (!match) continue;

    const start = parseTimecodeToMs(match[1]);
    const end = parseTimecodeToMs(match[2]);
    const textLines = lines.slice(linePtr + 1);
    const entryText = textLines.join("\n").trim();

    entries.push({
      index: entries.length + 1,
      start,
      end,
      text: entryText,
    });
    void idx;
  }

  return reindex(entries);
}

/** Serialise entries back to SRT text. */
export function serializeSRT(entries: SubtitleEntry[]): string {
  const out: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    out.push(String(i + 1));
    out.push(
      `${formatSrtTimecode(e.start)} --> ${formatSrtTimecode(e.end)}`,
    );
    out.push(e.text || "");
    out.push(""); // blank line between entries
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Shift all entries by offsetSeconds (can be negative). */
export function shiftEntries(
  entries: SubtitleEntry[],
  offsetSeconds: number,
): SubtitleEntry[] {
  const offsetMs = Math.round(offsetSeconds * 1000);
  return entries.map((e) => ({
    ...e,
    start: shiftMs(e.start, offsetMs),
    end: shiftMs(e.end, offsetMs),
  }));
}

/** Case-insensitive search & replace across all entry text. */
export function searchReplace(
  entries: SubtitleEntry[],
  search: string,
  replace: string,
  options: { ignoreCase?: boolean; regex?: boolean } = {},
): { entries: SubtitleEntry[]; replacements: number } {
  if (!search) return { entries, replacements: 0 };
  let replacements = 0;
  const { ignoreCase = true, regex = false } = options;

  let matcher: RegExp | string;
  if (regex) {
    try {
      matcher = new RegExp(search, `g${ignoreCase ? "i" : ""}`);
    } catch {
      return { entries, replacements: 0 };
    }
  } else {
    matcher = search;
  }

  const next = entries.map((e) => {
    if (regex) {
      const matches = e.text.match(matcher as RegExp);
      if (matches) replacements += matches.length;
      return { ...e, text: e.text.replace(matcher as RegExp, replace) };
    }
    // Plain string replace (case-insensitive via manual split).
    const flags = ignoreCase ? "gi" : "g";
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, flags);
    const matches = e.text.match(re);
    if (matches) replacements += matches.length;
    return { ...e, text: e.text.replace(re, replace) };
  });

  return { entries: next, replacements };
}

/**
 * Merge consecutive entries whose combined text is short enough, or whose gap
 * between them is tiny. Useful for joining over-split lines.
 */
export function mergeEntries(
  entries: SubtitleEntry[],
  maxChars = 84,
): SubtitleEntry[] {
  const merged: SubtitleEntry[] = [];
  for (const e of entries) {
    const last = merged[merged.length - 1];
    if (
      last &&
      (last.text + " " + e.text).length <= maxChars &&
      e.start - last.end <= 1000
    ) {
      last.text = `${last.text} ${e.text}`.trim();
      last.end = Math.max(last.end, e.end);
    } else {
      merged.push({ ...e });
    }
  }
  return reindex(merged);
}

/**
 * Split entries whose text exceeds a length threshold into multiple entries,
 * distributing the duration evenly across the splits.
 */
export function splitLongEntries(
  entries: SubtitleEntry[],
  maxChars = 84,
): SubtitleEntry[] {
  const out: SubtitleEntry[] = [];
  for (const e of entries) {
    if (e.text.length <= maxChars) {
      out.push({ ...e });
      continue;
    }
    const words = e.text.split(/\s+/);
    const chunks: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (candidate.length > maxChars && current) {
        chunks.push(current);
        current = w;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);

    const total = Math.max(e.end - e.start, 1);
    const perChunk = total / chunks.length;
    chunks.forEach((chunk, i) => {
      out.push({
        index: 0,
        start: Math.round(e.start + perChunk * i),
        end: Math.round(e.start + perChunk * (i + 1)),
        text: chunk,
      });
    });
  }
  return reindex(out);
}

/**
 * Attempt to repair common encoding problems (mojibake) by re-interpreting the
 * string as Latin-1 bytes re-decoded as UTF-8. Best-effort.
 */
export function fixEncoding(content: string): string {
  try {
    // Heuristic: presence of typical mojibake characters.
    if (!/[\u00c0-\u00ff]{2,}/.test(content)) {
      return content.replace(/^\uFEFF/, "").trim() + "\n";
    }
    const bytes = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      bytes[i] = code & 0xff;
    }
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.replace(/^\uFEFF/, "").trim() + "\n";
  } catch {
    return content;
  }
}

/** Adjust entry timings for a framerate conversion (e.g. 23.976 -> 25). */
export function convertFps(
  entries: SubtitleEntry[],
  fromFps: number,
  toFps: number,
): SubtitleEntry[] {
  if (!fromFps || !toFps || fromFps === toFps) return entries;
  const ratio = toFps / fromFps;
  return entries.map((e) => ({
    ...e,
    start: Math.round(e.start * ratio),
    end: Math.round(e.end * ratio),
  }));
}

export const COMMON_FPS = [23.976, 24, 25, 29.97, 30];
