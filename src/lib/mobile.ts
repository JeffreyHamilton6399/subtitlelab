// Mobile / low-memory device detection (client-side).

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 768)
  );
}

export function isLowMemoryDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (mem) return mem <= 4;
  return isMobile();
}

/** File-size limit for ffmpeg.wasm extraction. */
export function getExtractionSizeLimit(): number {
  return isMobile() ? 100 * 1024 * 1024 : 500 * 1024 * 1024;
}

/** File-size limit for Web Speech transcription. */
export function getTranscriptionSizeLimit(): number {
  return isMobile() ? 50 * 1024 * 1024 : 250 * 1024 * 1024;
}

/** Friendly message describing the current device's limit. */
export function describeLimits(): string {
  const ext = getExtractionSizeLimit();
  const trx = getTranscriptionSizeLimit();
  const fmt = (b: number) => (b >= 1024 * 1024 * 1024 ? `${b / 1024 / 1024 / 1024}GB` : `${b / 1024 / 1024}MB`);
  return `Mobile limits · extract ${fmt(ext)} · transcribe ${fmt(trx)}`;
}
