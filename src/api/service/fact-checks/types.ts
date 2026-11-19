export interface FactCheck {
  id: string; source: string; source_name: string; title: string; url: string; summary: string | null;
  rating: string | null; published_at: string | null; tags: string[]; state_code: string | null;
}
export interface FactCheckView extends FactCheck { shownTitle: string; shownSummary: string | null; translated: boolean }
export interface FactCheckPage { items: FactCheckView[]; nextCursor: string | null }
