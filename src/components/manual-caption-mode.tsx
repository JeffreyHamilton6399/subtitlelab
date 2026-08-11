"use client";

import * as React from "react";
import { Plus, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSrtTimecode, reindex, type SubtitleEntry } from "@/lib/subtitle";
import { SubtitleList } from "@/components/subtitle-list";

interface ManualCaptionModeProps {
  file: File;
  entries: SubtitleEntry[];
  onChange: (entries: SubtitleEntry[]) => void;
}

export function ManualCaptionMode({
  file,
  entries,
  onChange,
}: ManualCaptionModeProps) {
  const mediaRef = React.useRef<HTMLMediaElement | null>(null);
  const objectUrl = React.useRef<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    const el = mediaRef.current;
    if (el) {
      el.src = url;
      el.load();
    }
    return () => {
      URL.revokeObjectURL(url);
      objectUrl.current = null;
    };
  }, [file]);

  function handleAddAtPlayhead() {
    const el = mediaRef.current;
    if (!el) return;
    const start = Math.max(0, el.currentTime * 1000);
    const end = start + 2500;
    const newEntry: SubtitleEntry = {
      index: 0,
      start: Math.round(start),
      end: Math.round(end),
      text: "",
    };
    onChange(reindex([...entries, newEntry]));
    // pause so user can type
    el.pause();
  }

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  const isAudio = file.type.startsWith("audio");
  const Tag = (isAudio ? "audio" : "video") as "video" | "audio";

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden">
      {/* Visible media player */}
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2.5">
        <div className="overflow-hidden rounded-md bg-black">
          <Tag
            ref={mediaRef as never}
            controls
            className="max-h-48 w-full"
            onTimeUpdate={(e) =>
              setCurrentTime((e.currentTarget as HTMLMediaElement).currentTime * 1000)
            }
            onLoadedMetadata={(e) =>
              setDuration((e.currentTarget as HTMLMediaElement).duration * 1000)
            }
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={togglePlay}
            type="button"
          >
            {playing ? (
              <>
                <Square className="size-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Play
              </>
            )}
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {formatSrtTimecode(currentTime)}
            {duration > 0 && (
              <>
                {" "}
                / {formatSrtTimecode(duration)}
              </>
            )}
          </span>
          <Button
            className="ml-auto h-8 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleAddAtPlayhead}
            type="button"
          >
            <Plus className="size-3.5" />
            Add subtitle at playhead
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Play the media, then click{" "}
          <span className="font-medium text-emerald-600">Add subtitle at playhead</span>{" "}
          wherever you want a caption. Type the text, repeat. No mic needed.
        </p>
      </div>

      <SubtitleList
        entries={entries}
        onChange={(next) => onChange(reindex(next))}
        className="min-h-0 flex-1"
        emptyLabel="No subtitles yet — play the media and add one at the playhead."
      />
    </div>
  );
}
