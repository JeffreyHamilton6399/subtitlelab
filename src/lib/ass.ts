// ASS/SSA subtitle parsing (input only — converts Dialogue lines to SubtitleEntry).
// Pure JS, no dependencies.
import type { SubtitleEntry } from "./subtitle";
import { reindex } from "./subtitle";

interface AssFieldFormat {
  name: string;
  index: number;
}

/** Parse ASS/SSA content into SubtitleEntry[]. */
export function parseASS(content: string): SubtitleEntry[] {
  const text = content.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  if (!text.trim()) return [];

  const lines = text.split("\n");
  const entries: SubtitleEntry[] = [];
  let fields: AssFieldFormat[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\[Events\]/i.test(trimmed)) {
      fields = [];
      continue;
    }

    if (/^Format\s*:/i.test(trimmed)) {
      const value = trimmed.slice(trimmed.indexOf(":") + 1);
      const names = value.split(",").map((n) => n.trim().toLowerCase());
      fields = names.map((name, index) => ({ name, index }));
      continue;
    }

    if (/^Dialogue\s*:/i.test(trimmed)) {
      const value = trimmed.slice(trimmed.indexOf(":") + 1);
      // ASS Dialogue fields are comma-separated, but the Text field can contain
      // commas — so split only up to the Text field index.
      const textIdx = fields.findIndex((f) => f.name === "text");
      const startIdx = fields.findIndex((f) => f.name === "start");
      const endIdx = fields.findIndex((f) => f.name === "end");

      if (textIdx === -1 || startIdx === -1 || endIdx === -1) continue;

      const parts = value.split(",");
      const before = parts.slice(0, textIdx);
      const textValue = parts.slice(textIdx).join(",").trim();

      const start = parseAssTime(before[startIdx]);
      const end = parseAssTime(before[endIdx]);

      entries.push({
        index: entries.length + 1,
        start,
        end,
        text: stripAssTags(textValue),
      });
    }
  }

  return reindex(entries);
}

/** Parse "H:MM:SS.cs" (centiseconds) to milliseconds. */
function parseAssTime(tc: string): number {
  const cleaned = tc.trim();
  const match = cleaned.match(/^(\d+):(\d{1,2}):(\d{1,2})[\.:](\d{1,2})$/);
  if (!match) return 0;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const cs = parseInt(match[4].padEnd(2, "0").slice(0, 2), 10);
  return ((h * 3600 + m * 60 + s) * 1000 + cs * 10) || 0;
}

/** Strip ASS override tags like {\i1} and \N line breaks. */
function stripAssTags(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\N/gi, "\n")
    .replace(/\\h/gi, " ")
    .trim();
}
