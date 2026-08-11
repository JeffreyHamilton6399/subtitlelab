import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — SubtitleLab",
  description:
    "SubtitleLab privacy policy. 100% client-side — your files never leave your browser.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-muted-foreground">Last updated: August 2026</p>

      <section>
        <h2>The short version</h2>
        <p>
          SubtitleLab runs entirely in your browser. Your video, audio, and
          subtitle files <strong>never leave your device</strong>. There is no
          server, no database, and no account system.
        </p>
      </section>

      <section>
        <h2>What we never do</h2>
        <ul>
          <li>We never upload your files anywhere.</li>
          <li>We never store, log, or transmit the contents of your files.</li>
          <li>We do not use analytics, advertising, or third-party tracking.</li>
          <li>We do not set cookies for tracking purposes.</li>
        </ul>
      </section>

      <section>
        <h2>What happens in your browser</h2>
        <p>
          When you use SubtitleLab, all processing happens locally on your
          device using web technologies built into your browser:
        </p>
        <ul>
          <li>
            <strong>Subtitle extraction</strong> from video is powered by{" "}
            <code>ffmpeg.wasm</code>, which runs inside your browser&apos;s
            WebAssembly sandbox. The first time you extract a subtitle, the
            ffmpeg engine (~25&nbsp;MB) is fetched from a public CDN and cached
            by your browser. Your video file is processed locally and is never
            sent to that CDN or any other server.
          </li>
          <li>
            <strong>Audio transcription</strong> uses OpenAI&apos;s Whisper
            speech-to-text model, running locally in your browser via{" "}
            <code>transformers.js</code> and WebAssembly. The Whisper model
            (~150&nbsp;MB) is fetched once from the public HuggingFace CDN and
            cached by your browser. After that, transcription runs entirely
            on your device — no microphone is needed, no audio is sent to any
            server, and no internet connection is required after the first
            load.
          </li>
          <li>
            <strong>Subtitle parsing &amp; editing</strong> (SRT, VTT, ASS) is
            performed with pure JavaScript running locally.
          </li>
        </ul>
      </section>

      <section>
        <h2>Local storage</h2>
        <p>
          SubtitleLab stores your theme preference (light / dark / system) in
          your browser&apos;s <code>localStorage</code>. This data never leaves
          your device and can be cleared at any time from your browser
          settings.
        </p>
      </section>

      <section>
        <h2>Third-party resources</h2>
        <p>
          The only external resources SubtitleLab fetches are the{" "}
          <code>ffmpeg.wasm</code> core files (from <code>unpkg.com</code>)
          when you first extract subtitles, and the Whisper speech model files
          (from <code>huggingface.co</code>) when you first transcribe audio.
          Both are cached by your browser after the first load. The{" "}
          <em>Donate</em> link points to Buy&nbsp;Me&nbsp;a&nbsp;Coffee. No
          information about you or your files is shared with these services.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy? Open an issue on{" "}
          <a
            href="https://github.com/JeffreyHamilton6399/subtitlelab"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
