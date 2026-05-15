import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseAnon?: SupabaseClient;
  supabaseAdmin?: SupabaseClient;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

export function getSupabaseAnonClient() {
  if (globalForSupabase.supabaseAnon) {
    return globalForSupabase.supabaseAnon;
  }

  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");

  globalForSupabase.supabaseAnon = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return globalForSupabase.supabaseAnon;
}

export function getSupabaseAdminClient() {
  if (globalForSupabase.supabaseAdmin) {
    return globalForSupabase.supabaseAdmin;
  }

  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  globalForSupabase.supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return globalForSupabase.supabaseAdmin;
}
