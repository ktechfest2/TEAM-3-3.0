# Votepaddie

**Be ready to vote. Check what you hear. Keep a verifiable record of your polling unit's result sheet.**

Hackathon prototype for *"Every Vote, Every Voice"* (theme: *Building trust in governance using technology*).
Weak link we chose: **voter readiness + result trust and accessibility for elderly/disabled voters** - from "my polling unit moved / how long is the line?" to
"is what I saw on the wall what was counted?". We also added features for accessibility for elderly/disabled voters, such as voice and text size for scrolling and interacting with the app.

> Votepaddie is an independent civic tool. It is **not affiliated with INEC**, and the demo polling units (`DM-…`) are fictional.

## What it does

| Tab | Feature |
|---|---|
| **Home** | Election countdown, on-device readiness checklist, "how voting works", live fact-check feed (Dubawa / FactCheck Hub / Africa Check / Google Fact Check) with Hausa / Yoruba / Igbo / Pidgin translation and read-aloud |
| **Unit** | Find your polling unit (search or browse wards, cached offline), live headcount, **unofficial** virtual line with a geofence + manual-confirm fallback, ward tips with upvotes and reports |
| **Scan** | Photograph the EC8A result sheet → on-device OCR guess → you confirm every number → deterministic arithmetic checks → SHA-256 fingerprint sealed into a **public, append-only hash-chain ledger** (works offline via an outbox) → ledger view, "what others read" agreement, chain verification, and "verify a photo someone sent me" |
| **Help** | Accessibility help board (need / offer) with in-app chat only - no money, no phone numbers |
| **Me** | Language, dark/light/system theme, high contrast, reduce motion, push alerts, account deletion, known limits, credits |

## Stack

Next.js 15 (App Router) · TypeScript · TanStack Query v5 · Zustand · Dexie (IndexedDB) · Serwist (PWA/service worker) · Lenis (desktop-only smooth scroll) ·
Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) · Resend (auth email) · Firebase Cloud Messaging · Cloudflare Turnstile · Groq (translation + speech-to-text) · Google Fact Check Tools API · Tesseract.js (on-device OCR).

## Folder map

```
src/
  app/                 routes: (app)/{page,unit,scan,help,me}, chat/[threadId], sign-in, offline, sw.ts, manifest.ts
  api/service/<name>/  api.ts (Supabase calls) · queries.ts (TanStack hooks) · types.ts   <- components only import queries/types
      auth profile config polling-units fact-checks queue tips scanner help push voice
  components/          ui/ layout/ auth/ home/ unit/ scan/ help/ me/
  lib/                 pure logic (hash, geo, sheet parsing + checks, queue) · image · ocr · voice · supabase client
  db/dexie.ts          offline vault, outbox, ward cache, checklist
  hooks/ stores/ providers/ i18n/ styles/
supabase/
  migrations/          0001_init.sql · 0002_seed_demo.sql · 0003_queue_position.sql
  functions/           send-auth-email · delete-account · ingest-factchecks · translate · transcribe · notify-queue · register-push · _shared
tests/                 vitest: sheet parsing/checks, geofence, queue position, hashing, webhook signature, email template, RSS parser
docs/                  problem-brief.md · system-sketch.md · demo-script.md
```

## Setup (do these once, then paste keys)

### 0. Prerequisites
Node 20+, a GitHub account, and the [Supabase CLI](https://supabase.com/docs/guides/cli). Accounts: Supabase, Vercel, Resend, Cloudflare, Firebase/Google Cloud, Groq.

### 1. Supabase project
1. Create a project (nearest region). Save the DB password.
2. **Authentication → Sign In / Providers**: **Anonymous sign-ins OFF**, **Email ON**, all other providers OFF. Set **Email OTP length = 6** and **expiry = 600**.
3. **SQL Editor**: run, in order, `supabase/migrations/0001_init.sql` (if the `pg_cron` line errors, enable *Integrations → Cron* and re-run), then `0002_seed_demo.sql`, then `0003_queue_position.sql`.
4. **Settings → API Keys**: copy the **publishable** key (`sb_publishable_…`) and keep the **secret** key private (Edge Functions read it automatically - never put it in the browser).

### 2. Resend (auth emails)
Sign up → add and verify your sending domain (SPF/DKIM DNS records) → create a *sending access* API key → decide `RESEND_FROM`, e.g. `Votepaddie <login@yourdomain.com>`.
(Resend's free tier is 100 emails/day. Without a verified domain you can only send to your own address.)

### 3. Cloudflare Turnstile
Dashboard → Turnstile → add a site with your Vercel domain **and** `localhost` → copy the **site key** (public) and **secret key**.
Put the secret in **Supabase → Authentication → Attack Protection → CAPTCHA → Turnstile**.

### 4. Firebase (push alerts)
1. Create a project → add a **Web app** → copy the 6 config values.
2. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** → the **VAPID public key**.
3. **Project settings → Service accounts → Generate new private key** (JSON). Base64 it: `base64 -w0 key.json` (macOS: `base64 -i key.json | tr -d '\n'`). That is `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. Make sure the **Firebase Cloud Messaging API (V1)** is enabled in Google Cloud for the same project.

### 5. Google Fact Check API
Google Cloud Console (same project) → enable **Fact Check Tools API** → create an API key restricted to it → `GOOGLE_FACTCHECK_API_KEY`.

### 6. Groq
[console.groq.com](https://console.groq.com) → create API key → `GROQ_API_KEY`.

### 7. Run the app
```bash
cp .env.example .env.local     # fill in the public values
npm install
npm run dev                    # http://localhost:3000
```
Production build (also what Vercel runs): `npm run build`. Add the same `NEXT_PUBLIC_*` variables in Vercel → Project → Settings → Environment Variables.

### Checks
```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest (pure logic + edge-function helpers)
npm run build
```

## Security notes
- Browser only ever holds the **publishable** key. All secrets live in Supabase Edge secrets.
- **Anonymous sign-ins are off**; database writes additionally require `is_real_user()`. Sign-in is email code only (no passwords), behind Turnstile, with Supabase's built-in rate limits; the email hook verifies the Standard Webhooks signature and rejects stale timestamps.
- Row-Level Security on every table. The ledger is append-only (update/delete blocked by trigger and revoked privileges); deleting an account anonymises, not erases, ledger rows (their hashes never depended on identity).
- Strict CSP and security headers in `next.config.mjs`. API traffic is never cached by the service worker.
- Edge Functions use per-user hourly quotas for the free Groq tier and constant-time secret comparison.

## Known limits (also shown in-app)
GPS geofence is a soft check · the hash proves integrity and time, **not authenticity** · OCR of photographed sheets is unreliable, so humans confirm every number · machine translations and voices need native-speaker review (Hausa/Yoruba/Igbo/Pidgin UI strings are drafts) · the virtual line is **unofficial** · fact-check RSS URLs should be verified before launch (override with `FACTCHECK_FEEDS`) · Resend free = 100 emails/day · Groq and Supabase free tiers throttle, and free Supabase projects pause when idle - **warm everything up before judging** · iOS push only works after "Add to Home Screen".

## AI-assistant use & credits
**AI assistance:** this codebase was written with Claudechat (Anthropic) as a coding assistant, directed and reviewed by me.
**AI inside the product:** Groq-hosted models for translation and speech-to-text; on-device Tesseract.js for OCR. Result-sheet checks are plain arithmetic, not AI.
**Open source:** Next.js, React, TanStack Query, Zustand, Dexie, Serwist, Lenis, Tesseract.js, Firebase JS SDK, supabase-js.
**Services/APIs:** Supabase, Resend, Firebase Cloud Messaging, Cloudflare Turnstile, Groq, Google Fact Check Tools API.
**Fact-check sources:** Dubawa, FactCheck Hub, Africa Check (headlines/summaries link back to the original).
**Data:** demo polling units are fictional. Replace with real INEC data before any real-world use.
