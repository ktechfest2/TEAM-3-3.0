"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranscribe } from "@/api/service/voice/queries";
import { recordingSupported, speak, startRecording, stopSpeaking, type Recorder } from "@/lib/voice";
import { toast } from "@/stores/toast";
import { useT } from "./useT";
import { errMessage } from "@/lib/utils";

export type DictationState = "idle" | "recording" | "transcribing";

/** Push-to-dictate with graceful fallback to typing. */
export function useDictation(onText: (text: string) => void) {
  const { t, lang } = useT();
  const [state, setState] = useState<DictationState>("idle");
  const rec = useRef<Recorder | null>(null);
  const transcribe = useTranscribe();
  const supported = recordingSupported();

  const toggle = useCallback(async () => {
    if (state === "recording" && rec.current) {
      setState("transcribing");
      try {
        const blob = await rec.current.stop();
        rec.current = null;
        const text = await transcribe.mutateAsync({ blob, lang });
        if (text) onText(text);
      } catch (e) { toast.error(errMessage(e, t("voice.unsupported"))); }
      setState("idle");
      return;
    }
    if (state !== "idle") return;
    if (!supported) { toast.info(t("voice.unsupported")); return; }
    try { rec.current = await startRecording(); setState("recording"); }
    catch { toast.info(t("voice.unsupported")); }
  }, [state, supported, transcribe, lang, onText, t]);

  return { state, toggle, supported };
}

let currentSpeakingText: string | null = null;
const speakingListeners = new Set<(text: string | null) => void>();

function notifySpeaking(text: string | null) {
  currentSpeakingText = text;
  speakingListeners.forEach((fn) => fn(text));
}

export function useVoicePlayer() {
  const { t, lang } = useT();
  const [playing, setPlaying] = useState<string | null>(currentSpeakingText);

  useEffect(() => {
    speakingListeners.add(setPlaying);
    return () => {
      speakingListeners.delete(setPlaying);
    };
  }, []);

  const toggleSpeak = useCallback((text: string) => {
    if (currentSpeakingText === text) {
      stopSpeaking();
      notifySpeaking(null);
      return;
    }
    stopSpeaking();
    notifySpeaking(text);
    const r = speak(text, lang, () => {
      if (currentSpeakingText === text) {
        notifySpeaking(null);
      }
    });
    if (r !== "ok") {
      notifySpeaking(null);
      toast.info(r === "no-voice" ? t("voice.noVoice") : t("voice.unsupported"));
    }
  }, [lang, t]);

  const isSpeaking = useCallback((text: string) => playing === text, [playing]);

  return { isSpeaking, toggleSpeak };
}

export function useSpeak() {
  const { t, lang } = useT();
  return useCallback((text: string) => {
    const r = speak(text, lang);
    if (r !== "ok") toast.info(r === "no-voice" ? t("voice.noVoice") : t("voice.unsupported"));
  }, [lang, t]);
}
export { stopSpeaking };
