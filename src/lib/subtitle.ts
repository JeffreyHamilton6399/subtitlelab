// Shared subtitle types & time utilities (pure JS, no dependencies).

export interface SubtitleEntry {
  /** 1-based index as it appears in the file (recomputed on serialize). */
  index: number;
  /** Start time in milliseconds. */
  start: number;
  /** End time in milliseconds. */
  end: number;
  /** Subtitle text (may contain \n for line breaks). */
  text: string;
}

export type SubtitleFormat = "srt" | "vtt" | "ass";

/** Rebuild sequential 1-based indexes (entries are sorted as-is). */
export function reindex(entries: SubtitleEntry[]): SubtitleEntry[] {
  return entries.map((e, i) => ({ ...e, index: i + 1 }));
}

/** Convert "HH:MM:SS,mmm" or "HH:MM:SS.mmm" or "MM:SS.mmm" to milliseconds. */
export function parseTimecodeToMs(tc: string): number {
  const cleaned = tc.trim().replace(",", ".");
  const [timePart, msPart = "0"] = cleaned.split(".");
  const parts = timePart.split(":").map((p) => parseInt(p, 10));
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [m, s] = parts;
  } else if (parts.length === 1) {
    s = parts[0];
  }
  const ms = parseInt(msPart.padEnd(3, "0").slice(0, 3), 10) || 0;
  return ((h * 3600 + m * 60 + s) * 1000 + ms) || 0;
}

/** Format milliseconds as "HH:MM:SS,mmm" (SRT style, comma). */
export function formatSrtTimecode(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  const milli = clamped % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(milli, 3)}`;
}

/** Format milliseconds as "HH:MM:SS.mmm" (VTT style, period). */
export function formatVttTimecode(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  const milli = clamped % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(milli, 3)}`;
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

/** Shift a timecode (in ms) by offsetMs, clamped at 0. */
export function shiftMs(ms: number, offsetMs: number): number {
  return Math.max(0, ms + offsetMs);
}

/** Human-readable duration for file sizes (bytes). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

/** Detect subtitle format from filename + content. */
export function detectFormat(filename: string, content: string): SubtitleFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".vtt")) return "vtt";
  if (lower.endsWith(".ass") || lower.endsWith(".ssa")) return "ass";
  if (lower.endsWith(".srt")) return "srt";
  // Heuristic on content
  const head = content.slice(0, 64).trim();
  if (head.startsWith("WEBVTT")) return "vtt";
  if (content.includes("[Events]") && content.includes("Dialogue:")) return "ass";
  return "srt";
}

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".webm",
  ".m4v",
];

export const SUBTITLE_EXTENSIONS = [".srt", ".vtt", ".ass", ".ssa"];

export function isVideoFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isSubtitleFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUBTITLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isMediaFile(filename: string): boolean {
  return isVideoFile(filename) || isAudioFile(filename);
}

export function isAudioFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus"].some(
    (ext) => lower.endsWith(ext),
  );
}
