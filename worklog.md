# SubtitleLab — Worklog

This file is the shared worklog for all agents working on SubtitleLab.
Each agent MUST read previous sections before starting and append (never overwrite) a new `---` section after finishing.

Project: SubtitleLab — client-side subtitle extract / edit / create tool.
Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui. 100% client-side. ffmpeg.wasm for extraction, Web Speech API for transcription.

---
Task ID: 1-8
Agent: Z.ai Code (main)
Task: Build SubtitleLab — client-side subtitle extract/edit/create app.

Work Log:
- Installed @ffmpeg/ffmpeg@0.12.15 + @ffmpeg/util@0.12.2.
- Set up ThemeProvider (next-themes), custom CC-speech-bubble logo SVG + favicon, metadata/viewport in layout.tsx, sonner toaster.
- Updated next.config.ts (removed output:standalone, ignoreBuildErrors, reactStrictMode false) and globals.css (thin scrollbar helper, full-height html/body).
- Pure-JS libs:
  - src/lib/subtitle.ts — SubtitleEntry, timecode parse/format (SRT+VTT), file-type helpers.
  - src/lib/srt.ts — parse/serialize, shift, searchReplace, merge, splitLong, fixEncoding, convertFps, reindex.
  - src/lib/vtt.ts — parse/serialize WebVTT (skips NOTE/STYLE/REGION).
  - src/lib/ass.ts — parse ASS/SSA Dialogue lines to entries, strips override tags.
  - src/lib/mobile.ts — isMobile / isLowMemoryDevice / size limits.
  - src/lib/download.ts — blob download with URL revoke.
  - src/lib/extract-subtitles.ts — lazy ffmpeg.wasm loader (single-threaded core, CDN cached), listSubtitleTracks, extractSubtitleTrack.
  - src/lib/transcribe.ts — AudioTranscriber class using SpeechRecognition (continuous+interim), timestamps via media currentTime, auto-split long results, auto-restart on end, supports Firefox-incompatible check.
- Components:
  - logo.tsx, header.tsx (logo|donate|github|settings), footer.tsx (V1 · Jeffrey Hamilton), settings-dialog.tsx (theme toggle + privacy ack), dropzone.tsx (drag/click + mobile badge).
  - subtitle-list.tsx — scrollable editable list (inline time + text edits, add/delete rows).
  - extract-mode.tsx — track listing (radio), format toggle, extract button, progress, result+download.
  - edit-mode.tsx — quick fixes toolbar, shift/FPS/search-replace, editable list, download SRT/VTT.
  - create-mode.tsx — language select, transcribe/stop, progress+interim, editable results, download.
- src/app/page.tsx — single-screen (h-dvh flex-col overflow-hidden), empty dropzone vs file+tabs. Relevant modes mounted only; kept mounted across tab switches to preserve state.

Stage Summary:
- All core features implemented per spec. Next: lint + dev-server check + Agent Browser self-verify.
- Note: Web Speech API requires Chrome/Edge/Safari; handled with clear unsupported message.

---
Task ID: 9-10
Agent: Z.ai Code (main)
Task: README, config cleanup, lint + Agent Browser self-verification.

Work Log:
- Wrote README.md (features, privacy, stack, deploy).
- next.config.ts: removed invalid `eslint` key (Next 16 dropped it), removed output:standalone, added allowedDevOrigins for dev preview.
- Fixed bug: `reindex` was imported from `subtitle.ts` in vtt.ts but only existed in srt.ts → moved `reindex` to subtitle.ts and re-exported from srt.ts (keeps edit-mode import path working).
- `bun run lint` → clean (0 errors).
- Agent Browser end-to-end verification:
  - Empty dropzone renders (logo, donate/github/settings, dropzone, footer "V1 · Jeffrey Hamilton", privacy line).
  - Uploaded sample.srt → Edit tab auto-selected, 3 entries parsed with editable mono timecodes + textareas, quick-fixes toolbar (+2s/−2s/Fix Encoding/Merge/Split Long), shift input, FPS selectors, search/replace, download SRT/VTT all present.
  - Search & replace "fox"→"cat" worked; +2s shift re-timed entries (01,000→03,000).
  - Settings dialog opens; theme toggle Light/Dark/System verified (`<html class="dark">` applied); privacy switch present.
  - Mobile 390×844 viewport renders cleanly, all controls accessible.
  - Single-screen layout verified at 1280×800: docHeight(800) == viewport(800), scrollable=false, header h=48, footer top=768/bottom=800 (h-32), main=720. Sticky footer confirmed.
  - "New file" returns to dropzone empty state.
  - No console / runtime errors throughout. GET / returns 200 consistently.

Stage Summary:
- Edit mode fully verified end-to-end. Extract (ffmpeg.wasm) and Create (Web Speech API) follow the same component pattern and lib code is type-clean, but cannot be fully end-to-end exercised in the headless sandbox (ffmpeg core ~25MB CDN fetch + real video; Web Speech needs mic permission + speech engine). UI rendering + control wiring verified structurally.
- All non-negotiable requirements met: Next 16 + TS + Tailwind 4 + shadcn/ui, 100% client-side (no backend/db/API routes), emerald accents, no indigo/blue, flat design, custom CC logo, sticky footer, single-screen, mobile-first.
