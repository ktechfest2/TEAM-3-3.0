import withSerwistInit from "@serwist/next";
import { randomUUID } from "node:crypto";

const isDev = process.env.NODE_ENV !== "production";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
  cacheOnNavigation: true,
  reloadOnOnline: false,
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
});

// Content-Security-Policy. Tesseract.js (on-device OCR) loads its worker/core from jsDelivr and
// language data from projectnaptha, so those hosts are allowed. Turnstile needs Cloudflare.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval' " : ""}https://challenges.cloudflare.com https://cdn.jsdelivr.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://challenges.cloudflare.com" + (isDev ? " ws://localhost:* http://localhost:*" : ""),
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default withSerwist(nextConfig);
