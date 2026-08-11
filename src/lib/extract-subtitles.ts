// ffmpeg.wasm subtitle extraction (lazy-loaded, client-side only).
import type { FFmpeg } from "@ffmpeg/ffmpeg";

export interface SubtitleTrack {
  /** 0-based index among subtitle streams of the input (for -map 0:s:N). */
  index: number;
  /** Absolute stream index reported by ffmpeg. */
  streamIndex: number;
  /** Language code (e.g. "eng") or "und". */
  language: string;
  /** Subtitle codec name (e.g. "subrip", "ass", "mov_text"). */
  codec: string;
  /** Title from metadata if present. */
  title: string;
  defaultFlag: boolean;
}

export interface ExtractResult {
  /** Output filename. */
  name: string;
  /** Extracted subtitle content (UTF-8 text). */
  content: string;
  /** Approximate byte size. */
  size: number;
}

export type LogListener = (message: string, type: string) => void;
export type ProgressListener = (ratio: number) => void;

let ffmpegPromise: Promise<FFmpeg> | null = null;

/**
 * Whether the page is cross-origin isolated (SharedArrayBuffer available).
 * The multi-threaded ffmpeg core needs this; the single-threaded core does
 * not, but it's still a useful signal for the best experience.
 */
export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated ===
    true
  );
}

/** Reset the cached ffmpeg instance so the next call reloads from scratch. */
export function resetFFmpegLoad(): void {
  ffmpegPromise = null;
}

/**
 * Lazily load the ffmpeg.wasm core (single-threaded for broad browser
 * compatibility — works without cross-origin isolation headers).
 *
 * Throws a clear Error if the core can't be fetched or loaded, so the UI
 * can surface an actionable message instead of stalling.
 */
export async function loadFFmpeg(onLog?: LogListener): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;

  ffmpegPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    const ffmpeg = new FFmpeg();

    if (onLog) {
      ffmpeg.on("log", ({ message, type }) => onLog(message, type));
    }

    let coreURL: string;
    let wasmURL: string;
    try {
      coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript",
      );
      wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      );
    } catch (e) {
      ffmpegPromise = null;
      throw new Error(
        "Could not download the ffmpeg engine (offline?). Subtitle extraction needs an internet connection for the first load. " +
          (e as Error).message,
      );
    }

    try {
      await ffmpeg.load({ coreURL, wasmURL });
    } catch (e) {
      ffmpegPromise = null;
      throw new Error(
        "ffmpeg failed to start in this browser. " + (e as Error).message,
      );
    }

    return ffmpeg;
  })();

  return ffmpegPromise;
}

/**
 * Probe an input file for embedded subtitle tracks.
 * Runs `ffmpeg -i input` (no output) and parses the stream listing.
 */
export async function listSubtitleTracks(
  file: File,
  onLog?: LogListener,
): Promise<SubtitleTrack[]> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await loadFFmpeg(onLog);

  const inputName = "input_probe";
  const collected: string[] = [];
  const handler: LogListener = (message) => {
    collected.push(message);
    onLog?.(message, "stderr");
  };
  ffmpeg.on("log", ({ message, type }) => handler(message, type));

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
  } catch (e) {
    ffmpeg.off("log", handler as never);
    throw new Error("Could not read file into ffmpeg: " + (e as Error).message);
  }

  // Running -i with no output exits non-zero, which is fine — we just need logs.
  try {
    await ffmpeg.exec(["-i", inputName]);
  } catch {
    // expected: ffmpeg exits 1 because no output file is specified
  }

  ffmpeg.off("log", handler as never);

  try {
    await ffmpeg.deleteFile(inputName);
  } catch {
    /* ignore */
  }

  const logText = collected.join("\n");
  return parseStreamList(logText);
}

/** Parse ffmpeg stderr for subtitle stream lines. */
export function parseStreamList(logText: string): SubtitleTrack[] {
  const tracks: SubtitleTrack[] = [];
  const lines = logText.split("\n");
  let subIdx = 0;
  let lastStreamLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /Stream\s+#0:(\d+)(?:\((\w+)\))?(?:\[0x[0-9a-f]+\])?:\s*Subtitle:\s*(\S+)(.*)/i,
    );
    if (!match) continue;

    const streamIndex = parseInt(match[1], 10);
    const language = match[2] || "und";
    const codec = match[3];
    const rest = match[4] || "";
    const defaultFlag = /default/i.test(rest);

    // Try to read a title from the following Metadata block.
    let title = "";
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const t = lines[j].match(/^\s*title\s*:\s*(.+)$/i);
      if (t) {
        title = t[1].trim();
        break;
      }
      if (/Stream\s+#/.test(lines[j])) break;
    }

    tracks.push({
      index: subIdx,
      streamIndex,
      language,
      codec,
      title,
      defaultFlag,
    });
    subIdx++;
    lastStreamLine = i;
  }
  void lastStreamLine;

  return tracks;
}

/**
 * Extract a specific subtitle track to SRT or VTT text.
 */
export async function extractSubtitleTrack(
  file: File,
  track: SubtitleTrack,
  format: "srt" | "vtt",
  onProgress?: ProgressListener,
  onLog?: LogListener,
): Promise<ExtractResult> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await loadFFmpeg(onLog);

  const inputName = "input_ext";
  const ext = format === "vtt" ? "vtt" : "srt";
  const outputName = `output.${ext}`;

  const progHandler = (e: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, e.progress)));
  };
  ffmpeg.on("progress", progHandler as never);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.deleteFile(outputName).catch(() => {});
    const args = [
      "-i",
      inputName,
      "-map",
      `0:s:${track.index}`,
      "-c:s",
      format === "vtt" ? "webvtt" : "srt",
      outputName,
    ];
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    let content: string;
    if (data instanceof Uint8Array) {
      content = new TextDecoder("utf-8").decode(data);
    } else {
      content = String(data);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const name = `${baseName}.${track.language && track.language !== "und" ? track.language + "." : ""}${ext}`;

    return { name, content, size: new Blob([content]).size };
  } finally {
    ffmpeg.off("progress", progHandler as never);
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      /* ignore */
    }
  }
}
