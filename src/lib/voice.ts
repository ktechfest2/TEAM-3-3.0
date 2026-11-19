import { LANGS, type Lang } from "@/i18n";

export type SpeakResult = "ok" | "no-voice" | "unsupported";

const speechTag = (lang: Lang) => LANGS.find((l) => l.code === lang)?.speech ?? "en-NG";

/** Device TTS. Many phones have no Hausa/Yoruba/Igbo voice: report it so the UI can fall back to text. */
export function speak(text: string, lang: Lang): SpeakResult {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return "unsupported";
  const tag = speechTag(lang);
  const base = tag.split("-")[0];
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(base));
  // Pidgin is read with an English voice; other languages need a matching voice.
  if (!voice && lang !== "en" && lang !== "pcm") return "no-voice";
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? tag;
  if (voice) u.voice = voice;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return "ok";
}
export const stopSpeaking = () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); };

export interface Recorder { stop: () => Promise<Blob> }

export const recordingSupported = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/** Records up to maxMs, then stops itself. Audio stays on the device until the user sends it. */
export async function startRecording(maxMs = 30_000): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
  });
  rec.start();
  const timer = setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, maxMs);
  return { stop: () => { clearTimeout(timer); if (rec.state !== "inactive") rec.stop(); return done; } };
}
