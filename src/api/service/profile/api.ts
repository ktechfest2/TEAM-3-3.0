import { dbError, getSupabase } from "@/lib/supabase/client";
import type { Profile, ProfilePatch } from "./types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw dbError(error);
  return data as Profile | null;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await getSupabase().from("profiles").update(patch).eq("id", userId).select("*").single();
  if (error) throw dbError(error);
  return data as Profile;
}
