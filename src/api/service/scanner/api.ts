import { dbError, getSupabase } from "@/lib/supabase/client";
import { getDb, type VaultItem } from "@/db/dexie";
import type { ConsensusRow, HashMatch, LedgerEntry, MySheet } from "./types";

const extFor = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");

export interface SealResult { serverId: string; chainHash: string; createdAt: string }

/** Upload the photo, then insert the ledger row. Safe to retry: duplicates resolve to the existing row. */
export async function sealSheet(item: VaultItem, userId: string): Promise<SealResult> {
  const sb = getSupabase();
  const path = `${userId}/${item.sha256}.${extFor(item.mime)}`;

  const up = await sb.storage.from("result-sheets").upload(path, item.blob, { contentType: item.mime, upsert: false });
  if (up.error && !/exist|duplicate/i.test(up.error.message)) throw dbError(up.error);

  const ins = await sb.from("result_sheets").insert({
    pu_code: item.puCode, sha256: item.sha256, captured_at: new Date(item.capturedAt).toISOString(),
    captured_lat: item.lat, captured_lng: item.lng, accuracy_m: item.accuracyM,
    storage_path: path, ocr_json: item.ocrJson ?? null, confirmed_json: item.confirmed ?? null,
  }).select("id,chain_hash,created_at").single();

  if (ins.error) {
    if (ins.error.code === "23505") {
      const ex = await sb.from("result_sheets").select("id,chain_hash,created_at").eq("sha256", item.sha256).limit(1).single();
      if (!ex.error) return { serverId: ex.data.id, chainHash: ex.data.chain_hash, createdAt: ex.data.created_at };
    }
    throw dbError(ins.error);
  }
  return { serverId: ins.data.id, chainHash: ins.data.chain_hash, createdAt: ins.data.created_at };
}

export async function listMySheets(): Promise<MySheet[]> {
  const { data, error } = await getSupabase().from("result_sheets")
    .select("id,pu_code,sha256,prev_hash,chain_hash,confirmed_json,captured_at,created_at,storage_path").order("created_at", { ascending: false }).limit(50);
  if (error) throw dbError(error);
  return (data ?? []).map((r) => ({ ...r, scores: r.confirmed_json })) as unknown as MySheet[];
}

export async function publicLedger(puCode: string): Promise<LedgerEntry[]> {
  const { data, error } = await getSupabase().from("public_result_ledger").select("*").eq("pu_code", puCode).order("created_at", { ascending: false }).limit(50);
  if (error) throw dbError(error);
  return (data ?? []) as LedgerEntry[];
}

export async function consensus(puCode: string): Promise<ConsensusRow[]> {
  const { data, error } = await getSupabase().rpc("pu_result_consensus", { p_pu_code: puCode });
  if (error) throw dbError(error);
  return (data ?? []) as ConsensusRow[];
}

export async function verifyHash(sha: string): Promise<HashMatch[]> {
  const { data, error } = await getSupabase().rpc("verify_sheet_hash", { p_sha256: sha });
  if (error) throw dbError(error);
  return (data ?? []) as HashMatch[];
}

/** null = chain intact; otherwise the id of the first broken entry. */
export async function verifyChain(puCode: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("verify_ledger_chain", { p_pu_code: puCode });
  if (error) throw dbError(error);
  return (data as string | null) ?? null;
}

// ---------- local vault + outbox (offline-first) ----------
export const getVaultItem = (id: string) => getDb().vault.get(id);

export async function queueSeal(item: VaultItem) {
  const db = getDb();
  await db.vault.put({ ...item, status: "queued", error: undefined });
  await db.outbox.put({ id: item.id, kind: "seal-sheet", vaultId: item.id, attempts: 0, nextAt: 0, createdAt: Date.now() });
}

let inflight: Promise<number> | null = null;
/**
 * Upload everything due in the outbox. Call on mount, on reconnect, and after queueing.
 * Calls are serialised: if a run is already in progress we wait for it, then run again so a
 * freshly queued item is never skipped.
 */
export async function processOutbox(userId: string | null): Promise<number> {
  if (!userId || (typeof navigator !== "undefined" && !navigator.onLine)) return 0;
  while (inflight) await inflight.catch(() => 0);
  inflight = runOutbox(userId).finally(() => { inflight = null; });
  return inflight;
}

async function runOutbox(userId: string): Promise<number> {
  let done = 0;
  const db = getDb();
  const due = await db.outbox.where("nextAt").belowOrEqual(Date.now()).toArray();
  for (const job of due) {
    const item = await db.vault.get(job.vaultId);
    if (!item) { await db.outbox.delete(job.id); continue; }
    try {
      const r = await sealSheet(item, userId);
      await db.vault.update(item.id, { status: "sealed", serverId: r.serverId, chainHash: r.chainHash, sealedAt: r.createdAt, error: undefined });
      await db.outbox.delete(job.id);
      done++;
    } catch (e) {
      const attempts = job.attempts + 1;
      const msg = e instanceof Error ? e.message : "upload failed";
      // Backoff 5s, 15s, 45s... capped at 10 min. After 8 tries mark as error but keep the photo.
      await db.outbox.update(job.id, { attempts, nextAt: Date.now() + Math.min(600_000, 5000 * 3 ** (attempts - 1)) });
      await db.vault.update(item.id, { status: attempts >= 8 ? "error" : "queued", error: msg });
    }
  }
  return done;
}
