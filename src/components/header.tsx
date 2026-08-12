"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SettingsMenu } from "@/components/settings-menu";
import { FeedbackButton } from "@/components/feedback-button";

const DONATE_URL = "https://buymeacoffee.com/jeffreyscof";

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

      <div className="flex items-center gap-1.5">
        <FeedbackButton />
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-7 gap-1.5 rounded-full border-rose-200 px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
        >
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
            <Heart className="size-3.5" />
            <span className="hidden sm:inline">Donate</span>
          </a>
        </Button>
        <SettingsMenu />
      </div>
    </header>
  );
}
