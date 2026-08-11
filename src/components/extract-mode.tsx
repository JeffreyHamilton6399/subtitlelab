"use client";

import * as React from "react";
import {
  Captions,
  Download,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatBytes } from "@/lib/subtitle";
import {
  extractSubtitleTrack,
  listSubtitleTracks,
  loadFFmpeg,
  type ExtractResult,
  type SubtitleTrack,
} from "@/lib/extract-subtitles";
import { getExtractionSizeLimit } from "@/lib/mobile";
import { downloadTextFile } from "@/lib/download";

interface ExtractModeProps {
  file: File;
  onRemove: () => void;
}

export function ExtractMode({ file, onRemove }: ExtractModeProps) {
  const [tracks, setTracks] = React.useState<SubtitleTrack[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [format, setFormat] = React.useState<"srt" | "vtt">("srt");
  const [phase, setPhase] = React.useState<
    "loading" | "ready" | "extracting" | "done" | "error"
  >("loading");
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<ExtractResult | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");

  const tooLarge = file.size > getExtractionSizeLimit();

  const loadTracks = React.useCallback(async () => {
    setPhase("loading");
    setTracks([]);
    setSelected("");
    setResult(null);
    setErrorMsg("");
    setProgress(0);
    try {
      await loadFFmpeg();
      const found = await listSubtitleTracks(file);
      setTracks(found);
      if (found.length > 0) {
        const def = found.find((t) => t.defaultFlag) ?? found[0];
        setSelected(String(def.index));
      }
      setPhase("ready");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPhase("error");
    }
  }, [file]);

  React.useEffect(() => {
    if (tooLarge) {
      setPhase("error");
      setErrorMsg(
        `File is ${formatBytes(file.size)}. Limit is ${formatBytes(
          getExtractionSizeLimit(),
        )} on this device.`,
      );
      return;
    }
    loadTracks();
  }, [file, tooLarge, loadTracks]);

  async function handleExtract() {
    const track = tracks.find((t) => String(t.index) === selected);
    if (!track) return;
    setPhase("extracting");
    setProgress(0);
    setResult(null);
    try {
      const res = await extractSubtitleTrack(
        file,
        track,
        format,
        (r) => setProgress(Math.round(r * 100)),
      );
      setResult(res);
      setPhase("done");
      toast.success("Subtitle extracted", {
        description: `${res.name} · ${formatBytes(res.size)}`,
      });
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPhase("error");
      toast.error("Extraction failed", { description: (e as Error).message });
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <FileInfoBar file={file} onRemove={onRemove} />

      {phase === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Loading ffmpeg.wasm &amp; scanning for subtitle tracks…
          </p>
          <p className="text-[11px] text-muted-foreground">
            First load downloads the engine (~25&nbsp;MB) and stays cached.
            This can take 10–30 seconds on slow connections.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rose-300 p-6 text-center dark:border-rose-900">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {errorMsg || "Something went wrong."}
          </p>
          {!tooLarge && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={loadTracks}
              >
                <RefreshCw className="size-3.5" />
                Retry scan
              </Button>
            </div>
          )}
          <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            Extraction needs to download the ffmpeg engine on first use. If it
            keeps failing, switch to the <strong>Create</strong> tab to
            transcribe the audio instead.
          </p>
        </div>
      )}

      {(phase === "ready" || phase === "extracting" || phase === "done") && (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {tracks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 p-6 text-center dark:border-amber-900">
              <Film className="size-6 text-amber-500" />
              <p className="text-sm font-medium">No subtitle tracks found</p>
              <p className="text-xs text-muted-foreground">
                This video has no embedded subtitle streams to extract.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Try the Create tab to transcribe audio instead.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tracks.length} subtitle track
                  {tracks.length !== 1 ? "s" : ""} found
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={loadTracks}
                  disabled={phase === "extracting"}
                >
                  <RefreshCw className="size-3" />
                  Rescan
                </Button>
              </div>
              <RadioGroup
                value={selected}
                onValueChange={setSelected}
                className="scrollbar-thin flex max-h-44 flex-col gap-1 overflow-y-auto pr-1"
              >
                {tracks.map((t) => (
                  <label
                    key={t.index}
                    htmlFor={`track-${t.index}`}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2 text-sm transition-colors hover:bg-muted/50 data-[state=checked]:border-emerald-400"
                  >
                    <RadioGroupItem
                      value={String(t.index)}
                      id={`track-${t.index}`}
                      className="data-[state=checked]:border-emerald-500 data-[state=checked]:text-emerald-500"
                    />
                    <span className="flex size-6 items-center justify-center rounded bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                      {t.language}
                    </span>
                    <span className="flex-1 truncate">
                      {t.title || `Track ${t.streamIndex + 1}`}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t.codec}
                    </span>
                    {t.defaultFlag && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        default
                      </span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {tracks.length > 0 && (
            <div className="flex flex-col gap-3 border-t pt-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Output format
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={format}
                    onValueChange={(v) => {
                      if (v === "srt" || v === "vtt") setFormat(v);
                    }}
                    className="gap-1"
                  >
                    <ToggleGroupItem value="srt" className="h-8 px-3 text-xs">
                      .srt
                    </ToggleGroupItem>
                    <ToggleGroupItem value="vtt" className="h-8 px-3 text-xs">
                      .vtt
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button
                  className="h-9 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                  onClick={handleExtract}
                  disabled={phase === "extracting" || !selected}
                >
                  {phase === "extracting" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Extracting… {progress}%
                    </>
                  ) : (
                    <>
                      <Captions className="size-4" />
                      Extract Subtitle
                    </>
                  )}
                </Button>
              </div>

              {phase === "extracting" && (
                <Progress value={progress} className="h-1.5 bg-emerald-100" />
              )}

              {phase === "done" && result && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                    <Captions className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(result.size)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() =>
                      downloadTextFile(
                        result.content,
                        result.name,
                        format === "vtt"
                          ? "text/vtt;charset=utf-8"
                          : "application/x-subrip;charset=utf-8",
                      )
                    }
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileInfoBar({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 p-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Film className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatBytes(file.size)} · {file.type || "video"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-rose-600"
        onClick={onRemove}
        title="Remove file"
        aria-label="Remove file"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export { FileInfoBar };
export const ExtractIcon = Plus;
