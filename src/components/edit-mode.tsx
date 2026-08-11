"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Clock,
  Combine,
  Download,
  Languages,
  Plus,
  RefreshCw,
  Scissors,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  detectFormat,
  formatBytes,
  type SubtitleEntry,
  type SubtitleFormat,
} from "@/lib/subtitle";
import {
  COMMON_FPS,
  convertFps,
  fixEncoding,
  mergeEntries,
  parseSRT,
  reindex,
  searchReplace,
  serializeSRT,
  shiftEntries,
  splitLongEntries,
} from "@/lib/srt";
import { parseVTT, serializeVTT } from "@/lib/vtt";
import { parseASS } from "@/lib/ass";
import { downloadTextFile } from "@/lib/download";
import { SubtitleList } from "@/components/subtitle-list";
import { FileInfoBar } from "@/components/extract-mode";

interface EditModeProps {
  file: File;
  onRemove: () => void;
}

function parseEntries(text: string, fmt: SubtitleFormat): SubtitleEntry[] {
  if (fmt === "vtt") return parseVTT(text);
  if (fmt === "ass") return parseASS(text);
  return parseSRT(text);
}

export function EditMode({ file, onRemove }: EditModeProps) {
  const [originalText, setOriginalText] = React.useState("");
  const [format, setFormat] = React.useState<SubtitleFormat>("srt");
  const [entries, setEntries] = React.useState<SubtitleEntry[]>([]);
  const [shiftValue, setShiftValue] = React.useState("2");
  const [search, setSearch] = React.useState("");
  const [replace, setReplace] = React.useState("");
  const [fromFps, setFromFps] = React.useState("23.976");
  const [toFps, setToFps] = React.useState("25");
  const [replaceCount, setReplaceCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    file.text().then((text) => {
      if (cancelled) return;
      const fmt = detectFormat(file.name, text);
      setOriginalText(text);
      setFormat(fmt);
      setEntries(parseEntries(text, fmt));
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // --- Quick fixes ---
  function applyShift(seconds: number) {
    setEntries((prev) => reindex(shiftEntries(prev, seconds)));
    toast.success(`Shifted ${seconds > 0 ? "+" : ""}${seconds}s`, {
      description: `All ${entries.length} entries re-timed.`,
    });
  }

  function applyShiftFromInput() {
    const n = parseFloat(shiftValue);
    if (Number.isNaN(n) || n === 0) {
      toast.error("Enter a non-zero number of seconds");
      return;
    }
    applyShift(n);
  }

  function applyFixEncoding() {
    const fixed = fixEncoding(originalText);
    const next = parseEntries(fixed, format);
    setEntries(next);
    setOriginalText(fixed);
    toast.success("Encoding repaired", {
      description: `Re-parsed ${next.length} entries as UTF-8.`,
    });
  }

  function applyMerge() {
    setEntries((prev) => reindex(mergeEntries(prev)));
    toast.success("Lines merged");
  }

  function applySplit() {
    setEntries((prev) => reindex(splitLongEntries(prev)));
    toast.success("Long lines split");
  }

  function applyFps() {
    const from = parseFloat(fromFps);
    const to = parseFloat(toFps);
    if (!from || !to || from === to) {
      toast.error("Pick different frame rates");
      return;
    }
    setEntries((prev) => reindex(convertFps(prev, from, to)));
    toast.success(`FPS ${from} → ${to}`, {
      description: "Timing rescaled to match the new frame rate.",
    });
  }

  function applySearchReplace() {
    if (!search) {
      toast.error("Enter text to search");
      return;
    }
    const { entries: next, replacements } = searchReplace(
      entries,
      search,
      replace,
    );
    setEntries(next);
    setReplaceCount(replacements);
    toast.success(
      `Replaced ${replacements} match${replacements !== 1 ? "es" : ""}`,
      {
        description: search,
      },
    );
  }

  function resetAll() {
    const fmt = detectFormat(file.name, originalText);
    file.text().then((text) => {
      setOriginalText(text);
      setFormat(fmt);
      setEntries(parseEntries(text, fmt));
      setReplaceCount(0);
      toast.success("Reverted to original file");
    });
  }

  function download(formatOut: "srt" | "vtt") {
    const content =
      formatOut === "vtt" ? serializeVTT(entries) : serializeSRT(entries);
    const base = file.name.replace(/\.[^.]+$/, "");
    const name = `${base}.${formatOut}`;
    downloadTextFile(
      content,
      name,
      formatOut === "vtt"
        ? "text/vtt;charset=utf-8"
        : "application/x-subrip;charset=utf-8",
    );
    toast.success(`Downloaded ${name}`);
  }

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden">
      <FileInfoBar file={file} onRemove={onRemove} />

      {/* Quick fixes */}
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick fixes
          </Label>
          <QuickFixButton onClick={() => applyShift(2)}>
            <Clock className="size-3" /> +2s
          </QuickFixButton>
          <QuickFixButton onClick={() => applyShift(-2)}>
            <Clock className="size-3" /> −2s
          </QuickFixButton>
          <QuickFixButton onClick={applyFixEncoding}>
            <Languages className="size-3" /> Fix Encoding
          </QuickFixButton>
          <QuickFixButton onClick={applyMerge}>
            <Combine className="size-3" /> Merge
          </QuickFixButton>
          <QuickFixButton onClick={applySplit}>
            <Scissors className="size-3" /> Split Long
          </QuickFixButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.1"
              value={shiftValue}
              onChange={(e) => setShiftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyShiftFromInput();
              }}
              className="h-7 w-20 px-2 py-0 text-xs"
              aria-label="Seconds to shift"
            />
            <span className="text-[11px] text-muted-foreground">s</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => applyShiftFromInput()}
            >
              <ArrowLeftRight className="size-3" /> Shift
            </Button>
          </div>

          <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

          <Select value={fromFps} onValueChange={setFromFps}>
            <SelectTrigger className="h-7 w-[88px] px-2 py-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_FPS.map((f) => (
                <SelectItem key={f} value={String(f)}>
                  {f} fps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">→</span>
          <Select value={toFps} onValueChange={setToFps}>
            <SelectTrigger className="h-7 w-[88px] px-2 py-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_FPS.map((f) => (
                <SelectItem key={f} value={String(f)}>
                  {f} fps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={applyFps}
          >
            Convert
          </Button>
        </div>

        {/* Search & replace */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-1 items-center gap-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-7 flex-1 px-2 py-0 text-xs"
            />
            <Input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace"
              className="h-7 flex-1 px-2 py-0 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={applySearchReplace}
            disabled={!search}
          >
            <Search className="size-3" /> Replace all
          </Button>
        </div>
      </div>

      {/* Entry count + reset */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground">
          {entries.length} entries
          {replaceCount > 0 && ` · ${replaceCount} replaced`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={resetAll}
        >
          <RefreshCw className="size-3" /> Revert
        </Button>
      </div>

      {/* Editable list */}
      <SubtitleList
        entries={entries}
        onChange={(next) => setEntries(reindex(next))}
        className="min-h-0 flex-1"
        emptyLabel="No subtitle entries parsed from this file."
      />

      {/* Download bar */}
      <div className="flex items-center gap-2 border-t pt-2">
        <Button
          size="sm"
          className="h-8 flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => download("srt")}
        >
          <Download className="size-3.5" /> Download SRT
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          onClick={() => download("vtt")}
        >
          <Download className="size-3.5" /> Download VTT
        </Button>
      </div>
    </div>
  );
}

function QuickFixButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export { Plus as EditIcon };
export { formatBytes };
