"use client";
import { useState } from "react";
import type { MySheet } from "@/api/service/scanner/types";
import { Icon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";
import { useSheetPhoto } from "@/hooks/useSheetPhoto";
import { useT } from "@/hooks/useT";
import { shortHash } from "@/lib/utils";
import { ScoreSummary } from "./ScoreSummary";

export function MyScanCard({ sheet }: { sheet: MySheet }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { url, loading } = useSheetPhoto(sheet.storage_path, sheet.sha256);

  return (
    <>
      <article className="card stack stack-3" style={{ overflow: "hidden" }}>
        <div className="spread" style={{ alignItems: "center" }}>
          <span className="badge badge--burst num">{sheet.pu_code ?? "PU"}</span>
          <span className="caption">{new Date(sheet.created_at).toLocaleString()}</span>
        </div>

        {/* Photo Proof */}
        <div
          role="button"
          tabIndex={url ? 0 : -1}
          aria-label={t("scan.viewProof")}
          onClick={() => { if (url) setOpen(true); }}
          onKeyDown={(e) => { if (url && (e.key === "Enter" || e.key === " ")) setOpen(true); }}
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            background: "#060507",
            border: "1px solid var(--border)",
            cursor: url ? "pointer" : "default",
          }}
        >
          {loading ? (
            <div style={{ height: 160, display: "grid", placeItems: "center", color: "var(--text-3)" }}>
              <span className="caption">{t("scan.photoLoading")}</span>
            </div>
          ) : url ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={t("scan.proofTitle")}
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "contain",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  background: "rgba(0,0,0,0.72)",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Icon name="search" size={14} />
                <span>{t("scan.viewProof")}</span>
              </div>
            </div>
          ) : (
            <div style={{ height: 100, display: "grid", placeItems: "center", color: "var(--text-3)", gap: 6, padding: 16, textAlign: "center" }}>
              <Icon name="camera" size={24} />
              <span className="caption">{t("scan.photoUnavailable")}</span>
            </div>
          )}
        </div>

        <ScoreSummary scores={sheet.scores} />

        <div className="spread" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="stack stack-1">
            <span className="eyebrow" style={{ margin: 0 }}>SHA-256</span>
            <span className="mono" style={{ fontSize: 13 }}>{shortHash(sheet.sha256, 14)}</span>
          </div>
          {sheet.chain_hash && (
            <div className="stack stack-1">
              <span className="eyebrow" style={{ margin: 0 }}>{t("scan.chain")}</span>
              <span className="mono" style={{ fontSize: 13 }}>{shortHash(sheet.chain_hash, 14)}</span>
            </div>
          )}
        </div>
      </article>

      {/* Lightbox / Full view Sheet */}
      {open && url && (
        <Sheet open={open} onClose={() => setOpen(false)} title={t("scan.proofTitle")}>
          <div className="stack stack-3">
            <div style={{ background: "#000", borderRadius: "var(--r-md)", overflow: "hidden", display: "grid", placeItems: "center", padding: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={t("scan.proofTitle")}
                style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "var(--r-sm)" }}
              />
            </div>
            <div className="stack stack-2">
              <div className="spread">
                <span className="eyebrow">{sheet.pu_code}</span>
                <span className="caption">{new Date(sheet.created_at).toLocaleString()}</span>
              </div>
              <div className="stack stack-1">
                <span className="eyebrow">SHA-256</span>
                <span className="mono" style={{ wordBreak: "break-all", fontSize: 13 }}>{sheet.sha256}</span>
              </div>
              {sheet.chain_hash && (
                <div className="stack stack-1">
                  <span className="eyebrow">{t("scan.chain")}</span>
                  <span className="mono" style={{ wordBreak: "break-all", fontSize: 13 }}>{sheet.chain_hash}</span>
                </div>
              )}
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
              {t("scan.viewProof")}&nbsp;<Icon name="external" size={16} />
            </a>
          </div>
        </Sheet>
      )}
    </>
  );
}

