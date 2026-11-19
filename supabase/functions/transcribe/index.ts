// Speech-to-text via Groq Whisper. Expects multipart: file (audio, <= 2 MB) and lang.
import { handler, json, HttpError } from "../_shared/cors.ts";
import { requireRealUser, enforceAiQuota } from "../_shared/auth.ts";
import { transcribe } from "../_shared/groq.ts";

const MAX_BYTES = 2 * 1024 * 1024;

Deno.serve(handler(async (req) => {
  const user = await requireRealUser(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "audio file required");
  if (file.size === 0 || file.size > MAX_BYTES) throw new HttpError(413, "audio must be under 2 MB");
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/webm")) throw new HttpError(415, "unsupported audio type");

  await enforceAiQuota(user.id, "transcribe", 20);
  const text = await transcribe(file, String(form?.get("lang") ?? ""));
  return json(req, { text: text.slice(0, 500) });
}));
