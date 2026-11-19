export interface WardTip { id: string; ward_key: string; pu_code: string | null; author_id: string; body: string; verified: boolean; upvotes: number; created_at: string }
export interface PostTipInput { puCode: string; body: string; lat?: number | null; lng?: number | null }
