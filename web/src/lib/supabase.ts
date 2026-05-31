"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

// Single shared browser client. Null when env vars are missing so the app
// still runs (multiplayer just shows a "not configured" notice).
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
