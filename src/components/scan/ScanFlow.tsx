"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/api/service/auth/queries";
import { useSealSheet } from "@/api/service/scanner/queries";
import type { PollingUnit } from "@/api/service/polling-units/types";
import type { VaultItem } from "@/db/dexie";
import { PuPicker } from "@/components/unit/PuPicker";
import { Banner } from "@/components/ui/Banner";
import { Burst } from "@/components/ui/Burst";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";
import { getCurrentFix } from "@/lib/geo";
import { sha256Hex } from "@/lib/hash";
import { prepareForOcr, prepareForUpload } from "@/lib/image";
import { ocrImage } from "@/lib/ocr";
import { canonicalizeSheet, emptySheet, hasAnyNumbers, parseSheetText, type SheetNumbers } from "@/lib/sheet";
import { errMessage, shortHash } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { ChecksList } from "./ChecksList";
import { SheetForm } from "./SheetForm";

interface Photo { blob: Blob; mime: string; sha: string; url: string; capturedAt: number }
type Ocr = { state: "idle" } | { state: "running"; progress: number } | { state: "done"; found: number } | { state: "failed" };

export function ScanFlow() {
  const { t } = useT();
  const router = useRouter();
  const { user, isSignedIn } = useAuth();
  const mine = useMyUnit();
  const seal = useSealSheet(user?.id);

  const [chosen, setChosen] = useState<PollingUnit | null>(null);
  const [picking, setPicking] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [sheet, setSheet] = useState<SheetNumbers>(() => emptySheet());
  const [ocr, setOcr] = useState<Ocr>({ state: "idle" });
  const [ocrText, setOcrText] = useState("");
  const [attachLoc, setAttachLoc] = useState(true);
  const [sealed, setSealed] = useState<VaultItem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const unit = chosen ?? mine.unit;
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null; setPhoto(null); setSheet(emptySheet()); setOcr({ state: "idle" }); setOcrText(""); setSealed(null);
  };

  const onFile = async (file: File) => {
    try {
      const prepared = await prepareForUpload(file);
      const sha = await sha256Hex(prepared.blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(prepared.blob);
      urlRef.current = url;
      setPhoto({ ...prepared, sha, url, capturedAt: Date.now() });
      setSheet(emptySheet()); setSealed(null);

      // On-device OCR is a best-effort head start; the person always confirms the numbers.
      setOcr({ state: "running", progress: 0 });
      try {
        const small = await prepareForOcr(prepared.blob);
        const text = await ocrImage(small, (p) => setOcr({ state: "running", progress: p }));
        const { sheet: guess, found } = parseSheetText(text);
        setSheet(guess); setOcrText(text.slice(0, 4000)); setOcr({ state: "done", found });
      } catch { setOcr({ state: "failed" }); }
    } catch (e) { toast.error(errMessage(e, t("common.error"))); }
  };

  const doSeal = async () => {
    if (!isSignedIn) { router.push("/sign-in"); return; }
    if (!photo) return;
    if (!unit) { setPicking(true); return; }
    let lat: number | null = null, lng: number | null = null, acc: number | null = null;
    if (attachLoc) { try { const f = await getCurrentFix(5000); lat = f.lat; lng = f.lng; acc = f.accuracy; } catch { /* optional */ } }
    const item: VaultItem = {
      id: crypto.randomUUID(), sha256: photo.sha, blob: photo.blob, mime: photo.mime, puCode: unit.code, capturedAt: photo.capturedAt,
      lat, lng, accuracyM: acc, ocrJson: ocrText ? { text: ocrText } : null,
      confirmed: hasAnyNumbers(sheet) ? canonicalizeSheet(sheet) : null, status: "draft",
    };
    seal.mutate(item, { onSuccess: (r) => setSealed(r), onError: (e) => toast.error(errMessage(e, t("common.error"))) });
  };

  // ---------- Sealed ----------
  if (sealed) {
    const done = sealed.status === "sealed";
    return (
      <div className="card card--accent stack stack-4 center" style={{ alignItems: "center" }}>
        {done ? <Burst size={84} label={t("scan.sealed")} /> : <Icon name="inbox" size={40} />}
        <div className="stack stack-2">
          <h2 className="title-2">{done ? t("scan.sealed") : t("scan.queuedOffline")}</h2>
          {done && <p className="callout">{t("scan.sealedBody")}</p>}
        </div>
        <div className="stack stack-1" style={{ width: "100%" }}>
          <div className="eyebrow">SHA-256</div><div className="mono">{sealed.sha256}</div>
          {sealed.chainHash && <><div className="eyebrow" style={{ marginTop: 8 }}>{t("scan.chain")}</div><div className="mono">{shortHash(sealed.chainHash, 16)}</div></>}
        </div>
        <Button block onClick={reset}>{t("scan.capture")}</Button>
      </div>
    );
  }

  return (
    <div className="stack stack-4">
      <p className="callout">{t("scan.intro")}</p>

      <button className="card row" style={{ textAlign: "left" }} onClick={() => setPicking(true)}>
        <Icon name="pin" size={22} />
        <div className="grow">
          <div className="eyebrow">{t("scan.pickUnit")}</div>
          <div className="headline" style={{ fontSize: 16 }}>{unit ? unit.name : t("unit.choose")}</div>
          {unit && <div className="caption">{unit.ward_name} · {unit.code}</div>}
        </div>
        <Icon name="chevronRight" size={18} />
      </button>

      <input ref={input} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onFile(f); }} />

      {!photo ? (
        <button className="capture-zone" onClick={() => input.current?.click()}>
          <Icon name="camera" size={34} /><span className="headline">{t("scan.capture")}</span>
        </button>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={photo.url} alt="Result sheet" />
          <div className="spread">
            <span className="caption mono">{shortHash(photo.sha, 10)}</span>
            <Button size="sm" onClick={() => input.current?.click()}>{t("scan.retake")}</Button>
          </div>

          {ocr.state === "running" && (
            <div className="card stack stack-3" role="status">
              <div className="spread"><span className="callout">{t("scan.reading")}</span><span className="caption num">{Math.round(ocr.progress * 100)}%</span></div>
              <div className="progress"><i style={{ width: `${Math.max(6, ocr.progress * 100)}%` }} /></div>
              <Skeleton h={44} r={14} /><Skeleton h={44} r={14} />
            </div>
          )}
          {ocr.state === "failed" && <Banner icon="info" quiet>{t("scan.ocrFailed")}</Banner>}

          {ocr.state !== "running" && (
            <>
              <SheetForm sheet={sheet} onChange={setSheet} />
              <ChecksList sheet={sheet} />
              <label className="checkbox callout"><input type="checkbox" checked={attachLoc} onChange={(e) => setAttachLoc(e.target.checked)} /><span>{t("scan.attachLocation")}</span></label>
              <Banner icon="shield" quiet>{t("scan.limits")}</Banner>
              <Button variant="primary" block loading={seal.isPending} onClick={() => void doSeal()} icon={<Icon name="shield" size={20} />}>
                {seal.isPending ? t("scan.sealing") : isSignedIn ? t("scan.seal") : t("scan.signInToSeal")}
              </Button>
            </>
          )}
        </>
      )}

      <PuPicker open={picking} onClose={() => setPicking(false)} onSelect={(u) => setChosen(u)} />
    </div>
  );
}
