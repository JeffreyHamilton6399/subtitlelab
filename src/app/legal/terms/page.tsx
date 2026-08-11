import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service — SubtitleLab",
  description: "Terms of Service for SubtitleLab.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p className="text-sm text-muted-foreground">Last updated: August 2026</p>

      <section>
        <h2>Acceptance of terms</h2>
        <p>
          By using SubtitleLab (&ldquo;the service&rdquo;), you agree to these
          terms. If you do not agree, please do not use the service.
        </p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          SubtitleLab is a free, open-source, client-side web application that
          lets you extract, create, and edit subtitle files entirely in your
          browser. The service is provided &ldquo;as is&rdquo; without charge.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You retain all rights to the files you process with SubtitleLab.
          Because the service runs entirely in your browser, your files are
          never transmitted to or stored on any server controlled by the
          author. You are responsible for ensuring you have the legal right to
          process the files you use with the service (for example, subtitle
          tracks from videos you own or are authorised to use).
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to use the service to:</p>
        <ul>
          <li>Process content you do not have the right to process;</li>
          <li>
            Violate any applicable law, regulation, or third-party rights; or
          </li>
          <li>Infringe the intellectual property of others.</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind — express or
          implied — including merchantability or fitness for a particular
          purpose. The author does not guarantee that the service will be
          error-free, uninterrupted, or produce accurate results.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the author of SubtitleLab
          shall not be liable for any indirect, incidental, special, or
          consequential damages arising out of your use of the service.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          The author may update these terms from time to time. Continued use
          of the service after changes constitutes acceptance of the revised
          terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Open an issue on{" "}
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
