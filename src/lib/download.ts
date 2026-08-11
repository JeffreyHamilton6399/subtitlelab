// Download helpers (client-side, with object URL cleanup).
export function downloadTextFile(
  content: string,
  filename: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
