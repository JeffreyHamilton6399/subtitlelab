export function Footer() {
  return (
    <footer className="mt-auto flex h-8 shrink-0 items-center justify-between border-t px-3 sm:px-4 text-[11px] text-muted-foreground">
      <span>
        V1 ·{" "}
        <a
          href="https://github.com/JeffreyHamilton6399"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/80 hover:text-foreground"
        >
          Jeffrey Hamilton
        </a>
      </span>
      <span className="hidden sm:inline">No uploads · No sign-up · 100% free</span>
      <span className="sm:hidden">100% local</span>
    </footer>
  );
}
