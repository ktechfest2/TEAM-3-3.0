"use client";
import { useState } from "react";
import { useCreateRequest } from "@/api/service/help/queries";
import { HELP_CATEGORIES, type HelpCategory, type HelpKind } from "@/api/service/help/types";
import type { PollingUnit } from "@/api/service/polling-units/types";
import { Banner } from "@/components/ui/Banner";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useT } from "@/hooks/useT";
import { useDictation } from "@/hooks/useVoice";
import { errMessage } from "@/lib/utils";
import { toast } from "@/stores/toast";

const MIN = 5, MAX = 400;

export function NewRequestSheet({ open, onClose, unit }: { open: boolean; onClose: () => void; unit: PollingUnit }) {
  const { t } = useT();
  const create = useCreateRequest();
  const [kind, setKind] = useState<HelpKind>("need");
  const [category, setCategory] = useState<HelpCategory>("elderly");
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState("");
  const mic = useDictation((text) => setBody((p) => (p ? `${p} ${text}` : text).slice(0, MAX)));

  const valid = body.trim().length >= MIN && (category !== "custom" || custom.trim().length > 0);

  const submit = () => {
    create.mutate(
      { kind, category, customLabel: custom, body, stateCode: unit.state_code, wardKey: unit.ward_key, puCode: unit.code },
      { onSuccess: () => { setBody(""); setCustom(""); onClose(); toast.success(t("common.done")); }, onError: (e) => toast.error(errMessage(e, t("common.error"))) },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("help.new")}>
      <div className="stack stack-4" style={{ paddingBottom: 8 }}>
        <Segmented<HelpKind> label={t("help.kind")} value={kind} onChange={setKind} options={[{ value: "need", label: t("help.need") }, { value: "offer", label: t("help.offer") }]} />
        <div className="stack stack-2">
          <span className="label">{t("help.category")}</span>
          <div className="row-wrap">
            {HELP_CATEGORIES.map((c) => <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{t(`help.cat.${c}`)}</button>)}
          </div>
        </div>
        {category === "custom" && (
          <div className="field"><label htmlFor="custom">{t("help.customLabel")}</label><input id="custom" className="input" maxLength={40} value={custom} onChange={(e) => setCustom(e.target.value)} /></div>
        )}
        <div className="field">
          <label htmlFor="body">{t("help.body")}</label>
          <textarea id="body" className="textarea" maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="spread">
            <span className="caption num">{body.trim().length}/{MAX}</span>
            <IconButton label={mic.state === "recording" ? t("voice.stop") : t("voice.dictate")} className={mic.state === "recording" ? "mic--rec" : ""} onClick={() => void mic.toggle()} disabled={mic.state === "transcribing"}>
              {mic.state === "transcribing" ? <span className="spinner" /> : <Icon name="mic" size={20} />}
            </IconButton>
          </div>
        </div>
        <Banner icon="shield" quiet>{t("help.safety")}</Banner>
        <Button variant="primary" block disabled={!valid} loading={create.isPending} onClick={submit}>{t("help.post")}</Button>
      </div>
    </Sheet>
  );
}
