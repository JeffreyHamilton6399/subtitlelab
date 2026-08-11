# SubtitleLab

Extract, create, and fix subtitles — entirely in your browser.

SubtitleLab is a 100% client-side subtitle toolkit. Drop a video or subtitle
file, pick an action, and download the result. **No uploads, no sign-up, no
server. Your files never leave your device.**

## Features

Three modes, all running locally:

1. **Extract** — pull embedded subtitle tracks out of a video file
   (`mp4`, `mkv`, `avi`, `mov`, `webm`) using `ffmpeg.wasm`, and download them
   as `.srt` or `.vtt`.
2. **Edit & Fix** — drop an `.srt`, `.vtt`, or `.ass` file and:
   - Shift timing (sync fix) by ±X seconds
   - Search & replace across all entries
   - Merge consecutive / split overly long entries
   - Repair mojibake / encoding issues
   - Convert between common frame rates (23.976 / 24 / 25 / 29.97 / 30)
   - Edit text and timestamps inline, then download
3. **Create** — transcribe an audio/video file into timed `.srt` / `.vtt`
   subtitles using the browser's Web Speech API.

## Privacy (the core value)

- 100% client-side. Videos, audio, and subtitle files never leave the browser.
- `ffmpeg.wasm` runs in the browser; the core is fetched once from a CDN and
  cached.
- Web Speech API transcription runs locally; the audio is played through a
  hidden media element so the speech engine can hear it.
- No analytics, no tracking.
- `localStorage` is used only for the theme and the privacy acknowledgment.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui (New York style)
- [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) for video
  subtitle extraction (lazy-loaded, single-threaded core)
- Web Speech API for audio-to-text transcription
- Pure JavaScript for SRT / VTT / ASS parsing & editing — no dependencies

## Local development

```bash
bun install
bun run dev
```

The app runs on `http://localhost:3000`.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. No environment variables are required.
4. Deploy. Done.

> Author: **Jeffrey Hamilton** · [GitHub](https://github.com/JeffreyHamilton6399) ·
> Donate: [Buy me a coffee](https://buymeacoffee.com/jeffreyscof)
