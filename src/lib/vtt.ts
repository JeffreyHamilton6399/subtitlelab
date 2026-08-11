// VTT (WebVTT) parsing & serialising (pure JS, no dependencies).
import type { SubtitleEntry } from "./subtitle";
import { formatVttTimecode, parseTimecodeToMs, reindex as reindexShared } from "./subtitle";

function reindex(entries: SubtitleEntry[]): SubtitleEntry[] {
  return reindexShared(entries);
}

/** Parse WebVTT content into SubtitleEntry[]. Ignores header & NOTE blocks. */
export function parseVTT(content: string): SubtitleEntry[] {
  const text = content.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  if (!text.trim()) return [];

  const lines = text.split("\n");
  const entries: SubtitleEntry[] = [];

  let i = 0;
  // Skip WEBVTT header line and any metadata block.
  if (/^WEBVTT/.test(lines[0].trim())) {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "") i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === "") {
      i++;
      continue;
    }
    if (line.startsWith("NOTE") || line.startsWith("STYLE") || line.startsWith("REGION")) {
      // skip cue/block until blank line
      i++;
      while (i < lines.length && lines[i].trim() !== "") i++;
      continue;
    }

    // optional cue identifier
    let timeLine = line;
    let ptr = i;
    if (!line.includes("-->")) {
      if (i + 1 >= lines.length) break;
      timeLine = lines[i + 1].trim();
      ptr = i + 1;
    }

    const match = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3}|\d{1,2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3}|\d{1,2}\.\d{1,3})/,
    );
    if (!match) {
      i++;
      continue;
    }

    const start = parseTimecodeToMs(match[1]);
    const end = parseTimecodeToMs(match[2]);

    // collect cue text lines until blank line
    const textLines: string[] = [];
    let j = ptr + 1;
    while (j < lines.length && lines[j].trim() !== "") {
      textLines.push(lines[j]);
      j++;
    }
    entries.push({
      index: entries.length + 1,
      start,
      end,
      text: textLines.join("\n").trim(),
    });
    i = j;
  }

  return reindex(entries);
}

/** Serialise entries to WebVTT text. */
export function serializeVTT(entries: SubtitleEntry[]): string {
  const out: string[] = ["WEBVTT", ""];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    out.push(
      `${formatVttTimecode(e.start)} --> ${formatVttTimecode(e.end)}`,
    );
    out.push(e.text || "");
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
