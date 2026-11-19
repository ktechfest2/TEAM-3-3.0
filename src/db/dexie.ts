import Dexie, { type EntityTable } from "dexie";

export interface VaultItem {
  id: string;
  sha256: string;
  blob: Blob;
  mime: string;
  puCode: string | null;
  capturedAt: number;                       // device clock (untrusted)
  lat: number | null; lng: number | null; accuracyM: number | null;
  ocrJson: unknown;                         // raw OCR guess
  confirmed: Record<string, unknown> | null;
  status: "draft" | "queued" | "sealed" | "error";
  error?: string;
  serverId?: string; chainHash?: string; sealedAt?: string;
}

export interface OutboxItem { id: string; kind: "seal-sheet"; vaultId: string; attempts: number; nextAt: number; createdAt: number }
export interface WardCache { wardKey: string; units: unknown[]; cachedAt: number }
export interface ChecklistRow { id: string; done: boolean }

type VotepaddieDB = Dexie & {
  vault: EntityTable<VaultItem, "id">;
  outbox: EntityTable<OutboxItem, "id">;
  wardCache: EntityTable<WardCache, "wardKey">;
  checklist: EntityTable<ChecklistRow, "id">;
};

let db: VotepaddieDB | null = null;

/** Lazy, browser-only (IndexedDB does not exist during server rendering). */
export function getDb(): VotepaddieDB {
  if (!db) {
    const d = new Dexie("votepaddie") as VotepaddieDB;
    d.version(1).stores({
      vault: "id, sha256, status, capturedAt",
      outbox: "id, nextAt",
      wardCache: "wardKey",
      checklist: "id",
    });
    db = d;
  }
  return db;
}
