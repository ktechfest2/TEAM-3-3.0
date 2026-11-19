import { getSupabase } from "./client";

/** Invoke an Edge Function and surface its { error } message instead of a generic failure. */
export async function invokeFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke(name, { body: body as Record<string, unknown> | FormData });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) { const j = await ctx.json(); if (j?.error) msg = String(j.error); }
    } catch { /* keep generic message */ }
    throw new Error(msg);
  }
  return data as T;
}
