
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/Segmented";
import { useVoicePlayer } from "@/hooks/useVoice";
import { useT } from "@/hooks/useT";
import { getAvailableVoices } from "@/lib/voice";
import { usePrefs } from "@/stores/prefs";

export function VoiceSettingsCard() {
  const { t, lang } = useT();
  const { voiceRate, setVoiceRate, voiceURI, setVoiceURI } = usePrefs();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { isSpeaking, toggleSpeak } = useVoicePlayer();

  const sample = t("me.voiceSample");
  const testing = isSpeaking(sample);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const load = () => setVoices(getAvailableVoices(lang));

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, [lang]);

  return (
    <section className="card card--flush">
      <div className="list">
        <div
          className="setting"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: 10,
            minWidth: 0,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div className="spread" style={{ minWidth: 0 }}>
            <span className="eyebrow">{t("me.voice")}</span>

            <Button
              size="sm"
              variant={testing ? "primary" : "secondary"}
              icon={<Icon name="speaker" size={16} />}
              onClick={() => toggleSpeak(sample)}
            >
              {testing ? t("me.stopVoice") : t("me.testVoice")}
            </Button>
          </div>

          <div className="stack stack-2" style={{ minWidth: 0, width: "100%" }}>
            <div className="caption" style={{ fontWeight: 600 }}>
              {t("me.voiceSpeed")}
            </div>

            <Segmented<string>
              label={t("me.voiceSpeed")}
              value={String(voiceRate)}
              onChange={(v) => setVoiceRate(parseFloat(v))}
              options={[
                { value: "0.8", label: "0.8x" },
                { value: "1", label: "1.0x" },
                { value: "1.2", label: "1.2x" },
              ]}
            />
          </div>

          {voices.length > 0 && (
            <div
              className="stack stack-2"
              style={{ marginTop: 4, minWidth: 0, width: "100%" }}
            >
              <label
                htmlFor="voice-select"
                className="caption"
                style={{ fontWeight: 600 }}
              >
                {t("me.voiceChooser")}
              </label>

              <div className="voice-select-wrapper">
                <select
                  id="voice-select"
                  className="voice-select"
                  value={voiceURI ?? ""}
                  onChange={(e) => setVoiceURI(e.target.value || null)}
                >
                  <option value="">{t("me.voiceDefault")}</option>

                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name.length > 25
                        ? `${v.name.slice(0, 25)}... (${v.lang})`
                        : `${v.name} (${v.lang})`}
                    </option>
                  ))}
                </select>

                <span className="voice-select-icon">
                  <Icon name="chevronDown" size={16} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
