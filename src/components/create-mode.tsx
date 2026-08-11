"use client";

import * as React from "react";
import {
  Captions,
  Download,
  Loader2,
  Mic,
  Play,
  Square,
  Sparkles,
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
} from "@/lib/transcribe";
import { getTranscriptionSizeLimit } from "@/lib/mobile";
import { SubtitleList } from "@/components/subtitle-list";
import { FileInfoBar } from "@/components/extract-mode";

interface CreateModeProps {
  file: File;
  onRemove: () => void;
}

export function CreateMode({ file, onRemove }: CreateModeProps) {
  const [lang, setLang] = React.useState("en-US");
  const [status, setStatus] = React.useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = React.useState(0);
  const [entries, setEntries] = React.useState<SubtitleEntry[]>([]);
  const [interim, setInterim] = React.useState("");
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
    setStatus("preparing");

    const transcriber = new AudioTranscriber(lang, {
      onStatus: setStatus,
      onProgress: (ratio) => setProgress(Math.round(ratio * 100)),
      onEntry: (entry) => {
        setEntries((prev) => reindex([...prev, entry]));
      },
      onInterim: (text) => setInterim(text),
      onError: (msg) => {
        setError(msg);
        toast.error("Transcription error", { description: msg });
      },
      onComplete: (finalEntries) => {
        setEntries(reindex(finalEntries));
        toast.success("Transcription complete", {
          description: `${finalEntries.length} subtitle entries generated.`,
        });
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

      {/* Controls */}
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
              <Square className="size-4" />
              Stop
            </Button>
          )}
        </div>

        {!supported && (
          <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            Web Speech API isn&apos;t available in this browser. Use Chrome,
            Edge, or Safari to transcribe.
          </p>
        )}

        {tooLarge && (
          <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
            File is {formatBytes(file.size)}. Limit is{" "}
            {formatBytes(getTranscriptionSizeLimit())} on this device.
          </p>
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
      </div>

      {/* Editable results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {entries.length === 0 && !running ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
            <Play className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No subtitles yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Click <span className="font-medium text-emerald-600">Transcribe Audio</span> to
              generate timed subtitles from this file&apos;s audio.
            </p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              The file plays audibly so the speech engine can hear it. Keep your
              tab open and your mic available.
            </p>
          </div>
        ) : (
          <SubtitleList
            entries={entries}
            onChange={(next) => setEntries(reindex(next))}
            className="min-h-0 flex-1"
            emptyLabel="Listening…"
          />
        )}
      </div>

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
