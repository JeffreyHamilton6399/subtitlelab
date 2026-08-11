"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  formatSrtTimecode,
  parseTimecodeToMs,
  type SubtitleEntry,
} from "@/lib/subtitle";

interface SubtitleListProps {
  entries: SubtitleEntry[];
  onChange: (entries: SubtitleEntry[]) => void;
  className?: string;
  emptyLabel?: string;
}

export function SubtitleList({
  entries,
  onChange,
  className,
  emptyLabel = "No subtitles yet",
}: SubtitleListProps) {
  function updateEntry(index: number, patch: Partial<SubtitleEntry>) {
    onChange(
      entries.map((e) => (e.index === index ? { ...e, ...patch } : e)),
    );
  }

  function removeEntry(index: number) {
    onChange(entries.filter((e) => e.index !== index));
  }

  function addAfter(index: number) {
    const target = entries.find((e) => e.index === index);
    if (!target) return;
    const start = target.end + 1;
    const end = start + 2000;
    const newEntry: SubtitleEntry = {
      index: 0,
      start,
      end,
      text: "",
    };
    const reordered = [...entries];
    const pos = reordered.findIndex((e) => e.index === index);
    reordered.splice(pos + 1, 0, newEntry);
    onChange(
      reordered.map((e, i) => ({ ...e, index: i + 1 })),
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "scrollbar-thin flex flex-col gap-1.5 overflow-y-auto pr-1",
        className,
      )}
    >
      {entries.map((entry) => (
        <SubtitleRow
          key={entry.index}
          entry={entry}
          onChange={(patch) => updateEntry(entry.index, patch)}
          onRemove={() => removeEntry(entry.index)}
          onAddAfter={() => addAfter(entry.index)}
        />
      ))}
    </div>
  );
}

function SubtitleRow({
  entry,
  onChange,
  onRemove,
  onAddAfter,
}: {
  entry: SubtitleEntry;
  onChange: (patch: Partial<SubtitleEntry>) => void;
  onRemove: () => void;
  onAddAfter: () => void;
}) {
  const [startText, setStartText] = React.useState(
    formatSrtTimecode(entry.start),
  );
  const [endText, setEndText] = React.useState(formatSrtTimecode(entry.end));

  React.useEffect(() => {
    setStartText(formatSrtTimecode(entry.start));
  }, [entry.start]);
  React.useEffect(() => {
    setEndText(formatSrtTimecode(entry.end));
  }, [entry.end]);

  function commitStart() {
    const ms = parseTimecodeToMs(startText);
    if (!Number.isNaN(ms)) onChange({ start: ms });
    else setStartText(formatSrtTimecode(entry.start));
  }
  function commitEnd() {
    const ms = parseTimecodeToMs(endText);
    if (!Number.isNaN(ms)) onChange({ end: ms });
    else setEndText(formatSrtTimecode(entry.end));
  }

  return (
    <div className="group rounded-md border bg-card p-2 transition-colors focus-within:border-emerald-400 hover:border-border">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
          {entry.index}
        </span>
        <div className="flex flex-1 items-center gap-1">
          <input
            value={startText}
            onChange={(e) => setStartText(e.target.value)}
            onBlur={commitStart}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            spellCheck={false}
            aria-label="Start time"
            className="w-[95px] rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] outline-none focus:border-border focus:bg-background"
          />
          <span className="text-muted-foreground">→</span>
          <input
            value={endText}
            onChange={(e) => setEndText(e.target.value)}
            onBlur={commitEnd}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            spellCheck={false}
            aria-label="End time"
            className="w-[95px] rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] outline-none focus:border-border focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={onAddAfter}
            title="Add subtitle after"
            aria-label="Add subtitle after"
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-rose-600"
            onClick={onRemove}
            title="Delete subtitle"
            aria-label="Delete subtitle"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <textarea
        value={entry.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={Math.min(4, Math.max(1, entry.text.split("\n").length))}
        spellCheck
        placeholder="Subtitle text…"
        className="w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm leading-snug outline-none focus:border-border focus:bg-background"
      />
    </div>
  );
}
