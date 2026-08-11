"use client";

import * as React from "react";
import {
  Captions,
  Download,
  Loader2,
  Mic,
  Hand,
  Sparkles,
  Wifi,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { formatBytes, reindex, type SubtitleEntry } from "@/lib/subtitle";
import { serializeSRT } from "@/lib/srt";
import { serializeVTT } from "@/lib/vtt";
import { downloadTextFile } from "@/lib/download";
import {
  isWhisperSupported,
  transcribeWithWhisper,
} from "@/lib/transcribe-whisper";
import { getTranscriptionSizeLimit } from "@/lib/mobile";
import { SubtitleList } from "@/components/subtitle-list";
import { ManualCaptionMode } from "@/components/manual-caption-mode";
import { FileInfoBar } from "@/components/extract-mode";

interface CreateModeProps {
  file: File;
  onRemove: () => void;
}

type SubMode = "auto" | "manual";

export function CreateMode({ file, onRemove }: CreateModeProps) {
  const [subMode, setSubMode] = React.useState<SubMode>("auto");
  const [entries, setEntries] = React.useState<SubtitleEntry[]>([]);
  const [status, setStatus] = React.useState<
    "idle" | "decoding" | "loading-model" | "transcribing" | "done" | "error"
  >("idle");
  const [progress, setProgress] = React.useState(0);
  const [statusMsg, setStatusMsg] = React.useState("");
  const [error, setError] = React.useState("");

  const tooLarge = file.size > getTranscriptionSizeLimit();
  const supported = isWhisperSupported();

  async function startTranscription() {
    setError("");
    setEntries([]);
    setProgress(0);
    setStatusMsg("Decoding audio…");
    setStatus("decoding");

    let phaseLabel = "Decoding audio…";
    try {
      const result = await transcribeWithWhisper(file, {
        language: "en",
        task: "transcribe",
        onProgress: (info) => {
          if (info.status === "decoding") {
            phaseLabel = "Decoding audio…";
            setProgress(0.05);
          } else if (info.status === "decoded") {
            phaseLabel = "Audio decoded";
            setProgress(0.1);
          } else if (
            info.status === "initiate" ||
            info.status === "download"
          ) {
            phaseLabel = info.name
              ? `Downloading model: ${info.name.split("/").pop()}`
              : "Downloading speech model…";
            setProgress(
              typeof info.progress === "number" ? 0.1 + info.progress * 0.5 : 0.2,
            );
          } else if (info.status === "progress" && info.loaded && info.total) {
            phaseLabel = "Downloading speech model…";
            setProgress(0.1 + (info.loaded / info.total) * 0.5);
          } else if (info.status === "ready" || info.status === "loaded") {
            phaseLabel = "Model ready — transcribing…";
            setProgress(0.6);
          } else if (info.status === "transcribing") {
            phaseLabel = "Transcribing audio…";
            setProgress(typeof info.progress === "number" ? info.progress : 0.7);
          } else if (info.status === "done") {
            phaseLabel = "Finalising…";
            setProgress(0.95);
          }
          setStatusMsg(phaseLabel);
          setStatus(
            info.status === "transcribing" ? "transcribing" : "loading-model",
          );
        },
      });

      setEntries(reindex(result.entries));
      setProgress(1);
      setStatus("done");
      setStatusMsg("");

      if (result.entries.length > 0) {
        toast.success("Transcription complete", {
          description: `${result.entries.length} subtitle entries generated locally.`,
        });
      } else {
        setError(
          "No speech detected in this audio. Try Manual mode to caption by hand.",
        );
      }
    } catch (e) {
      setError((e as Error).message || "Transcription failed.");
      setStatus("error");
      toast.error("Transcription failed", {
        description: (e as Error).message,
      });
    }
  }

  function download(format: "srt" | "vtt") {
    if (entries.length === 0) return;
    const content =
      format === "vtt" ? serializeVTT(entries) : serializeSRT(entries);
    const base = file.name.replace(/\.[^.]+$/, "");
    const name = `${base}.${format}`;
    downloadTextFile(
      content,
      name,
      format === "vtt"
        ? "text/vtt;charset=utf-8"
        : "application/x-subrip;charset=utf-8",
    );
    toast.success(`Downloaded ${name}`);
  }

  const running =
    status === "decoding" ||
    status === "loading-model" ||
    status === "transcribing";

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden">
      <FileInfoBar file={file} onRemove={onRemove} />

      {/* Sub-mode toggle */}
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          value={subMode}
          onValueChange={(v) => {
            if (v === "auto" || v === "manual") {
              if (running) return;
              setSubMode(v);
              setError("");
              setStatusMsg("");
              setStatus("idle");
            }
          }}
          className="gap-1"
        >
          <ToggleGroupItem
            value="auto"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={running}
          >
            <Mic className="size-3.5" />
            Auto
          </ToggleGroupItem>
          <ToggleGroupItem
            value="manual"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={running}
          >
            <Hand className="size-3.5" />
            Manual
          </ToggleGroupItem>
        </ToggleGroup>

        <span className="text-[11px] text-muted-foreground">
          {entries.length} entries
        </span>
      </div>

      {subMode === "manual" ? (
        <ManualCaptionMode
          file={file}
          entries={entries}
          onChange={setEntries}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-2.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Auto-transcription
                </Label>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Runs locally — no mic, no server
                </p>
              </div>

              {!running ? (
                <Button
                  className="h-9 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                  onClick={startTranscription}
                  disabled={!supported || tooLarge}
                >
                  <Mic className="size-4" />
                  Transcribe Audio
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-9 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
                  onClick={() => window.location.reload()}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Privacy notice */}
            {status === "idle" && supported && !tooLarge && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <p className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-3.5 shrink-0" />
                  Truly private transcription.
                </p>
                <p className="mt-0.5 pl-5 text-emerald-700 dark:text-emerald-400/90">
                  The Whisper speech model (~150&nbsp;MB) downloads once and runs
                  entirely in your browser. Your audio never leaves your device.
                </p>
                <p className="mt-1 flex items-center gap-1.5 pl-5 text-emerald-700/80 dark:text-emerald-400/70">
                  <Wifi className="size-3" />
                  Only needed for the first load — cached afterwards.
                </p>
              </div>
            )}

            {!supported && (
              <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Your browser doesn&apos;t support the Web Audio API. Switch to{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => setSubMode("manual")}
                >
                  Manual mode
                </button>
                .
              </p>
            )}

            {tooLarge && (
              <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                File is {formatBytes(file.size)}. Limit is{" "}
                {formatBytes(getTranscriptionSizeLimit())} on this device.
              </p>
            )}

            {error && (
              <div className="rounded-md bg-rose-50 px-2.5 py-2 text-[11px] leading-relaxed text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                <p>{error}</p>
                <p className="mt-1">
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2"
                    onClick={() => setSubMode("manual")}
                  >
                    Switch to Manual mode →
                  </button>
                </p>
              </div>
            )}

            {running && (
              <div className="flex flex-col gap-1">
                <Progress
                  value={Math.round(progress * 100)}
                  className="h-1.5 bg-emerald-100 dark:bg-emerald-950/50"
                />
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin text-emerald-500" />
                  {statusMsg} {Math.round(progress * 100)}%
                </p>
              </div>
            )}

            {status === "done" && entries.length > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-3" />
                Generated {entries.length} entries locally. Edit above, then
                download.
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SubtitleList
              entries={entries}
              onChange={(next) => setEntries(reindex(next))}
              className="min-h-0 flex-1"
              emptyLabel="Click Transcribe Audio to generate subtitles locally."
            />
          </div>
        </>
      )}

      {/* Download */}
      <div className="flex items-center gap-2 border-t pt-2">
        <Button
          size="sm"
          className="h-8 flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => download("srt")}
          disabled={entries.length === 0}
        >
          <Download className="size-3.5" /> Download SRT
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          onClick={() => download("vtt")}
          disabled={entries.length === 0}
        >
          <Captions className="size-3.5" /> Download VTT
        </Button>
      </div>
    </div>
  );
}

// Local label component (kept here to avoid an extra import cycle).
function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground " +
        (className || "")
      }
    >
      {children}
    </span>
  );
}
