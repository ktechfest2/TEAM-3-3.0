export interface QueueState { pu_code: string; next_ticket: number; waiting_count: number; accredited_count: number; voted_count: number; updated_at: string }
export type QueueStatus = "waiting" | "accredited" | "voted" | "left";
export interface QueueEntry { id: string; pu_code: string; user_id: string; ticket: number; status: QueueStatus; location_verified: boolean; joined_at: string; updated_at: string }
export interface JoinInput { puCode: string; lat?: number | null; lng?: number | null; manual?: boolean }
