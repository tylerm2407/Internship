import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

// next/font/google downloads fonts from Google at build/dev time, which
// breaks in offline or http/2-restricted environments. System font stacks
// are used instead and exposed as the same CSS variables the app uses. To
// switch to Inter/Fraunces/IBM Plex Mono later, add them via next/font/local
// with woff2 files in public/fonts/.
const SYSTEM_FONT_STACK = {
  "--font-inter":
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "--font-fraunces":
    "'Fraunces', Georgia, 'Times New Roman', Cambria, serif",
  "--font-plex-mono":
    "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as React.CSSProperties;

export const metadata: Metadata = {
  title: "InternshipMatch — Bryant University finance recruiting",
  description:
    "Built for Bryant University students. An AI recruiting agent that reads your resume, knows 200+ top finance firms, and tells you exactly where to apply.",
  icons: {
    icon: [
      { url: "/brand/bryant-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/bryant-favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/bryant-apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" style={SYSTEM_FONT_STACK}>
      <body className="min-h-full bg-bg text-ink-primary font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-accent focus:text-white focus:rounded-md"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <div id="main">{children}</div>
        </ErrorBoundary>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              border: "1px solid var(--surface-border)",
            },
          }}
        />
      </body>
    </html>
  );
}
