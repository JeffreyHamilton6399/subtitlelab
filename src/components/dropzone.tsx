"use client";

import * as React from "react";
import { ShieldCheck, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  isSubtitleFile,
  isVideoFile,
  isAudioFile,
} from "@/lib/subtitle";

interface DropzoneProps {
  onFile: (file: File) => void;
  className?: string;
}

const ACCEPTED =
  ".mp4,.mkv,.avi,.mov,.webm,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.srt,.vtt,.ass,.ssa";

export function Dropzone({ onFile, className }: DropzoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function validate(file: File): boolean {
    const ok =
      isVideoFile(file.name) ||
      isAudioFile(file.name) ||
      isSubtitleFile(file.name);
    if (!ok) {
      toast.error("Unsupported file", {
        description:
          "Drop a video (mp4/mkv/avi/mov), audio, or subtitle (srt/vtt/ass) file.",
      });
      return false;
    }
    return true;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!validate(file)) return;
    onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="Drop a video or subtitle file, or click to choose"
      className={cn(
        "group mx-auto flex min-h-[300px] w-full max-w-md cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-border hover:border-emerald-400 hover:bg-muted/50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full border transition-colors",
          dragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-border bg-muted text-muted-foreground group-hover:text-emerald-600",
        )}
      >
        <UploadCloud className="size-6" />
      </div>

      <p className="text-base font-semibold tracking-tight">
        Drop a video or subtitle
      </p>
      <p className="max-w-[34ch] text-sm text-muted-foreground">
        Extract, create, and fix subtitles — privately in your browser.
      </p>
      <p className="text-xs text-muted-foreground/70">or click to browse</p>

      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-500" />
        No uploads · No sign-up · 100% free
      </span>
    </div>
  );
}
