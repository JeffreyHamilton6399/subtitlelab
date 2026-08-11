// Web Speech API transcription — creates timed subtitles from an audio/video file.
// 100% client-side. The media plays audibly so the SpeechRecognition engine
// (which listens to the microphone) can transcribe it, tracking currentTime to
// timestamp each final result.
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

export interface TranscriptionUpdate {
  status: TranscriptionStatus;
  entries: SubtitleEntry[];
  progress: number;
  interim: string;
  message?: string;
}

export interface TranscriptionCallbacks {
  onUpdate?: (update: TranscriptionUpdate) => void;
  onEntry?: (entry: SubtitleEntry) => void;
  onError?: (message: string) => void;
  onComplete?: (entries: SubtitleEntry[]) => void;
}

const MAX_CHARS_PER_ENTRY = 84;

/**
 * Manage transcription of a single media file via the Web Speech API.
 *
 * Important: the Web Speech API listens to the **microphone**, not to file
 * audio directly. For transcription to work, the media must play audibly out
 * loud through the speakers so the microphone can pick it up. Remind the user
 * to turn up their volume and allow microphone access.
 */
export class AudioTranscriber {
  private mediaEl: HTMLMediaElement | null = null;
  private objectUrl: string | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private entries: SubtitleEntry[] = [];
  private status: TranscriptionStatus = "idle";
  private currentSegmentStartMs = 0;
  private stopped = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private noSpeechCount = 0;
  private warnedNoSpeech = false;
  private readonly lang: string;
  private readonly callbacks: TranscriptionCallbacks;
  private progress = 0;
  private interim = "";

  constructor(lang: string, callbacks: TranscriptionCallbacks) {
    this.lang = lang || "en-US";
    this.callbacks = callbacks;
  }

  async transcribe(file: File): Promise<void> {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      this.fail(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    this.setStatus("preparing");
    this.stopped = false;
    this.entries = [];
    this.currentSegmentStartMs = 0;
    this.noSpeechCount = 0;
    this.warnedNoSpeech = false;
    this.progress = 0;
    this.interim = "";

    // Create media element. Audio MUST play audibly (not muted) so the mic
    // can pick it up.
    this.objectUrl = URL.createObjectURL(file);
    const el = file.type.startsWith("audio")
      ? document.createElement("audio")
      : document.createElement("video");
    el.src = this.objectUrl;
    el.preload = "auto";
    el.muted = false;
    el.volume = 1;
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
    recognition.onerror = (event) => this.handleError(event);
    recognition.onend = () => this.handleEnd();
    recognition.onstart = () => {
      this.noSpeechCount = 0;
    };
    this.recognition = recognition;

    await this.waitForReady(el);

    const durationMs = (el.duration || 0) * 1000;

    el.addEventListener("timeupdate", () => {
      const currentMs = (el.currentTime || 0) * 1000;
      this.progress =
        durationMs > 0 ? Math.min(0.999, currentMs / durationMs) : 0;
      this.emitUpdate();
    });
    el.addEventListener("ended", () => {
      this.progress = 1;
      this.finish();
    });
    el.addEventListener("error", () => {
      this.fail("Could not decode this media file. Try a different format.");
    });

    this.setStatus("running");
    this.emitUpdate();

    try {
      recognition.start();
    } catch {
      /* may already be running */
    }
    this.currentSegmentStartMs = 0;

    try {
      await el.play();
    } catch {
      this.fail(
        "Playback was blocked. Click Transcribe again to allow audio playback.",
      );
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
        this.currentSegmentStartMs = currentMs;
        this.noSpeechCount = 0;
      } else {
        interimText += transcript;
      }
    }
    this.interim = interimText;
    this.emitUpdate();
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    switch (event.error) {
      case "no-speech":
        // Recognition ended because it didn't hear anything. Track this; if it
        // keeps happening with zero results, warn the user.
        this.noSpeechCount++;
        if (
          this.noSpeechCount >= 4 &&
          !this.warnedNoSpeech &&
          this.entries.length === 0
        ) {
          this.warnedNoSpeech = true;
          this.callbacks.onError?.(
            "No speech detected. Make sure your volume is up so the mic can hear the audio, and that you're in a quiet environment.",
          );
        }
        break;
      case "aborted":
        break;
      case "not-allowed":
      case "service-not-allowed":
        this.fail(
          "Microphone access was blocked. Allow microphone access in your browser to transcribe audio.",
        );
        break;
      case "audio-capture":
        this.fail("No microphone was found. Connect a mic to transcribe audio.");
        break;
      case "network":
        this.fail(
          "Speech recognition lost its network connection (the Web Speech API needs internet for its model).",
        );
        break;
      default:
        // other transient errors — don't abort, recognition will restart
        break;
    }
  }

  private handleEnd(): void {
    // Auto-restart while media still playing. Use a small delay to avoid
    // tight restart loops.
    if (this.stopped) return;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.stopped || !this.recognition || !this.mediaEl) return;
      if (this.mediaEl.ended) {
        this.finish();
        return;
      }
      try {
        this.recognition.start();
      } catch {
        /* already started */
      }
    }, 250);
  }

  private pushEntry(text: string, startMs: number, endMs: number): void {
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
    if (endMs <= startMs) endMs = startMs + 1500;
    const entry: SubtitleEntry = {
      index: this.entries.length + 1,
      start: Math.round(startMs),
      end: Math.round(endMs),
      text,
    };
    this.entries.push(entry);
    this.callbacks.onEntry?.(entry);
    this.emitUpdate();
  }

  private setStatus(status: TranscriptionStatus): void {
    this.status = status;
  }

  private emitUpdate(message?: string): void {
    this.callbacks.onUpdate?.({
      status: this.status,
      entries: [...this.entries],
      progress: this.progress,
      interim: this.interim,
      message,
    });
  }

  private fail(message: string): void {
    if (this.stopped) return;
    this.stopped = true;
    this.setStatus("error");
    this.callbacks.onError?.(message);
    this.emitUpdate(message);
    this.cleanup();
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
    this.emitUpdate();
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
    this.emitUpdate();
  }

  stop(): void {
    if (this.stopped) return;
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
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.setStatus("done");

    if (this.entries.length === 0) {
      this.callbacks.onError?.(
        "No speech was transcribed. Make sure the audio plays out loud, your microphone can hear it, and you're in a quiet environment. The Web Speech API needs an internet connection for its model.",
      );
    }
    this.callbacks.onComplete?.(this.entries);
    this.emitUpdate(
      this.entries.length === 0
        ? "No speech transcribed"
        : `Generated ${this.entries.length} entries`,
    );
    this.cleanup();
  }

  private cleanup(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
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
