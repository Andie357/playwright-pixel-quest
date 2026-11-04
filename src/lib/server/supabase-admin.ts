import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class ConfigError extends Error {}

let adminClient: SupabaseClient | null = null;

/**
 * Supabase client authenticated with the service-role (secret) key.
 * Server-side only: this module imports `server-only`, so bundling it into
 * a Client Component fails the build.
 */
export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new ConfigError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).",
    );
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });

  return adminClient;
}
