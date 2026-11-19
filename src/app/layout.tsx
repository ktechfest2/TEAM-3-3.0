import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/providers/Providers";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";

export const metadata: Metadata = {
  title: { default: "Votepaddie", template: "%s · Votepaddie" },
  description: "Be ready to vote. Check what you hear. Keep a verifiable record of your polling unit's result sheet.",
  applicationName: "Votepaddie",
  appleWebApp: { capable: true, title: "Votepaddie", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060507" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f5" },
  ],
  colorScheme: "dark light",
};

// Runs before first paint so there is no flash of the wrong theme. Reads the zustand "vp-prefs" key.
const THEME_BOOT = `try{var s=(JSON.parse(localStorage.getItem('vp-prefs')||'{}').state)||{};var t=s.theme||'dark';if(t==='system'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}var r=document.documentElement;r.dataset.theme=t;r.dataset.contrast=s.highContrast?'high':'normal';r.dataset.motion=s.reduceMotion?'reduce':'normal';}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
