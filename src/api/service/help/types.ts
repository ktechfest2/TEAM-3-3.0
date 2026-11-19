export type HelpKind = "need" | "offer";
export type HelpCategory = "visual" | "hearing" | "mobility" | "elderly" | "low_vision" | "cognitive" | "custom";
export type HelpStatus = "open" | "matched" | "closed" | "hidden";

export const HELP_CATEGORIES: HelpCategory[] = ["visual", "low_vision", "hearing", "mobility", "elderly", "cognitive", "custom"];

export interface HelpRequest {
  id: string; author_id: string; kind: HelpKind; category: HelpCategory; custom_label: string | null;
  state_code: string; ward_key: string; pu_code: string | null; body: string; status: HelpStatus; created_at: string;
}
export interface NewHelpRequest { kind: HelpKind; category: HelpCategory; customLabel?: string; body: string; stateCode: string; wardKey: string; puCode: string | null }
export interface HelpThread { id: string; request_id: string; requester_id: string; helper_id: string; created_at: string }
export interface HelpMessage { id: string; thread_id: string; sender_id: string; body: string; created_at: string }
export interface ThreadWithRequest extends HelpThread { request: HelpRequest | null }
