import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-fraunces",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InternshipMatch — Break into finance without the spreadsheet",
  description:
    "An AI recruiting agent that reads your resume, knows the top 200 finance firms, and tells you exactly where to apply.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-ink-primary font-sans antialiased">
        {children}
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
