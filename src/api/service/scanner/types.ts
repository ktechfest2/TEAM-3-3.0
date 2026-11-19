export interface LedgerEntry { id: string; pu_code: string | null; sha256: string; prev_hash: string; chain_hash: string; scores: Record<string, unknown> | null; captured_at: string; created_at: string }
export interface MySheet extends LedgerEntry { storage_path: string }
export interface ConsensusRow { scores: Record<string, unknown>; submissions: number; first_seen: string }
export interface HashMatch { pu_code: string | null; created_at: string; chain_hash: string; prev_hash: string }
