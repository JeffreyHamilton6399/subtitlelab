"use client";

import * as React from "react";
import { Settings2, Moon, Sun, Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const TERMS_KEY = "subtitlelab:accepted-terms";

export function SettingsDialog() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [accepted, setAccepted] = React.useState(true);

  React.useEffect(() => {
    const v = localStorage.getItem(TERMS_KEY);
    setAccepted(v === null ? true : v === "1");
  }, []);

  function toggleTerms(checked: boolean) {
    setAccepted(checked);
    localStorage.setItem(TERMS_KEY, checked ? "1" : "0");
    toast.success(checked ? "Terms accepted" : "Terms preference saved");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Everything stays in your browser. No accounts, no tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Appearance
            </Label>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(v) => {
                if (v) setTheme(v);
              }}
              className="grid w-full grid-cols-3"
            >
              <ToggleGroupItem value="light" className="flex flex-col gap-1 py-2">
                <Sun className="size-4" />
                <span className="text-xs">Light</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="flex flex-col gap-1 py-2">
                <Moon className="size-4" />
                <span className="text-xs">Dark</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="flex flex-col gap-1 py-2">
                <Monitor className="size-4" />
                <span className="text-xs">System</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col gap-0.5 pr-3">
              <span className="text-sm font-medium">Privacy notice</span>
              <span className="text-xs text-muted-foreground">
                I understand files never leave my device.
              </span>
            </div>
            <Switch checked={accepted} onCheckedChange={toggleTerms} aria-label="Accept privacy terms" />
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            SubtitleLab runs entirely in your browser. ffmpeg.wasm and the Web
            Speech API do the work locally — nothing is uploaded.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
