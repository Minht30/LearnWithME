import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, JetBrains_Mono, Comic_Neue } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeInit } from "@/components/ui/theme-init";
import { IdleParticles } from "@/components/ui/idle-particles";
import "./globals.css";

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dyslexia-friendly alternative — enabled by data-font="dyslexic" on <html>
const dyslexic = Comic_Neue({
  variable: "--font-dyslexic",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "LearnWithMe · Tests, built for teachers",
  description:
    "A K-12 Canadian curriculum test generator. Describe your test, hand out a PDF, and give your class a practice environment before exam day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${dyslexic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeInit />
        <IdleParticles />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
