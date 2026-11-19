"use client";
import { useEffect, useState } from "react";
import { getDb } from "@/db/dexie";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Loads a result-sheet photo for display:
 * 1. Checks local Dexie vault first (instant, works offline).
 * 2. Falls back to generating a signed URL from Supabase storage (for private 'result-sheets' bucket).
 */
export function useSheetPhoto(storagePath: string | null | undefined, sha256: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let localObjUrl: string | null = null;

    async function fetchPhoto() {
      if (!sha256 && !storagePath) {
        setLoading(false);
        setError(true);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        // 1. Check local Dexie vault first (zero-network, offline-ready)
        if (sha256) {
          const local = await getDb().vault.where("sha256").equals(sha256).first();
          if (local?.blob) {
            localObjUrl = URL.createObjectURL(local.blob);
            if (active) {
              setUrl(localObjUrl);
              setLoading(false);
            }
            return;
          }
        }

        // 2. Fall back to Supabase storage signed URL
        if (storagePath) {
          const sb = getSupabase();
          const { data, error: sbErr } = await sb.storage
            .from("result-sheets")
            .createSignedUrl(storagePath, 3600);

          if (!sbErr && data?.signedUrl) {
            if (active) {
              setUrl(data.signedUrl);
              setLoading(false);
            }
            return;
          }
        }

        if (active) {
          setError(true);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void fetchPhoto();

    return () => {
      active = false;
      if (localObjUrl) {
        URL.revokeObjectURL(localObjUrl);
      }
    };
  }, [storagePath, sha256]);

  return { url, loading, error };
}

