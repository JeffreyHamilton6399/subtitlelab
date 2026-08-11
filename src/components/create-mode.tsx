"use client";

import * as React from "react";
import {
  Captions,
  Download,
  Loader2,
  Mic,
  Hand,
  Sparkles,
  Volume2,
  MicOff,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { formatBytes, reindex, type SubtitleEntry } from "@/lib/subtitle";
import { serializeSRT } from "@/lib/srt";
import { serializeVTT } from "@/lib/vtt";
import { downloadTextFile } from "@/lib/download";
import {
  AudioTranscriber,
  isTranscriptionSupported,
  TRANSCRIPTION_LANGUAGES,
  type TranscriptionStatus,
  type TranscriptionUpdate,
} from "@/lib/transcribe";
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
  const [lang, setLang] = React.useState("en-US");
  const [status, setStatus] = React.useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = React.useState(0);
  const [entries, setEntries] = React.useState<SubtitleEntry[]>([]);
  const [interim, setInterim] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const transcriberRef = React.useRef<AudioTranscriber | null>(null);

  const tooLarge = file.size > getTranscriptionSizeLimit();
  const supported = isTranscriptionSupported();

  React.useEffect(() => {
    return () => {
      transcriberRef.current?.dispose();
      transcriberRef.current = null;
    };
  }, []);

  async function startTranscription() {
    setError("");
    setEntries([]);
    setInterim("");
    setProgress(0);
    setMessage("");
    setStatus("preparing");

    const transcriber = new AudioTranscriber(lang, {
      onUpdate: (u: TranscriptionUpdate) => {
        setStatus(u.status);
        setProgress(Math.round(u.progress * 100));
        setEntries(reindex(u.entries));
        setInterim(u.interim);
        if (u.message) setMessage(u.message);
      },
      onEntry: () => {},
      onError: (msg) => {
        setError(msg);
      },
      onComplete: (finalEntries) => {
        setEntries(reindex(finalEntries));
        if (finalEntries.length > 0) {
          toast.success("Transcription complete", {
            description: `${finalEntries.length} subtitle entries generated.`,
          });
        }
      },
    });
    transcriberRef.current = transcriber;
    await transcriber.transcribe(file);
  }

  function stopTranscription() {
    transcriberRef.current?.stop();
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

  const running = status === "running" || status === "preparing";

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden">
      <FileInfoBar file={file} onRemove={onRemove} />

      {/* Sub-mode toggle: Auto vs Manual */}
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          value={subMode}
          onValueChange={(v) => {
            if (v === "auto" || v === "manual") {
              if (running) return;
              setSubMode(v);
              setError("");
              setMessage("");
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
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Language
                </Label>
                <Select value={lang} onValueChange={setLang} disabled={running}>
                  <SelectTrigger className="h-8 w-[180px] px-2 py-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSCRIPTION_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onClick={stopTranscription}
                >
                  <Captions className="size-4" />
                  Stop
                </Button>
              )}
            </div>

            {status === "idle" && supported && !tooLarge && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="flex items-center gap-1.5 font-medium">
                  <Volume2 className="size-3.5 shrink-0" />
                  Audio plays out loud — the mic listens.
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5 text-amber-700 dark:text-amber-400/90">
                  <span className="inline-flex items-center gap-1">
                    <MicOff className="size-3" /> Allow mic access
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="size-3" /> Turn up your volume
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wifi className="size-3" /> Stay online
                  </span>
                </p>
                <p className="mt-1 pl-5 text-amber-700/80 dark:text-amber-400/70">
                  Mic blocked or no speech detected? Switch to{" "}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2"
                    onClick={() => setSubMode("manual")}
                  >
                    Manual mode
                  </button>{" "}
                  — it works without a mic.
                </p>
              </div>
            )}

            {!supported && (
              <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Web Speech API isn&apos;t available in this browser. Switch to{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => setSubMode("manual")}
                >
                  Manual mode
                </button>{" "}
                to create subtitles by typing.
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
                  value={progress}
                  className="h-1.5 bg-emerald-100 dark:bg-emerald-950/50"
                />
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin text-emerald-500" />
                  {status === "preparing"
                    ? "Preparing media…"
                    : `Transcribing · ${progress}%`}
                  {interim && (
                    <span className="truncate italic">“{interim}”</span>
                  )}
                </p>
              </div>
            )}

            {status === "done" && entries.length > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-3" />
                Generated {entries.length} entries. Edit above, then download.
              </p>
            )}

            {status === "done" && entries.length === 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                <Sparkles className="size-3" />
                {message || "No speech was transcribed."} Switch to Manual mode
                to create subtitles by typing.
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SubtitleList
              entries={entries}
              onChange={(next) => setEntries(reindex(next))}
              className="min-h-0 flex-1"
              emptyLabel="Listening…"
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
