// Local audio transcription using OpenAI's Whisper model via transformers.js.
// 100% client-side: the model is downloaded once from the HuggingFace CDN
// (and cached by the browser), then runs entirely in the browser via WASM.
// No microphone, no server, no third-party API calls — truly private.

import type { SubtitleEntry } from "./subtitle";
import { reindex } from "./subtitle";

// Lazy-load transformers.js only in the browser.
let pipelinePromise: Promise<unknown> | null = null;

type WhisperPipeline = {
  (audio: Float32Array): Promise<{
    text: string;
    chunks?: Array<{ timestamp: [number, number] | null; text: string }>;
  }>;
};

interface WhisperProgressInfo {
  status: string;
  name?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export type WhisperProgressCallback = (info: WhisperProgressInfo) => void;

export interface WhisperOptions {
  language?: string;
  task?: "transcribe" | "translate";
  chunkLengthSec?: number;
  onProgress?: WhisperProgressCallback;
}

export interface WhisperResult {
  entries: SubtitleEntry[];
  rawText: string;
}

/**
 * Get the Whisper pipeline, loading it lazily on first use.
 * Uses whisper-tiny.en for fast, fully-local English transcription.
 */
async function getPipeline(
  onProgress?: WhisperProgressCallback,
): Promise<WhisperPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");

      // Allow remote model download + cache in the browser.
      env.allowLocalModels = false;
      env.allowRemoteModels = true;

      // Xenova/whisper-tiny.en: English-only, fully local.
      // Use fp32 (non-quantized) to avoid ONNX quantization compatibility issues.
      const pipe = (await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        {
          dtype: "fp32",
          progress_callback: (info: WhisperProgressInfo) => {
            onProgress?.(info);
          },
        },
      )) as WhisperPipeline;

      return pipe;
    })();
  }
  return pipelinePromise as Promise<WhisperPipeline>;
}

/**
 * Decode a video/audio File into a mono Float32Array at 16kHz using the Web
 * Audio API. Whisper expects 16kHz mono PCM.
 */
async function decodeAudioFile(
  file: File,
): Promise<{ audio: Float32Array; duration: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    (window as unknown as { AudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this browser.");
  }
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    const dest = ctx.createBuffer(1, decoded.length, decoded.sampleRate);
    // Mix down to mono.
    const numChannels = decoded.numberOfChannels;
    const out = dest.getChannelData(0);
    for (let c = 0; c < numChannels; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        out[i] += data[i] / numChannels;
      }
    }
    // Resample to 16kHz by rendering through the offline context.
    const duration = decoded.duration;
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 16000),
      16000,
    );
    const src = offline.createBufferSource();
    src.buffer = dest;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return { audio: rendered.getChannelData(0), duration };
  } finally {
    ctx.close();
  }
}

/**
 * Transcribe an audio/video File using Whisper, locally, producing timed
 * subtitle entries.
 */
export async function transcribeWithWhisper(
  file: File,
  options: WhisperOptions = {},
): Promise<WhisperResult> {
  const { language = "en", task = "transcribe", onProgress } = options;

  // 1. Decode the file's audio.
  onProgress?.({ status: "decoding" });
  const { audio, duration } = await decodeAudioFile(file);
  onProgress?.({ status: "decoded", progress: 0.1 });

  // 2. Load the Whisper pipeline.
  const pipe = await getPipeline(onProgress);
  onProgress?.({ status: "transcribing", progress: 0.15 });

  // 3. Run Whisper with timestamp chunking enabled. This is what makes the
  // output come back as many short sentence/phrase-level chunks (each with
  // its own start/end timestamp) instead of one giant block of text.
  // NOTE: the .en model is English-only, so it does not accept
  // `language`/`task` (passing them throws). Those are only for multilingual.
  const pipeOptions: Record<string, unknown> = {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  void language;
  void task;
  const output = await pipe(audio, pipeOptions);
  onProgress?.({ status: "done", progress: 1 });

  const rawText = (output.text || "").trim();
  const chunks = output.chunks || [];

  let entries: SubtitleEntry[];
  if (chunks.length > 0) {
    entries = chunks.map((chunk, i) => {
      const startMs = chunk.timestamp?.[0]
        ? Math.round(chunk.timestamp[0] * 1000)
        : 0;
      const endMs = chunk.timestamp?.[1]
        ? Math.round(chunk.timestamp[1] * 1000)
        : Math.min(
            Math.round((duration || 0) * 1000),
            startMs + 5000,
          );
      return {
        index: i + 1,
        start: startMs,
        end: endMs,
        text: (chunk.text || "").trim(),
      };
    });
  } else {
    // Fallback: single entry spanning the whole audio.
    entries = rawText
      ? [
          {
            index: 1,
            start: 0,
            end: Math.round((duration || 0) * 1000),
            text: rawText,
          },
        ]
      : [];
  }

  // Filter out empty-text entries, then split any entry that is still too
  // long to read as a single subtitle (more than ~84 chars or multiple
  // sentences) into shorter ones, distributing the duration evenly.
  entries = entries.filter((e) => e.text.length > 0);
  entries = splitLongEntries(entries, 84);

  return { entries: reindex(entries), rawText };
}

/**
 * Split entries whose text exceeds maxChars (or contains multiple sentences)
 * into multiple shorter entries, distributing the duration evenly.
 */
function splitLongEntries(
  entries: SubtitleEntry[],
  maxChars = 84,
): SubtitleEntry[] {
  const out: SubtitleEntry[] = [];
  for (const e of entries) {
    const segments = splitIntoSegments(e.text, maxChars);
    if (segments.length <= 1) {
      out.push({ ...e });
      continue;
    }
    const total = Math.max(e.end - e.start, 1);
    const per = total / segments.length;
    segments.forEach((seg, i) => {
      out.push({
        index: 0,
        start: Math.round(e.start + per * i),
        end: Math.round(e.start + per * (i + 1)),
        text: seg,
      });
    });
  }
  return out;
}

/** Split text into subtitle-length segments on sentence/clause boundaries. */
function splitIntoSegments(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return [cleaned];
  // Split on sentence/clause punctuation, keeping the punctuation.
  const parts = cleaned.split(/(?<=[.!?])\s+|,\s+|;\s+/).filter(Boolean);
  const segments: string[] = [];
  let current = "";
  for (const p of parts) {
    const candidate = current ? `${current} ${p}`.trim() : p;
    if (candidate.length > maxChars && current) {
      segments.push(current);
      // If the part itself is too long, hard-split on words.
      if (p.length > maxChars) {
        const words = p.split(" ");
        let buf = "";
        for (const w of words) {
          const c = buf ? `${buf} ${w}` : w;
          if (c.length > maxChars && buf) {
            segments.push(buf);
            buf = w;
          } else {
            buf = c;
          }
        }
        if (buf) current = buf;
        else current = "";
      } else {
        current = p;
      }
    } else {
      current = candidate;
    }
  }
  if (current) segments.push(current);
  return segments.length ? segments : [cleaned];
}

export function isWhisperSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { AudioContext?: unknown }).AudioContext !==
      "undefined"
  );
}
