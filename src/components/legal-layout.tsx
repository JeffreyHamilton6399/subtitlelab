import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/JeffreyHamilton6399/subtitlelab";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background/80 px-3 backdrop-blur sm:px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to SubtitleLab
        </Link>
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-sm font-semibold">SubtitleLab</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <article
          className={
            "prose-subtitle flex flex-col gap-6 text-sm leading-relaxed text-foreground/90 [&_a]:text-emerald-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-emerald-400 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          }
        >
          {children}
        </article>

        <div className="mt-12 flex items-center justify-between border-t pt-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-xs"
          >
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back to app
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-xs text-muted-foreground"
          >
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Github className="size-3.5" />
              GitHub
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}
