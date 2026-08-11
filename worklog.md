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

---
Task ID: 11-13
Agent: Z.ai Code (main)
Task: Redesign header to match reference, fix transcription robustness, push to GitHub for Vercel.

Work Log:
- Analyzed reference image (ShrinkRay-style header) with VLM: top-right = Donate pill (heart icon, rose) + Settings gear that opens a DROPDOWN (not dialog).
- Rewrote src/components/header.tsx: Donate pill button (rose outline, heart-fill icon) + SettingsMenu.
- New src/components/settings-menu.tsx: DropdownMenu with Appearance (Light/Dark/System with emerald active dot), Legal section (Privacy Policy w/ Shield icon, Terms of Service w/ FileText icon), GitHub link.
- Removed old settings-dialog.tsx.
- New /legal/privacy and /legal/terms pages + shared legal-layout.tsx (back-to-app header, prose-styled content).
- Fixed transcription (src/lib/transcribe.ts): new TranscriptionUpdate callback API, tracks noSpeechCount, warns "no speech detected" after 4 silent cycles, media element explicitly unmuted+volume=1 so mic can hear it, auto-restart with 250ms delay (no tight loops), clear final error when 0 entries, handles audio-capture/network errors.
- Updated create-mode.tsx: amber notice explaining "audio plays out loud, mic listens, allow mic, turn up volume, stay online"; shows rose error for empty transcription; uses onUpdate callback.
- .gitignore: added db/, upload/, tests/, download/, worklog.md, agent-ctx/.
- Set git author → Jeffrey Hamilton <JeffreyHamilton6399@users.noreply.github.com>.
- Created GitHub repo via API (token): github.com/JeffreyHamilton6399/subtitlelab (public, default branch main).
- Committed (244aaa7) and pushed main → GitHub successfully. Remote origin set (clean URL, no token stored).
- Agent Browser verification: header shows exactly Donate + Settings; dropdown contains Light/Dark/System + Privacy Policy + Terms of Service + GitHub; /legal/privacy and /legal/terms render with all sections; no console/runtime errors; lint clean.

Stage Summary:
- Header now matches reference design (Donate + gear dropdown with theme/Legal/GitHub).
- Transcription now gives clear feedback when no speech is detected instead of silently producing nothing.
- Code pushed to GitHub: https://github.com/JeffreyHamilton6399/subtitlelab — ready to import into Vercel (no env vars needed).

---
Task ID: 14-15
Agent: Z.ai Code (main)
Task: Fix "No speech was transcribed" — Web Speech API silently fails in sandboxed preview.

Work Log:
- Root cause: Web Speech API listens to the MIC (not file audio). In the preview iframe, mic is blocked / unavailable, so recognition ran and produced zero entries with no clear feedback.
- transcribe.ts: added checkMicrophonePermission() via getUserMedia — pre-checks mic BEFORE playing media, fails fast with a clear message. Added isInsideIframe() to detect embedded preview and tailor the message. transcribe() now calls the pre-check first; if denied/unavailable, returns immediately with "Switch to Manual mode" guidance.
- New src/components/manual-caption-mode.tsx: reliable caption creation WITHOUT a mic. Renders a visible native <audio>/<video> player + Play/Pause + "Add subtitle at playhead" button. Clicking it inserts an entry at currentTime (+2.5s default end), pauses for typing. Reuses the shared SubtitleList for inline editing.
- Rewrote create-mode.tsx: Auto/Manual ToggleGroup at top; shared `entries` state so switching modes preserves work. Every auto-mode error/empty-state now includes a "Switch to Manual mode →" link. Kept language selector + progress + interim text for auto mode.
- Agent Browser verification (with a generated 3s test mp3):
  - Upload audio → Create tab auto-selected, Auto/Manual toggle visible.
  - Manual mode: native audio player renders, Play works, "Add subtitle at playhead" inserts entry at 1.955s→4.455s with empty text field, typing + Download SRT works, no errors.
  - Auto mode: clicking Transcribe Audio triggers mic pre-check → immediate "No microphone is available... Switch to Manual mode" message (instead of silent 60s failure). The Manual-mode link is clickable.
  - Single-screen layout holds in Manual mode (docH=vh=577, not scrollable). No console/runtime errors. Lint clean.
- Committed (0a295f7) and pushed to GitHub main.

Stage Summary:
- Create mode is now reliably usable in ANY environment: Manual mode needs no mic/internet and always works; Auto mode fails fast with actionable guidance when the mic is blocked.
- Pushed: https://github.com/JeffreyHamilton6399/subtitlelab/commit/0a295f7
