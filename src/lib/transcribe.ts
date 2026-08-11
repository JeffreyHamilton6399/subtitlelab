// Web Speech API transcription — creates timed subtitles from an audio/video file.
// 100% client-side. Plays the media element audibly so the SpeechRecognition
// engine can transcribe it, tracking currentTime to timestamp each result.
import type { SubtitleEntry } from "./subtitle";

// --- Minimal Web Speech API typings (not in standard TS DOM lib) ---
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isTranscriptionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export interface TranscriptionLanguage {
  code: string;
  label: string;
}

export const TRANSCRIPTION_LANGUAGES: TranscriptionLanguage[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "nl-NL", label: "Dutch" },
  { code: "pl-PL", label: "Polish" },
  { code: "ru-RU", label: "Russian" },
  { code: "tr-TR", label: "Turkish" },
  { code: "sv-SE", label: "Swedish" },
  { code: "ar-SA", label: "Arabic" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Mandarin)" },
];

export type TranscriptionStatus =
  | "idle"
  | "preparing"
  | "running"
  | "paused"
  | "done"
  | "error";

export interface TranscriptionCallbacks {
  onStatus?: (status: TranscriptionStatus) => void;
  onProgress?: (ratio: number, currentMs: number, totalMs: number) => void;
  onEntry?: (entry: SubtitleEntry) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  onComplete?: (entries: SubtitleEntry[]) => void;
}

const MAX_CHARS_PER_ENTRY = 84;
const MAX_GAP_MS = 1500;

/** Manage transcription of a single media file via the Web Speech API. */
export class AudioTranscriber {
  private mediaEl: HTMLMediaElement | null = null;
  private objectUrl: string | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private entries: SubtitleEntry[] = [];
  private status: TranscriptionStatus = "idle";
  private currentSegmentStartMs = 0;
  private lastFinalMs = 0;
  private stopped = false;
  private readonly lang: string;
  private readonly callbacks: TranscriptionCallbacks;

  constructor(lang: string, callbacks: TranscriptionCallbacks) {
    this.lang = lang || "en-US";
    this.callbacks = callbacks;
  }

  async transcribe(file: File): Promise<void> {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      this.callbacks.onError?.(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
      );
      this.setStatus("error");
      return;
    }

    this.setStatus("preparing");
    this.stopped = false;
    this.entries = [];
    this.currentSegmentStartMs = 0;
    this.lastFinalMs = 0;

    // Create media element (audio-only path also works with <video>).
    this.objectUrl = URL.createObjectURL(file);
    const el = file.type.startsWith("audio")
      ? document.createElement("audio")
      : document.createElement("video");
    el.src = this.objectUrl;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    el.style.width = "1px";
    el.style.height = "1px";
    el.setAttribute("aria-hidden", "true");
    this.mediaEl = el;
    document.body.appendChild(el);

    // Set up recognition.
    const recognition = new Ctor();
    recognition.lang = this.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.callbacks.onError?.(
          "Microphone access was blocked. Please allow microphone access to transcribe audio.",
        );
        this.setStatus("error");
      } else {
        this.callbacks.onError?.(`Recognition error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      // Auto-restart while media still playing.
      if (!this.stopped && this.mediaEl && !this.mediaEl.ended) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };
    this.recognition = recognition;

    await this.waitForReady(el);

    const durationMs = (el.duration || 0) * 1000;

    el.addEventListener("timeupdate", () => {
      const currentMs = (el.currentTime || 0) * 1000;
      const ratio = durationMs > 0 ? Math.min(1, currentMs / durationMs) : 0;
      this.callbacks.onProgress?.(ratio, currentMs, durationMs);
    });
    el.addEventListener("ended", () => {
      this.finish();
    });
    el.addEventListener("error", () => {
      this.callbacks.onError?.("Could not play the media file for transcription.");
      this.setStatus("error");
    });

    this.setStatus("running");
    try {
      recognition.start();
    } catch {
      /* may already be running */
    }
    this.currentSegmentStartMs = 0;

    try {
      await el.play();
    } catch {
      this.callbacks.onError?.(
        "Playback was blocked. Please click Transcribe again to allow audio playback.",
      );
      this.setStatus("error");
    }
  }

  private waitForReady(el: HTMLMediaElement): Promise<void> {
    return new Promise((resolve) => {
      if (el.readyState >= 2) return resolve();
      const onReady = () => {
        el.removeEventListener("loadeddata", onReady);
        resolve();
      };
      el.addEventListener("loadeddata", onReady);
      // Fallback timeout.
      setTimeout(() => {
        el.removeEventListener("loadeddata", onReady);
        resolve();
      }, 3000);
    });
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    if (!this.mediaEl) return;
    const currentMs = (this.mediaEl.currentTime || 0) * 1000;

    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) {
        const text = transcript.trim();
        if (!text) continue;
        this.pushEntry(text, this.currentSegmentStartMs || currentMs, currentMs);
        this.lastFinalMs = currentMs;
        this.currentSegmentStartMs = currentMs;
      } else {
        interimText += transcript;
      }
    }
    if (interimText) this.callbacks.onInterim?.(interimText);
  }

  private pushEntry(text: string, startMs: number, endMs: number): void {
    // Auto-split overly long transcripts into multiple timed entries.
    const words = text.split(/\s+/);
    if (text.length <= MAX_CHARS_PER_ENTRY) {
      this.addEntry(words.join(" "), startMs, endMs);
      return;
    }
    const chunks: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (candidate.length > MAX_CHARS_PER_ENTRY && current) {
        chunks.push(current);
        current = w;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);

    const total = Math.max(endMs - startMs, 1);
    const per = total / chunks.length;
    chunks.forEach((chunk, i) => {
      const s = Math.round(startMs + per * i);
      const e = Math.round(startMs + per * (i + 1));
      this.addEntry(chunk, s, e);
    });
  }

  private addEntry(text: string, startMs: number, endMs: number): void {
    if (endMs - startMs > MAX_GAP_MS && endMs <= startMs) {
      endMs = startMs + 1500;
    }
    const entry: SubtitleEntry = {
      index: this.entries.length + 1,
      start: Math.round(startMs),
      end: Math.round(endMs),
      text,
    };
    this.entries.push(entry);
    this.callbacks.onEntry?.(entry);
  }

  private setStatus(status: TranscriptionStatus): void {
    this.status = status;
    this.callbacks.onStatus?.(status);
  }

  getStatus(): TranscriptionStatus {
    return this.status;
  }

  getEntries(): SubtitleEntry[] {
    return [...this.entries];
  }

  pause(): void {
    if (this.mediaEl) this.mediaEl.pause();
    try {
      this.recognition?.stop();
    } catch {
      /* ignore */
    }
    this.setStatus("paused");
  }

  resume(): void {
    if (this.mediaEl) {
      this.mediaEl.play().catch(() => {});
    }
    try {
      this.recognition?.start();
    } catch {
      /* ignore */
    }
    this.setStatus("running");
  }

  stop(): void {
    this.stopped = true;
    try {
      this.recognition?.stop();
    } catch {
      /* ignore */
    }
    if (this.mediaEl) this.mediaEl.pause();
    this.finish();
  }

  private finish(): void {
    if (this.stopped && this.status === "done") return;
    this.stopped = true;
    try {
      this.recognition?.abort();
    } catch {
      /* ignore */
    }
    this.setStatus("done");
    this.callbacks.onComplete?.(this.entries);
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaEl) {
      this.mediaEl.pause();
      this.mediaEl.src = "";
      this.mediaEl.load();
      this.mediaEl.remove();
      this.mediaEl = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.recognition = null;
  }

  dispose(): void {
    this.cleanup();
  }
}
