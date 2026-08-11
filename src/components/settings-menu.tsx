"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Github,
  Moon,
  Shield,
  Sun,
  FileText,
  Settings2,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const GITHUB_URL = "https://github.com/JeffreyHamilton6399/subtitlelab";

export function SettingsMenu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const isLight = mounted && theme === "light";
  const isSystem = mounted && theme === "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-7 rounded-full border-border"
          aria-label="Settings"
        >
          <Settings2 className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          <span className="flex-1">Light mode</span>
          {isLight && <span className="size-1.5 rounded-full bg-emerald-500" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          <span className="flex-1">Dark mode</span>
          {isDark && <span className="size-1.5 rounded-full bg-emerald-500" />
          }
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" />
          <span className="flex-1">System</span>
          {isSystem && <span className="size-1.5 rounded-full bg-emerald-500" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Legal
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/legal/privacy">
            <Shield className="size-4" />
            Privacy Policy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal/terms">
            <FileText className="size-4" />
            Terms of Service
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Github className="size-4" />
            GitHub
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
