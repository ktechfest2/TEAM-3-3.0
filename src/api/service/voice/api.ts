import { invokeFn } from "@/lib/supabase/functions";
import type { Lang } from "@/i18n";
import type { TranscribeResult } from "./types";

export async function transcribeAudio(blob: Blob, lang: Lang): Promise<string> {
  const fd = new FormData();
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  fd.append("file", new File([blob], `voice.${ext}`, { type: blob.type || "audio/webm" }));
  fd.append("lang", lang);
  const r = await invokeFn<TranscribeResult>("transcribe", fd);
  return r.text;
}
