import { HttpError } from "./cors.ts";

const BASE = "https://api.groq.com/openai/v1";
const key = () => Deno.env.get("GROQ_API_KEY") ?? "";
export const translateModel = () => Deno.env.get("GROQ_TRANSLATE_MODEL") ?? "openai/gpt-oss-120b";
export const sttModel = () => Deno.env.get("GROQ_STT_MODEL") ?? "whisper-large-v3-turbo";

export const LANG_NAMES: Record<string, string> = {
  ha: "Hausa", yo: "Yoruba", ig: "Igbo", pcm: "Nigerian Pidgin (English-based creole)",
};

/** Ask the model for strict JSON. Returns the parsed object. */
export async function chatJson(system: string, user: string): Promise<Record<string, unknown>> {
  if (!key()) throw new HttpError(503, "translation not configured");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: translateModel(), temperature: 0.2, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new HttpError(502, `ai provider ${res.status}`);
  const data = await res.json();
  try { return JSON.parse(data.choices[0].message.content); } catch { throw new HttpError(502, "bad ai response"); }
}

export const TRANSLATE_SYSTEM =
  "You translate short Nigerian election fact-check headlines and summaries for ordinary voters. " +
  "Keep names, party acronyms, numbers and place names unchanged. Plain, simple wording. Never add facts. " +
  "Reply with JSON only.";

export async function transcribe(file: File, lang?: string): Promise<string> {
  if (!key()) throw new HttpError(503, "speech-to-text not configured");
  const fd = new FormData();
  fd.append("file", file, file.name || "audio.webm");
  fd.append("model", sttModel());
  fd.append("response_format", "json");
  fd.append("temperature", "0");
  // Whisper supports ha and yo; for others let it auto-detect.
  if (lang && ["en", "ha", "yo"].includes(lang)) fd.append("language", lang);
  const res = await fetch(`${BASE}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: fd });
  if (!res.ok) throw new HttpError(502, `ai provider ${res.status}`);
  const data = await res.json();
  return String(data.text ?? "").trim();
}
