"use client";
import { createClient } from "@supabase/supabase-js";

// These two values come from your Supabase project (Settings → API),
// set as environment variables in Vercel (or .env.local for local dev).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Helpful error if the env vars are missing.
  console.warn("Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url || "", anon || "");
