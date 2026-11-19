import type { Session, User } from "@supabase/supabase-js";

export type AuthSession = Session;
export interface AuthStatus {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /** Signed in with a real (non-anonymous) account. Anonymous sessions are never accepted. */
  isSignedIn: boolean;
}
