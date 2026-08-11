import * as React from "react";
import { cn } from "@/lib/utils";

/** SubtitleLab flat logo mark — a speech bubble with subtitle lines (CC).
 * Consistent in both light and dark mode (like the GitHub/Slack logo):
 * dark rounded container, emerald speech bubble, white CC lines. */
export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" className="fill-zinc-900" />
      <path
        d="M14 16.5C14 14.0147 16.0147 12 18.5 12H45.5C47.9853 12 50 14.0147 50 16.5V36.5C50 38.9853 47.9853 41 45.5 41H30L21 49V41H18.5C16.0147 41 14 38.9853 14 36.5V16.5Z"
        className="fill-emerald-500"
      />
      <rect x="20" y="20" width="11" height="3.4" rx="1.7" className="fill-white" />
      <rect x="34" y="20" width="11" height="3.4" rx="1.7" className="fill-white" />
      <rect x="20" y="29.6" width="9" height="3.4" rx="1.7" className="fill-white" />
      <rect x="32" y="29.6" width="13" height="3.4" rx="1.7" className="fill-white" />
    </svg>
  );
}
