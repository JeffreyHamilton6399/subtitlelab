"use client";

import * as React from "react";
import { Heart, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SettingsDialog } from "@/components/settings-dialog";

const DONATE_URL = "https://buymeacoffee.com/jeffreyscof";
const GITHUB_URL = "https://github.com/JeffreyHamilton6399/subtitlelab";

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Logo size={26} />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">SubtitleLab</span>
          <span className="hidden text-[10px] text-muted-foreground sm:block">
            Extract · Create · Fix — privately
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 rounded-full text-xs font-medium hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        >
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
            <Heart className="size-3.5 text-rose-500" />
            <span className="hidden sm:inline">Donate</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Github className="size-3.5" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </Button>
        <SettingsDialog />
      </div>
    </header>
  );
}
