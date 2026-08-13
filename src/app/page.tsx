"use client";

import * as React from "react";
import { Captions, FileText, Plus, Mic } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Dropzone } from "@/components/dropzone";
import { ExtractMode } from "@/components/extract-mode";
import { EditMode } from "@/components/edit-mode";
import { CreateMode } from "@/components/create-mode";
import {
  isAudioFile,
  isSubtitleFile,
  isVideoFile,
} from "@/lib/subtitle";
import { cn } from "@/lib/utils";

type Mode = "extract" | "edit" | "create";

interface ModeConfig {
  id: Mode;
  label: string;
  icon: React.ReactNode;
  available: boolean;
}

export default function Home() {
  const [file, setFile] = React.useState<File | null>(null);
  const [activeMode, setActiveMode] = React.useState<Mode>("extract");

  const isVid = file ? isVideoFile(file.name) : false;
  const isAud = file ? isAudioFile(file.name) : false;
  const isSub = file ? isSubtitleFile(file.name) : false;

  const modes: ModeConfig[] = [
    {
      id: "extract",
      label: "Extract",
      icon: <Captions className="size-3.5" />,
      available: isVid,
    },
    {
      id: "edit",
      label: "Edit",
      icon: <FileText className="size-3.5" />,
      available: isSub,
    },
    {
      id: "create",
      label: "Create",
      icon: <Mic className="size-3.5" />,
      available: isVid || isAud,
    },
  ];

  const availableModes = modes.filter((m) => m.available);

  function handleFile(f: File) {
    setFile(f);
    if (isVideoFile(f.name)) setActiveMode("extract");
    else if (isSubtitleFile(f.name)) setActiveMode("edit");
    else if (isAudioFile(f.name)) setActiveMode("create");
  }

  function handleRemove() {
    setFile(null);
    setActiveMode("extract");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
        {!file ? (
          <div className="flex flex-1 overflow-y-auto">
            <div className="m-auto w-full max-w-lg shrink-0">
              <Dropzone onFile={handleFile} />
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Extract and create subtitles without uploading your files.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mode tabs */}
            <div className="flex shrink-0 items-center justify-between gap-2">
              <div
                role="tablist"
                className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1"
              >
                {availableModes.map((m) => (
                  <button
                    key={m.id}
                    role="tab"
                    aria-selected={activeMode === m.id}
                    data-state={activeMode === m.id ? "active" : "inactive"}
                    onClick={() => setActiveMode(m.id)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                      activeMode === m.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRemove}
                className="inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Choose a different file"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New file</span>
              </button>
            </div>

            {/* Mode content (mount only available modes, keep mounted to preserve state) */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {isVid && (
                <div className={cn("h-full", activeMode !== "extract" && "hidden")}>
                  <ExtractMode file={file} onRemove={handleRemove} />
                </div>
              )}
              {isSub && (
                <div className={cn("h-full", activeMode !== "edit" && "hidden")}>
                  <EditMode file={file} onRemove={handleRemove} />
                </div>
              )}
              {(isVid || isAud) && (
                <div className={cn("h-full", activeMode !== "create" && "hidden")}>
                  <CreateMode file={file} onRemove={handleRemove} />
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
