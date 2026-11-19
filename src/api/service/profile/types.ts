import type { Lang } from "@/i18n";
export interface Profile { id: string; language: Lang; pu_code: string | null; consented_at: string | null; created_at: string }
export type ProfilePatch = Partial<Pick<Profile, "language" | "pu_code" | "consented_at">>;
