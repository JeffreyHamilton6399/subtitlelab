import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubtitleLab — Extract, create & fix subtitles in your browser",
  description:
    "Extract subtitles from video, create subtitles from audio, and edit & fix subtitle files — all privately in your browser. No uploads, no sign-up, 100% free.",
  keywords: [
    "subtitle",
    "subtitles",
    "srt",
    "vtt",
    "extract subtitles",
    "ffmpeg wasm",
    "transcribe audio",
    "subtitle editor",
    "sync subtitles",
  ],
  authors: [{ name: "Jeffrey Hamilton" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "SubtitleLab — Extract, create & fix subtitles in your browser",
    description:
      "Extract subtitles from video, create subtitles from audio, and edit & fix subtitle files — all privately in your browser. No uploads, no sign-up, 100% free.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SubtitleLab",
    description:
      "Extract, create & fix subtitles — privately in your browser. No uploads, no sign-up, 100% free.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
