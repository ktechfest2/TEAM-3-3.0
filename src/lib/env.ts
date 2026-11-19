// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them at build time.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  },
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
export const isPushConfigured = Boolean(env.firebase.apiKey && env.firebase.projectId && env.firebase.appId && env.vapidKey);
